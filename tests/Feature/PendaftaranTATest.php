<?php

namespace Tests\Feature;

use App\Models\PembimbingTA;
use App\Models\PendaftaranTA;
use App\Models\User;
use App\Support\LampiranTA;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesKpFixtures;
use Tests\TestCase;

class PendaftaranTATest extends TestCase
{
    use RefreshDatabase;
    use CreatesKpFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        Storage::fake('local');
    }

    /* ---------- helper ---------- */

    private function payload(User $dosen1, User $dosen2, array $override = []): array
    {
        return array_merge([
            'jalur' => 'skripsi',
            'konsentrasi' => 'reg_a',
            'alamat' => 'Jl. Contoh No. 1',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2003-05-10',
            'email_widyatama' => 'mhs@widyatama.ac.id',
            'nomor_telepon' => '08123456789',
            'ipk' => 3.5,
            'skor_toefl' => 480,
            'judul_ta' => 'Judul TA Contoh',
            'dosen_usulan_1_id' => $dosen1->dosen->id,
            'dosen_usulan_2_id' => $dosen2->dosen->id,
        ], $override);
    }

    private function makeTa(
        User $mahasiswa,
        User $dosen1,
        User $dosen2,
        string $status = 'DRAFT',
        string $konsentrasi = 'reg_a'
    ): PendaftaranTA {
        return PendaftaranTA::create(
            $this->payload($dosen1, $dosen2, ['konsentrasi' => $konsentrasi]) + [
                'mahasiswa_id' => $mahasiswa->mahasiswa->id,
                'status' => $status,
                'submitted_at' => $status === 'DRAFT' ? null : now(),
            ]
        );
    }

    private function tambahPembimbing(PendaftaranTA $ta, User $utama, User $co): void
    {
        $ta->pembimbing()->create(['dosen_id' => $utama->dosen->id, 'peran' => 'utama']);
        $ta->pembimbing()->create(['dosen_id' => $co->dosen->id, 'peran' => 'co']);
    }

    /** Membuat lampiran lengkap langsung di database + disk (tanpa HTTP). */
    private function lampiranLengkap(PendaftaranTA $ta, ?array $hanya = null): void
    {
        foreach ($hanya ?? LampiranTA::jenisUntuk($ta->konsentrasi) as $jenis) {
            $path = "dokumen-kp/ta/pendaftaran/{$ta->id}/{$jenis}.pdf";
            Storage::disk('local')->put($path, 'isi pdf');

            $ta->dokumen()->create([
                'jenis' => $jenis,
                'nama_file' => "{$jenis}.pdf",
                'path' => $path,
                'ukuran' => 7,
                'mime_type' => 'application/pdf',
            ]);
        }
    }

    private function upload(PendaftaranTA $ta, string $jenis, ?UploadedFile $file = null)
    {
        return $this->post(
            "/api/ta/pendaftaran/{$ta->id}/dokumen",
            [
                'jenis' => $jenis,
                'file' => $file ?? UploadedFile::fake()->create("{$jenis}.pdf", 100, 'application/pdf'),
            ],
            ['Accept' => 'application/json']
        );
    }

    /** @return array{0: User, 1: User, 2: User} mahasiswa, dosen1, dosen2 */
    private function trio(): array
    {
        return [
            $this->makeUser('mahasiswa'),
            $this->makeUser('dosen'),
            $this->makeUser('dosen'),
        ];
    }

    /* ---------- daftar lampiran ---------- */

    public function test_daftar_lampiran_mengikuti_konsentrasi(): void
    {
        Sanctum::actingAs($this->makeUser('mahasiswa'));

        $regA = collect($this->getJson('/api/ta/lampiran?konsentrasi=reg_a')
            ->assertOk()->assertJsonCount(8, 'data')->json('data'))->pluck('jenis')->all();

        $this->assertContains('sertifikat_pkm', $regA);
        $this->assertNotContains('sertifikat_kegiatan_ilmiah', $regA);

        $regB = collect($this->getJson('/api/ta/lampiran?konsentrasi=reg_b')
            ->assertOk()->assertJsonCount(8, 'data')->json('data'))->pluck('jenis')->all();

        $this->assertContains('sertifikat_kegiatan_ilmiah', $regB);
        $this->assertNotContains('sertifikat_pkm', $regB);

        $this->getJson('/api/ta/lampiran?konsentrasi=reg_c')->assertStatus(422);
    }

    /* ---------- mahasiswa: membuat & mengubah ---------- */

    public function test_mahasiswa_membuat_pendaftaran_berstatus_draft_dengan_checklist_lampiran(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/pendaftaran', $this->payload($dosen1, $dosen2))
            ->assertCreated()
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.data_ta.jalur', 'skripsi')
            ->assertJsonPath('data.data_ta.konsentrasi', 'reg_a')
            ->assertJsonPath('data.dosen_usulan.dosen_1.id', $dosen1->dosen->id)
            ->assertJsonCount(8, 'data.lampiran')
            ->assertJsonPath('data.lampiran.0.terunggah', false);
    }

    public function test_validasi_form_pendaftaran_ta(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/pendaftaran', [])->assertStatus(422);

        $this->postJson('/api/ta/pendaftaran', $this->payload($dosen1, $dosen2, ['jalur' => 'tesis']))
            ->assertStatus(422)->assertJsonValidationErrors('jalur');

        $this->postJson('/api/ta/pendaftaran', $this->payload($dosen1, $dosen2, [
            'dosen_usulan_2_id' => $dosen1->dosen->id,
        ]))->assertStatus(422)->assertJsonValidationErrors('dosen_usulan_2_id');

        $this->postJson('/api/ta/pendaftaran', $this->payload($dosen1, $dosen2, ['skor_toefl' => -1]))
            ->assertStatus(422)->assertJsonValidationErrors('skor_toefl');
    }

    public function test_tidak_bisa_membuat_pendaftaran_baru_kecuali_yang_lama_ditolak(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'DRAFT');

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/pendaftaran', $this->payload($dosen1, $dosen2))->assertStatus(409);

        $ta->update(['status' => 'REJECTED']);

        $this->postJson('/api/ta/pendaftaran', $this->payload($dosen1, $dosen2))->assertCreated();
    }

    public function test_show_mengembalikan_pendaftaran_terbaru_atau_null(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();

        Sanctum::actingAs($mahasiswa);

        $this->getJson('/api/ta/pendaftaran')->assertOk()->assertJsonPath('data', null);

        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2);

        $this->getJson('/api/ta/pendaftaran')
            ->assertOk()
            ->assertJsonPath('data.id', $ta->id)
            ->assertJsonCount(8, 'data.lampiran');
    }

    public function test_data_bisa_diubah_saat_draft_tetapi_tidak_saat_pending(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2);

        Sanctum::actingAs($mahasiswa);

        $this->putJson("/api/ta/pendaftaran/{$ta->id}", $this->payload($dosen1, $dosen2, [
            'judul_ta' => 'Judul Baru',
        ]))->assertOk()->assertJsonPath('data.data_ta.judul_ta', 'Judul Baru');

        $ta->update(['status' => 'PENDING']);

        $this->putJson("/api/ta/pendaftaran/{$ta->id}", $this->payload($dosen1, $dosen2))
            ->assertStatus(409);
    }

    public function test_mengganti_konsentrasi_menghapus_lampiran_yang_tidak_berlaku(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'DRAFT', 'reg_a');

        Sanctum::actingAs($mahasiswa);

        $this->upload($ta, 'sertifikat_pkm')->assertCreated();
        $path = $ta->dokumen()->where('jenis', 'sertifikat_pkm')->firstOrFail()->path;
        Storage::disk('local')->assertExists($path);

        $this->putJson("/api/ta/pendaftaran/{$ta->id}", $this->payload($dosen1, $dosen2, [
            'konsentrasi' => 'reg_b',
        ]))->assertOk();

        $this->assertDatabaseMissing('dokumen_kps', ['jenis' => 'sertifikat_pkm']);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_mahasiswa_lain_tidak_bisa_mengubah_pendaftaran_orang_lain(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $lain = $this->makeUser('mahasiswa');
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2);

        Sanctum::actingAs($lain);

        $this->putJson("/api/ta/pendaftaran/{$ta->id}", $this->payload($dosen1, $dosen2))->assertForbidden();
        $this->deleteJson("/api/ta/pendaftaran/{$ta->id}")->assertForbidden();
        $this->upload($ta, 'frs')->assertForbidden();
        $this->postJson("/api/ta/pendaftaran/{$ta->id}/submit")->assertForbidden();
    }

    public function test_draft_bisa_dibatalkan_dan_file_ikut_terhapus(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2);
        $this->lampiranLengkap($ta, ['frs']);
        $path = $ta->dokumen()->firstOrFail()->path;

        Sanctum::actingAs($mahasiswa);

        $this->deleteJson("/api/ta/pendaftaran/{$ta->id}")->assertOk();

        $this->assertDatabaseMissing('pendaftaran_tas', ['id' => $ta->id]);
        $this->assertSame(0, \App\Models\DokumenKP::count());
        Storage::disk('local')->assertMissing($path);
    }

    public function test_pendaftaran_pending_tidak_bisa_dibatalkan(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'PENDING');

        Sanctum::actingAs($mahasiswa);

        $this->deleteJson("/api/ta/pendaftaran/{$ta->id}")->assertStatus(409);
    }

    /* ---------- mahasiswa: lampiran ---------- */

    public function test_unggah_lampiran_disimpan_privat_dan_checklist_diperbarui(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2);

        Sanctum::actingAs($mahasiswa);

        $response = $this->upload($ta, 'frs')
            ->assertCreated()
            ->assertJsonPath('data.dokumen.jenis', 'frs')
            ->assertJsonMissingPath('data.dokumen.path');

        $frs = collect($response->json('data.lampiran'))->firstWhere('jenis', 'frs');
        $this->assertTrue($frs['terunggah']);

        Storage::disk('local')->assertExists($ta->dokumen()->firstOrFail()->path);
    }

    public function test_lampiran_yang_tidak_berlaku_untuk_konsentrasi_ditolak(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'DRAFT', 'reg_a');

        Sanctum::actingAs($mahasiswa);

        $this->upload($ta, 'sertifikat_kegiatan_ilmiah')
            ->assertStatus(422)->assertJsonValidationErrors('jenis');
    }

    public function test_lampiran_harus_pdf(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2);

        Sanctum::actingAs($mahasiswa);

        $this->upload($ta, 'frs', UploadedFile::fake()->create('frs.png', 100, 'image/png'))
            ->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_mengganti_lampiran_jenis_sama_menghapus_file_lama(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2);

        Sanctum::actingAs($mahasiswa);

        $this->upload($ta, 'frs')->assertCreated();
        $pathLama = $ta->dokumen()->where('jenis', 'frs')->firstOrFail()->path;

        $this->upload($ta, 'frs')->assertCreated();

        $this->assertSame(1, $ta->dokumen()->where('jenis', 'frs')->count());
        Storage::disk('local')->assertMissing($pathLama);
    }

    public function test_lampiran_tidak_bisa_diunggah_saat_pending(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'PENDING');

        Sanctum::actingAs($mahasiswa);

        $this->upload($ta, 'frs')->assertStatus(409);
    }

    /* ---------- mahasiswa: kirim ---------- */

    public function test_kirim_ditolak_jika_lampiran_belum_lengkap(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2);
        $this->lampiranLengkap($ta, ['proposal', 'frs']);

        Sanctum::actingAs($mahasiswa);

        $this->postJson("/api/ta/pendaftaran/{$ta->id}/submit")
            ->assertStatus(422)
            ->assertJsonCount(6, 'data.lampiran_kurang');

        $this->assertSame('DRAFT', $ta->fresh()->status);
    }

    public function test_kirim_berhasil_jika_lampiran_lengkap_dan_pending_tidak_bisa_dikirim_lagi(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2);
        $this->lampiranLengkap($ta);

        Sanctum::actingAs($mahasiswa);

        $this->postJson("/api/ta/pendaftaran/{$ta->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING');

        $this->assertNotNull($ta->fresh()->submitted_at);

        $this->postJson("/api/ta/pendaftaran/{$ta->id}/submit")->assertStatus(409);
    }

    public function test_setelah_ditolak_mahasiswa_bisa_memperbaiki_dan_kirim_ulang(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'REJECTED');
        $ta->update(['catatan' => 'FRS tidak terbaca']);
        $this->lampiranLengkap($ta);

        Sanctum::actingAs($mahasiswa);

        $this->upload($ta, 'frs')->assertCreated();

        $this->postJson("/api/ta/pendaftaran/{$ta->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.catatan', null);
    }

    /* ---------- staff ---------- */

    public function test_staff_hanya_melihat_pendaftaran_yang_sudah_dikirim(): void
    {
        [$mahasiswaA, $dosen1, $dosen2] = $this->trio();
        $mahasiswaB = $this->makeUser('mahasiswa');
        $staff = $this->makeUser('staff');
        $this->makeTa($mahasiswaA, $dosen1, $dosen2, 'DRAFT');
        $kirim = $this->makeTa($mahasiswaB, $dosen1, $dosen2, 'PENDING');

        Sanctum::actingAs($staff);

        $this->getJson('/api/ta/staff/pendaftaran')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $kirim->id)
            ->assertJsonPath('data.0.mahasiswa.name', $mahasiswaB->name);

        $this->getJson('/api/ta/staff/pendaftaran?status=APPROVED')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson("/api/ta/staff/pendaftaran/{$kirim->id}")->assertOk();
    }

    public function test_staff_tidak_bisa_melihat_draft_dan_mahasiswa_tidak_bisa_masuk_endpoint_staff(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $staff = $this->makeUser('staff');
        $draft = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'DRAFT');

        Sanctum::actingAs($staff);
        $this->getJson("/api/ta/staff/pendaftaran/{$draft->id}")->assertNotFound();

        Sanctum::actingAs($mahasiswa);
        $this->getJson('/api/ta/staff/pendaftaran')->assertForbidden();
    }

    public function test_staff_menyetujui_pendaftaran_pending(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $staff = $this->makeUser('staff');
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'PENDING');

        Sanctum::actingAs($staff);

        $this->patchJson("/api/ta/staff/pendaftaran/{$ta->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');

        $this->patchJson("/api/ta/staff/pendaftaran/{$ta->id}/approve")->assertStatus(409);
    }

    public function test_staff_menolak_wajib_menyertakan_catatan(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $staff = $this->makeUser('staff');
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'PENDING');

        Sanctum::actingAs($staff);

        $this->patchJson("/api/ta/staff/pendaftaran/{$ta->id}/reject", [])
            ->assertStatus(422)->assertJsonValidationErrors('catatan');

        $this->patchJson("/api/ta/staff/pendaftaran/{$ta->id}/reject", ['catatan' => 'FRS tidak terbaca'])
            ->assertOk()
            ->assertJsonPath('data.status', 'REJECTED')
            ->assertJsonPath('data.catatan', 'FRS tidak terbaca');
    }

    public function test_staff_menetapkan_pembimbing_utama_dan_co(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $staff = $this->makeUser('staff');
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'APPROVED');

        Sanctum::actingAs($staff);

        $this->postJson("/api/ta/staff/pendaftaran/{$ta->id}/pembimbing", [
            'dosen_utama_id' => $dosen2->dosen->id,
            'dosen_co_id' => $dosen1->dosen->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.dosen_pembimbing.utama.id', $dosen2->dosen->id)
            ->assertJsonPath('data.dosen_pembimbing.co.id', $dosen1->dosen->id);

        $this->assertSame(2, PembimbingTA::where('pendaftaran_ta_id', $ta->id)->count());

        // sudah ditetapkan, tidak bisa ditetapkan lagi
        $this->postJson("/api/ta/staff/pendaftaran/{$ta->id}/pembimbing", [
            'dosen_utama_id' => $dosen1->dosen->id,
            'dosen_co_id' => $dosen2->dosen->id,
        ])->assertStatus(409);
    }

    public function test_penetapan_pembimbing_ditolak_jika_belum_disetujui_atau_dosen_sama(): void
    {
        [$mahasiswa, $dosen1, $dosen2] = $this->trio();
        $staff = $this->makeUser('staff');
        $ta = $this->makeTa($mahasiswa, $dosen1, $dosen2, 'PENDING');

        Sanctum::actingAs($staff);

        $this->postJson("/api/ta/staff/pendaftaran/{$ta->id}/pembimbing", [
            'dosen_utama_id' => $dosen1->dosen->id,
            'dosen_co_id' => $dosen2->dosen->id,
        ])->assertStatus(409);

        $ta->update(['status' => 'APPROVED']);

        $this->postJson("/api/ta/staff/pendaftaran/{$ta->id}/pembimbing", [
            'dosen_utama_id' => $dosen1->dosen->id,
            'dosen_co_id' => $dosen1->dosen->id,
        ])->assertStatus(422)->assertJsonValidationErrors('dosen_co_id');
    }

    /* ---------- dosen pembimbing ---------- */

    public function test_dosen_utama_dan_co_melihat_mahasiswa_bimbingan_dengan_peran_masing_masing(): void
    {
        [$mahasiswa, $utama, $co] = $this->trio();
        $lain = $this->makeUser('dosen');
        $ta = $this->makeTa($mahasiswa, $utama, $co, 'APPROVED');
        $this->tambahPembimbing($ta, $utama, $co);

        Sanctum::actingAs($utama);
        $this->getJson('/api/ta/dosen/mahasiswa')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.peran_saya', 'utama');

        Sanctum::actingAs($co);
        $this->getJson('/api/ta/dosen/mahasiswa')
            ->assertOk()
            ->assertJsonPath('data.0.peran_saya', 'co');

        Sanctum::actingAs($lain);
        $this->getJson('/api/ta/dosen/mahasiswa')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_dosen_hanya_bisa_membuka_detail_mahasiswa_bimbingannya(): void
    {
        [$mahasiswa, $utama, $co] = $this->trio();
        $lain = $this->makeUser('dosen');
        $ta = $this->makeTa($mahasiswa, $utama, $co, 'APPROVED');
        $this->tambahPembimbing($ta, $utama, $co);

        Sanctum::actingAs($co);
        $this->getJson("/api/ta/dosen/mahasiswa/{$ta->id}")
            ->assertOk()
            ->assertJsonPath('data.peran_saya', 'co');

        Sanctum::actingAs($lain);
        $this->getJson("/api/ta/dosen/mahasiswa/{$ta->id}")->assertForbidden();
    }

    /* ---------- download dokumen ---------- */

    public function test_dokumen_ta_bisa_diunduh_pemilik_pembimbing_dan_staff_tetapi_tidak_orang_lain(): void
    {
        [$mahasiswa, $utama, $co] = $this->trio();
        $staff = $this->makeUser('staff');
        $mahasiswaLain = $this->makeUser('mahasiswa');
        $dosenLain = $this->makeUser('dosen');
        $ta = $this->makeTa($mahasiswa, $utama, $co, 'APPROVED');
        $this->tambahPembimbing($ta, $utama, $co);
        $this->lampiranLengkap($ta, ['frs']);
        $dokumen = $ta->dokumen()->firstOrFail();

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
