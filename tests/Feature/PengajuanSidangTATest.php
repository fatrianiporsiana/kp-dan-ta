<?php

namespace Tests\Feature;

use App\Models\PendaftaranTA;
use App\Models\PengajuanSidangTA;
use App\Models\User;
use App\Support\LampiranSidangTA;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesKpFixtures;
use Tests\Concerns\CreatesTaFixtures;
use Tests\TestCase;

class PengajuanSidangTATest extends TestCase
{
    use RefreshDatabase;
    use CreatesKpFixtures;
    use CreatesTaFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        Storage::fake('local');
    }

    /* ---------- helper ---------- */

    /**
     * Mahasiswa dengan TA yang sudah disetujui dan punya pembimbing utama + co.
     *
     * @return array{0: User, 1: User, 2: User, 3: PendaftaranTA} mahasiswa, utama, co, ta
     */
    private function skenario(string $jalur = 'skripsi', string $konsentrasi = 'reg_a'): array
    {
        $mahasiswa = $this->makeUser('mahasiswa');
        $utama = $this->makeUser('dosen');
        $co = $this->makeUser('dosen');

        $ta = $this->makeTa($mahasiswa, $utama, $co, 'APPROVED', $konsentrasi);
        $ta->update(['jalur' => $jalur]);
        $this->tambahPembimbingTa($ta, $utama, $co);

        return [$mahasiswa, $utama, $co, $ta->fresh()];
    }

    private function buatSidang(
        PendaftaranTA $ta,
        string $status = 'DRAFT',
        bool $dikonfirmasiDosen = false,
        bool $berbayar = false
    ): PengajuanSidangTA {
        return $ta->pengajuanSidang()->create([
            'alamat' => $ta->alamat,
            'tempat_lahir' => $ta->tempat_lahir,
            'tanggal_lahir' => $ta->tanggal_lahir,
            'email_widyatama' => $ta->email_widyatama,
            'nomor_telepon' => $ta->nomor_telepon,
            'ipk' => $ta->ipk,
            'skor_toefl' => $ta->skor_toefl,
            'judul_ta' => $ta->judul_ta,
            'jurnal_berbayar' => $berbayar,
            'status' => $status,
            'dosen_confirmed_at' => $dikonfirmasiDosen ? now() : null,
            'submitted_at' => $status === 'DRAFT' ? null : now(),
        ]);
    }

    /** Membuat lampiran langsung di database + disk (tanpa HTTP). */
    private function lampiranLengkap(PengajuanSidangTA $sidang, ?array $hanya = null): void
    {
        $ta = $sidang->pendaftaranTA;
        $jenisList = $hanya ?? LampiranSidangTA::jenisUntuk(
            $ta->jalur,
            $ta->konsentrasi,
            (bool) $sidang->jurnal_berbayar
        );

        foreach ($jenisList as $jenis) {
            $path = "dokumen-kp/ta/sidang/{$sidang->id}/{$jenis}.pdf";
            Storage::disk('local')->put($path, 'isi');

            $sidang->dokumen()->create([
                'jenis' => $jenis,
                'nama_file' => "{$jenis}.pdf",
                'path' => $path,
                'ukuran' => 4,
                'mime_type' => 'application/pdf',
            ]);
        }
    }

    private function unggah(PengajuanSidangTA $sidang, string $jenis, ?UploadedFile $file = null)
    {
        $default = $jenis === 'pas_foto'
            ? UploadedFile::fake()->create('foto.jpg', 100, 'image/jpeg')
            : UploadedFile::fake()->create("{$jenis}.pdf", 100, 'application/pdf');

        return $this->post(
            "/api/ta/sidang/{$sidang->id}/dokumen",
            ['jenis' => $jenis, 'file' => $file ?? $default],
            ['Accept' => 'application/json']
        );
    }

    private function jenisDalam($response, string $kunci = 'data'): array
    {
        return collect($response->json($kunci))->pluck('jenis')->all();
    }

    /* ---------- daftar lampiran ---------- */

    public function test_daftar_lampiran_mengikuti_jalur_konsentrasi_dan_jurnal_berbayar(): void
    {
        Sanctum::actingAs($this->makeUser('mahasiswa'));

        $skripsi = $this->getJson('/api/ta/sidang/lampiran?jalur=skripsi&konsentrasi=reg_a')
            ->assertOk()
            ->assertJsonCount(9, 'data');

        $jenis = $this->jenisDalam($skripsi);
        $this->assertContains('sertifikat_pkm', $jenis);
        $this->assertNotContains('sertifikat_kegiatan_ilmiah', $jenis);
        $this->assertNotContains('jurnal', $jenis);

        $draf = collect($skripsi->json('data'))->firstWhere('jenis', 'draf_laporan');
        $this->assertSame('Draf Laporan Skripsi', $draf['label']);

        $foto = collect($skripsi->json('data'))->firstWhere('jenis', 'pas_foto');
        $this->assertContains('png', $foto['format']);

        $jurnal = $this->getJson('/api/ta/sidang/lampiran?jalur=jurnal&konsentrasi=reg_b')
            ->assertOk()
            ->assertJsonCount(14, 'data');

        $jenisJurnal = $this->jenisDalam($jurnal);
        $this->assertContains('sertifikat_kegiatan_ilmiah', $jenisJurnal);
        $this->assertContains('loa', $jenisJurnal);
        $this->assertNotContains('bukti_bayar_jurnal', $jenisJurnal);

        $drafJurnal = collect($jurnal->json('data'))->firstWhere('jenis', 'draf_laporan');
        $this->assertSame('Draf Laporan Penelitian', $drafJurnal['label']);

        $berbayar = $this->getJson('/api/ta/sidang/lampiran?jalur=jurnal&konsentrasi=reg_b&jurnal_berbayar=1')
            ->assertOk()
            ->assertJsonCount(15, 'data');

        $this->assertContains('bukti_bayar_jurnal', $this->jenisDalam($berbayar));

        $this->getJson('/api/ta/sidang/lampiran?jalur=tesis&konsentrasi=reg_a')->assertStatus(422);
    }

    /* ---------- mahasiswa: membuat & mengubah ---------- */

    public function test_tidak_bisa_membuat_pengajuan_tanpa_ta_disetujui_dan_pembimbing(): void
    {
        $dosen1 = $this->makeUser('dosen');
        $dosen2 = $this->makeUser('dosen');

        $tanpaPembimbing = $this->makeUser('mahasiswa');
        $this->makeTa($tanpaPembimbing, $dosen1, $dosen2, 'APPROVED');

        Sanctum::actingAs($tanpaPembimbing);
        $this->postJson('/api/ta/sidang', [])->assertStatus(409);

        $belumDisetujui = $this->makeUser('mahasiswa');
        $this->makeTa($belumDisetujui, $dosen1, $dosen2, 'PENDING');

        Sanctum::actingAs($belumDisetujui);
        $this->postJson('/api/ta/sidang', [])->assertStatus(409);
    }

    public function test_pengajuan_dibuat_sebagai_draft_dengan_data_terisi_otomatis(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/sidang', [])
            ->assertCreated()
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.menunggu', null)
            ->assertJsonPath('data.data_pribadi.alamat', $ta->alamat)
            ->assertJsonPath('data.data_pribadi.skor_toefl', 480)
            ->assertJsonPath('data.data_sidang.judul_ta', $ta->judul_ta)
            ->assertJsonPath('data.data_sidang.jalur', 'skripsi')
            ->assertJsonPath('data.data_sidang.konsentrasi', 'reg_a')
            ->assertJsonPath('data.data_sidang.jurnal_berbayar', false)
            ->assertJsonCount(9, 'data.lampiran')
            ->assertJsonPath('data.mahasiswa.name', $mahasiswa->name)
            ->assertJsonPath('data.dosen_pembimbing.utama.id', $ta->pembimbing->firstWhere('peran', 'utama')->dosen_id);
    }

    public function test_data_tambahan_bisa_ditimpa_saat_membuat(): void
    {
        [$mahasiswa] = $this->skenario();

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/sidang', ['skor_toefl' => 520, 'ipk' => 3.75])
            ->assertCreated()
            ->assertJsonPath('data.data_pribadi.skor_toefl', 520)
            ->assertJsonPath('data.data_pribadi.ipk', '3.75');
    }

    public function test_validasi_data_tambahan(): void
    {
        [$mahasiswa] = $this->skenario();

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/sidang', ['tanggal_lahir' => now()->addDay()->toDateString()])
            ->assertStatus(422)->assertJsonValidationErrors('tanggal_lahir');

        $this->postJson('/api/ta/sidang', ['ipk' => 5])
            ->assertStatus(422)->assertJsonValidationErrors('ipk');

        $this->postJson('/api/ta/sidang', ['skor_toefl' => -1])
            ->assertStatus(422)->assertJsonValidationErrors('skor_toefl');
    }

    public function test_pengajuan_kedua_ditolak_selama_ada_yang_aktif_tetapi_boleh_setelah_ditolak(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta, 'DRAFT');

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/sidang', [])->assertStatus(409);

        $sidang->update(['status' => 'REJECTED']);

        $this->postJson('/api/ta/sidang', [])->assertCreated();
    }

    public function test_show_mengembalikan_pengajuan_terbaru_atau_null(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();

        Sanctum::actingAs($mahasiswa);

        $this->getJson('/api/ta/sidang')->assertOk()->assertJsonPath('data', null);

        $sidang = $this->buatSidang($ta);

        $this->getJson('/api/ta/sidang')
            ->assertOk()
            ->assertJsonPath('data.id', $sidang->id)
            ->assertJsonCount(9, 'data.lampiran');
    }

    public function test_data_bisa_diubah_saat_draft_tetapi_tidak_saat_pending(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta);

        Sanctum::actingAs($mahasiswa);

        $this->putJson("/api/ta/sidang/{$sidang->id}", ['judul_ta' => 'Judul Baru'])
            ->assertOk()
            ->assertJsonPath('data.data_sidang.judul_ta', 'Judul Baru');

        $sidang->update(['status' => 'PENDING']);

        $this->putJson("/api/ta/sidang/{$sidang->id}", ['judul_ta' => 'Lagi'])->assertStatus(409);
    }

    public function test_jurnal_berbayar_hanya_berlaku_untuk_jalur_jurnal(): void
    {
        [$mahasiswa] = $this->skenario('skripsi');

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/sidang', ['jurnal_berbayar' => true])
            ->assertCreated()
            ->assertJsonPath('data.data_sidang.jurnal_berbayar', false)
            ->assertJsonCount(9, 'data.lampiran');
    }

    public function test_mengubah_jurnal_berbayar_menghapus_bukti_bayar_yang_tidak_berlaku(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario('jurnal', 'reg_b');
        $sidang = $this->buatSidang($ta, 'DRAFT', false, true);

        Sanctum::actingAs($mahasiswa);

        $this->unggah($sidang, 'bukti_bayar_jurnal')->assertCreated();
        $path = $sidang->dokumen()->where('jenis', 'bukti_bayar_jurnal')->firstOrFail()->path;
        Storage::disk('local')->assertExists($path);

        $this->putJson("/api/ta/sidang/{$sidang->id}", ['jurnal_berbayar' => false])
            ->assertOk()
            ->assertJsonPath('data.data_sidang.jurnal_berbayar', false);

        $this->assertDatabaseMissing('dokumen_kps', ['jenis' => 'bukti_bayar_jurnal']);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_mahasiswa_lain_tidak_bisa_mengakses_pengajuan_orang_lain(): void
    {
        [, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta);
        $lain = $this->makeUser('mahasiswa');

        Sanctum::actingAs($lain);

        $this->putJson("/api/ta/sidang/{$sidang->id}", ['judul_ta' => 'x'])->assertForbidden();
        $this->deleteJson("/api/ta/sidang/{$sidang->id}")->assertForbidden();
        $this->unggah($sidang, 'akte_kelahiran')->assertForbidden();
        $this->postJson("/api/ta/sidang/{$sidang->id}/submit")->assertForbidden();
    }

    public function test_draft_bisa_dibatalkan_dan_file_ikut_terhapus_tetapi_pending_tidak(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta);
        $this->lampiranLengkap($sidang, ['akte_kelahiran']);
        $path = $sidang->dokumen()->firstOrFail()->path;

        Sanctum::actingAs($mahasiswa);

        $sidang->update(['status' => 'PENDING']);
        $this->deleteJson("/api/ta/sidang/{$sidang->id}")->assertStatus(409);

        $sidang->update(['status' => 'DRAFT']);
        $this->deleteJson("/api/ta/sidang/{$sidang->id}")->assertOk();

        $this->assertDatabaseMissing('pengajuan_sidang_tas', ['id' => $sidang->id]);
        Storage::disk('local')->assertMissing($path);
    }

    /* ---------- mahasiswa: lampiran ---------- */

    public function test_unggah_lampiran_pdf_disimpan_privat_dan_checklist_diperbarui(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta);

        Sanctum::actingAs($mahasiswa);

        $response = $this->unggah($sidang, 'akte_kelahiran')
            ->assertCreated()
            ->assertJsonPath('data.dokumen.jenis', 'akte_kelahiran')
            ->assertJsonMissingPath('data.dokumen.path');

        $item = collect($response->json('data.lampiran'))->firstWhere('jenis', 'akte_kelahiran');
        $this->assertTrue($item['terunggah']);

        Storage::disk('local')->assertExists($sidang->dokumen()->firstOrFail()->path);
    }

    public function test_pas_foto_harus_gambar_dan_lampiran_lain_harus_pdf(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta);

        Sanctum::actingAs($mahasiswa);

        $this->unggah($sidang, 'pas_foto')->assertCreated();

        $this->unggah($sidang, 'pas_foto', UploadedFile::fake()->create('foto.pdf', 100, 'application/pdf'))
            ->assertStatus(422)->assertJsonValidationErrors('file');

        $this->unggah($sidang, 'akte_kelahiran', UploadedFile::fake()->create('akte.jpg', 100, 'image/jpeg'))
            ->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_jenis_lampiran_yang_tidak_berlaku_ditolak(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario('skripsi', 'reg_a');
        $sidang = $this->buatSidang($ta);

        Sanctum::actingAs($mahasiswa);

        // lampiran jalur Jurnal pada jalur Skripsi
        $this->unggah($sidang, 'loa')->assertStatus(422)->assertJsonValidationErrors('jenis');

        // sertifikat Reg B pada konsentrasi Reg A
        $this->unggah($sidang, 'sertifikat_kegiatan_ilmiah')
            ->assertStatus(422)->assertJsonValidationErrors('jenis');

        // bukti bayar jurnal saat jurnal tidak berbayar
        $this->unggah($sidang, 'bukti_bayar_jurnal')
            ->assertStatus(422)->assertJsonValidationErrors('jenis');
    }

    public function test_mengganti_lampiran_jenis_sama_menghapus_file_lama(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta);

        Sanctum::actingAs($mahasiswa);

        $this->unggah($sidang, 'akte_kelahiran')->assertCreated();
        $pathLama = $sidang->dokumen()->where('jenis', 'akte_kelahiran')->firstOrFail()->path;

        $this->unggah($sidang, 'akte_kelahiran')->assertCreated();

        $this->assertSame(1, $sidang->dokumen()->where('jenis', 'akte_kelahiran')->count());
        Storage::disk('local')->assertMissing($pathLama);
    }

    public function test_lampiran_tidak_bisa_diunggah_saat_pending(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta, 'PENDING');

        Sanctum::actingAs($mahasiswa);

        $this->unggah($sidang, 'akte_kelahiran')->assertStatus(409);
    }

    /* ---------- mahasiswa: kirim ---------- */

    public function test_kirim_ditolak_jika_lampiran_belum_lengkap(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta);
        $this->lampiranLengkap($sidang, ['pas_foto', 'akte_kelahiran']);

        Sanctum::actingAs($mahasiswa);

        $this->postJson("/api/ta/sidang/{$sidang->id}/submit")
            ->assertStatus(422)
            ->assertJsonCount(7, 'data.lampiran_kurang');

        $this->assertSame('DRAFT', $sidang->fresh()->status);
    }

    public function test_kirim_berhasil_menunggu_dosen_dan_tidak_bisa_dikirim_dua_kali(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta);
        $this->lampiranLengkap($sidang);

        Sanctum::actingAs($mahasiswa);

        $this->postJson("/api/ta/sidang/{$sidang->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.menunggu', 'dosen');

        $this->assertNotNull($sidang->fresh()->submitted_at);

        $this->postJson("/api/ta/sidang/{$sidang->id}/submit")->assertStatus(409);
    }

    public function test_jalur_jurnal_wajib_lampiran_tambahan_dan_bukti_bayar_hanya_jika_berbayar(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario('jurnal', 'reg_b');

        Sanctum::actingAs($mahasiswa);

        // jurnal tidak berbayar: lengkap tanpa bukti bayar
        $gratis = $this->buatSidang($ta, 'DRAFT', false, false);
        $this->lampiranLengkap($gratis);

        $this->postJson("/api/ta/sidang/{$gratis->id}/submit")->assertOk();

        // jurnal berbayar: tanpa bukti bayar harus ditolak
        $ta2 = $this->skenario('jurnal', 'reg_b');
        Sanctum::actingAs($ta2[0]);

        $berbayar = $this->buatSidang($ta2[3], 'DRAFT', false, true);
        $this->lampiranLengkap($berbayar, array_values(array_diff(
            LampiranSidangTA::jenisUntuk('jurnal', 'reg_b', true),
            ['bukti_bayar_jurnal']
        )));

        $response = $this->postJson("/api/ta/sidang/{$berbayar->id}/submit")->assertStatus(422);

        $this->assertSame(
            ['bukti_bayar_jurnal'],
            $this->jenisDalam($response, 'data.lampiran_kurang')
        );
    }

    public function test_setelah_ditolak_mahasiswa_bisa_mengirim_ulang_dan_konfirmasi_dosen_direset(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta, 'REJECTED', true);
        $sidang->update(['catatan' => 'Akte tidak terbaca']);
        $this->lampiranLengkap($sidang);

        Sanctum::actingAs($mahasiswa);

        $this->postJson("/api/ta/sidang/{$sidang->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.catatan', null)
            ->assertJsonPath('data.menunggu', 'dosen');

        $this->assertNull($sidang->fresh()->dosen_confirmed_at);
    }

    /* ---------- dosen pembimbing ---------- */

    public function test_dosen_melihat_pengajuan_terkirim_dengan_peran_masing_masing_dan_draft_disembunyikan(): void
    {
        [, $utama, $co, $ta] = $this->skenario();
        $lain = $this->makeUser('dosen');
        $this->buatSidang($ta, 'PENDING');
        $this->buatSidang($ta, 'DRAFT');

        Sanctum::actingAs($utama);
        $this->getJson('/api/ta/dosen/sidang')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.peran_saya', 'utama')
            ->assertJsonPath('data.0.menunggu', 'dosen');

        Sanctum::actingAs($co);
        $this->getJson('/api/ta/dosen/sidang')
            ->assertOk()
            ->assertJsonPath('data.0.peran_saya', 'co');

        Sanctum::actingAs($lain);
        $this->getJson('/api/ta/dosen/sidang')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_detail_untuk_dosen_hanya_untuk_pembimbing_dan_draft_tidak_terlihat(): void
    {
        [, $utama, $co, $ta] = $this->skenario();
        $lain = $this->makeUser('dosen');
        $terkirim = $this->buatSidang($ta, 'PENDING');
        $draft = $this->buatSidang($ta, 'DRAFT');

        Sanctum::actingAs($co);
        $this->getJson("/api/ta/dosen/sidang/{$terkirim->id}")
            ->assertOk()
            ->assertJsonPath('data.peran_saya', 'co');

        $this->getJson("/api/ta/dosen/sidang/{$draft->id}")->assertNotFound();

        Sanctum::actingAs($lain);
        $this->getJson("/api/ta/dosen/sidang/{$terkirim->id}")->assertForbidden();
    }

    public function test_pembimbing_utama_mengonfirmasi_kesiapan_dan_diteruskan_ke_staff(): void
    {
        [, $utama, , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta, 'PENDING');

        Sanctum::actingAs($utama);

        $this->patchJson("/api/ta/dosen/sidang/{$sidang->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.menunggu', 'staff');

        $this->assertNotNull($sidang->fresh()->dosen_confirmed_at);

        $this->patchJson("/api/ta/dosen/sidang/{$sidang->id}/approve")->assertStatus(409);
    }

    public function test_co_pembimbing_dan_dosen_lain_tidak_bisa_mengonfirmasi(): void
    {
        [, , $co, $ta] = $this->skenario();
        $lain = $this->makeUser('dosen');
        $sidang = $this->buatSidang($ta, 'PENDING');

        Sanctum::actingAs($co);
        $this->patchJson("/api/ta/dosen/sidang/{$sidang->id}/approve")->assertForbidden();
        $this->patchJson("/api/ta/dosen/sidang/{$sidang->id}/reject", ['catatan' => 'x'])->assertForbidden();

        Sanctum::actingAs($lain);
        $this->patchJson("/api/ta/dosen/sidang/{$sidang->id}/approve")->assertForbidden();

        $this->assertNull($sidang->fresh()->dosen_confirmed_at);
    }

    public function test_pembimbing_utama_menolak_wajib_catatan(): void
    {
        [, $utama, , $ta] = $this->skenario();
        $sidang = $this->buatSidang($ta, 'PENDING');

        Sanctum::actingAs($utama);

        $this->patchJson("/api/ta/dosen/sidang/{$sidang->id}/reject", [])
            ->assertStatus(422)->assertJsonValidationErrors('catatan');

        $this->patchJson("/api/ta/dosen/sidang/{$sidang->id}/reject", ['catatan' => 'Draf belum final.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'REJECTED')
            ->assertJsonPath('data.catatan', 'Draf belum final.');
    }

    /* ---------- staff ---------- */

    public function test_staff_melihat_pengajuan_terkirim_dengan_filter_status_dan_menunggu(): void
    {
        [, , , $ta] = $this->skenario();
        [, , , $ta2] = $this->skenario();
        [, , , $ta3] = $this->skenario();
        $staff = $this->makeUser('staff');

        $this->buatSidang($ta, 'DRAFT');
        $menungguDosen = $this->buatSidang($ta2, 'PENDING', false);
        $menungguStaff = $this->buatSidang($ta3, 'PENDING', true);

        Sanctum::actingAs($staff);

        $this->getJson('/api/ta/staff/sidang')->assertOk()->assertJsonCount(2, 'data');

        $this->getJson('/api/ta/staff/sidang?menunggu=staff')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $menungguStaff->id);

        $this->getJson('/api/ta/staff/sidang?menunggu=dosen')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $menungguDosen->id);

        $this->getJson('/api/ta/staff/sidang?status=APPROVED')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson("/api/ta/staff/sidang/{$menungguStaff->id}")->assertOk();
    }

    public function test_staff_tidak_bisa_melihat_draft_dan_mahasiswa_tidak_bisa_masuk_endpoint_staff(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $staff = $this->makeUser('staff');
        $draft = $this->buatSidang($ta, 'DRAFT');

        Sanctum::actingAs($staff);
        $this->getJson("/api/ta/staff/sidang/{$draft->id}")->assertNotFound();

        Sanctum::actingAs($mahasiswa);
        $this->getJson('/api/ta/staff/sidang')->assertForbidden();
    }

    public function test_staff_tidak_bisa_memproses_sebelum_dosen_mengonfirmasi(): void
    {
        [, , , $ta] = $this->skenario();
        $staff = $this->makeUser('staff');
        $sidang = $this->buatSidang($ta, 'PENDING', false);

        Sanctum::actingAs($staff);

        $this->patchJson("/api/ta/staff/sidang/{$sidang->id}/approve")->assertStatus(409);
        $this->patchJson("/api/ta/staff/sidang/{$sidang->id}/reject", ['catatan' => 'x'])->assertStatus(409);
    }

    public function test_staff_menyetujui_setelah_dosen_mengonfirmasi_dan_tidak_bisa_dua_kali(): void
    {
        [, , , $ta] = $this->skenario();
        $staff = $this->makeUser('staff');
        $sidang = $this->buatSidang($ta, 'PENDING', true);

        Sanctum::actingAs($staff);

        $this->patchJson("/api/ta/staff/sidang/{$sidang->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'APPROVED')
            ->assertJsonPath('data.menunggu', null);

        $this->patchJson("/api/ta/staff/sidang/{$sidang->id}/approve")->assertStatus(409);
    }

    public function test_staff_menolak_wajib_catatan_dan_konfirmasi_dosen_direset(): void
    {
        [, , , $ta] = $this->skenario();
        $staff = $this->makeUser('staff');
        $sidang = $this->buatSidang($ta, 'PENDING', true);

        Sanctum::actingAs($staff);

        $this->patchJson("/api/ta/staff/sidang/{$sidang->id}/reject", [])
            ->assertStatus(422)->assertJsonValidationErrors('catatan');

        $this->patchJson("/api/ta/staff/sidang/{$sidang->id}/reject", ['catatan' => 'Akte tidak sesuai.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'REJECTED')
            ->assertJsonPath('data.catatan', 'Akte tidak sesuai.');

        $this->assertNull($sidang->fresh()->dosen_confirmed_at);
    }

    /* ---------- download ---------- */

    public function test_lampiran_sidang_bisa_diunduh_pemilik_pembimbing_dan_staff_tetapi_tidak_orang_lain(): void
    {
        [$mahasiswa, $utama, $co, $ta] = $this->skenario();
        $staff = $this->makeUser('staff');
        $mahasiswaLain = $this->makeUser('mahasiswa');
        $dosenLain = $this->makeUser('dosen');

        $sidang = $this->buatSidang($ta, 'PENDING');
        $this->lampiranLengkap($sidang, ['akte_kelahiran']);
        $dokumen = $sidang->dokumen()->firstOrFail();

        foreach ([$mahasiswa, $utama, $co, $staff] as $user) {
            Sanctum::actingAs($user);

            $this->get("/api/kp/dokumen/{$dokumen->id}/download", ['Accept' => 'application/json'])
                ->assertOk();
        }

        foreach ([$mahasiswaLain, $dosenLain] as $user) {
            Sanctum::actingAs($user);

            $this->getJson("/api/kp/dokumen/{$dokumen->id}/download")->assertForbidden();
        }
    }
}
