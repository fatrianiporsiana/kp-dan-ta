<?php

namespace Tests\Feature;

use App\Models\JadwalSidangTA;
use App\Models\PendaftaranTA;
use App\Models\PengajuanSidangTA;
use App\Models\PengujiTA;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesKpFixtures;
use Tests\Concerns\CreatesTaFixtures;
use Tests\TestCase;

class JadwalSidangTATest extends TestCase
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

    private function tanggal(int $hariKeDepan = 7): string
    {
        return now()->addDays($hariKeDepan)->toDateString();
    }

    /**
     * Mahasiswa dengan pengajuan sidang yang sudah APPROVED (siap diuji).
     *
     * @return array{0: User, 1: User, 2: User, 3: PendaftaranTA, 4: PengajuanSidangTA}
     *         mahasiswa, pembimbing utama, co, ta, sidang
     */
    private function siapUji(string $status = 'APPROVED'): array
    {
        $mahasiswa = $this->makeUser('mahasiswa');
        $utama = $this->makeUser('dosen');
        $co = $this->makeUser('dosen');

        $ta = $this->makeTa($mahasiswa, $utama, $co, 'APPROVED');
        $this->tambahPembimbingTa($ta, $utama, $co);

        $sidang = $ta->pengajuanSidang()->create([
            'alamat' => $ta->alamat,
            'tempat_lahir' => $ta->tempat_lahir,
            'tanggal_lahir' => $ta->tanggal_lahir,
            'email_widyatama' => $ta->email_widyatama,
            'nomor_telepon' => $ta->nomor_telepon,
            'ipk' => $ta->ipk,
            'skor_toefl' => $ta->skor_toefl,
            'judul_ta' => $ta->judul_ta,
            'jurnal_berbayar' => false,
            'status' => $status,
            'dosen_confirmed_at' => now(),
            'submitted_at' => now(),
        ]);

        return [$mahasiswa, $utama, $co, $ta, $sidang];
    }

    /** @param list<User> $penguji */
    private function payload(array $penguji, array $override = []): array
    {
        return array_merge([
            'tanggal' => $this->tanggal(),
            'waktu_mulai' => '09:00',
            'waktu_selesai' => '10:30',
            'ruang' => 'R.301',
            'dosen_penguji_ids' => array_map(fn (User $user) => $user->dosen->id, $penguji),
        ], $override);
    }

    /** Memasang jadwal langsung di database (tanpa HTTP). @param list<User> $penguji */
    private function pasangJadwal(
        PengajuanSidangTA $sidang,
        array $penguji,
        ?string $tanggal = null,
        string $mulai = '09:00',
        string $selesai = '10:30',
        string $ruang = 'R.301'
    ): JadwalSidangTA {
        $jadwal = JadwalSidangTA::create([
            'pengajuan_sidang_ta_id' => $sidang->id,
            'tanggal' => $tanggal ?? $this->tanggal(),
            'waktu_mulai' => $mulai,
            'waktu_selesai' => $selesai,
            'ruang' => $ruang,
        ]);

        foreach (array_values($penguji) as $indeks => $user) {
            $jadwal->penguji()->create([
                'dosen_id' => $user->dosen->id,
                'urutan' => $indeks + 1,
            ]);
        }

        return $jadwal;
    }

    private function tambahDokumen(PengajuanSidangTA $sidang, string $jenis): int
    {
        $path = "dokumen-kp/ta/sidang/{$sidang->id}/{$jenis}.pdf";
        Storage::disk('local')->put($path, 'isi pdf');

        return $sidang->dokumen()->create([
            'jenis' => $jenis,
            'nama_file' => "{$jenis}.pdf",
            'path' => $path,
            'ukuran' => 7,
            'mime_type' => 'application/pdf',
        ])->id;
    }

    private function urlJadwal(PengajuanSidangTA $sidang): string
    {
        return "/api/ta/staff/sidang/{$sidang->id}/jadwal";
    }

    /* ---------- staff: daftar siap diuji ---------- */

    public function test_staff_melihat_mahasiswa_siap_diuji_dengan_filter_jadwal(): void
    {
        [, , , , $tanpaJadwal] = $this->siapUji();
        [, , , , $denganJadwal] = $this->siapUji();
        $this->siapUji('PENDING');
        $this->pasangJadwal($denganJadwal, [$this->makeUser('dosen')]);

        Sanctum::actingAs($this->makeUser('staff'));

        $this->getJson('/api/ta/staff/siap-diuji')->assertOk()->assertJsonCount(2, 'data');

        $this->getJson('/api/ta/staff/siap-diuji?jadwal=belum')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $tanpaJadwal->id)
            ->assertJsonPath('data.0.jadwal', null);

        $this->getJson('/api/ta/staff/siap-diuji?jadwal=sudah')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $denganJadwal->id);

        $this->getJson('/api/ta/staff/siap-diuji?jadwal=entah')->assertStatus(422);
    }

    /* ---------- staff: menetapkan jadwal ---------- */

    public function test_staff_menetapkan_jadwal_dan_penguji(): void
    {
        [, , , , $sidang] = $this->siapUji();
        $penguji1 = $this->makeUser('dosen');
        $penguji2 = $this->makeUser('dosen');

        Sanctum::actingAs($this->makeUser('staff'));

        $this->putJson($this->urlJadwal($sidang), $this->payload([$penguji1, $penguji2]))
            ->assertCreated()
            ->assertJsonPath('data.jadwal.tanggal', $this->tanggal())
            ->assertJsonPath('data.jadwal.waktu_mulai', '09:00')
            ->assertJsonPath('data.jadwal.waktu_selesai', '10:30')
            ->assertJsonPath('data.jadwal.ruang', 'R.301')
            ->assertJsonCount(2, 'data.jadwal.dosen_penguji')
            ->assertJsonPath('data.jadwal.dosen_penguji.0.urutan', 1)
            ->assertJsonPath('data.jadwal.dosen_penguji.0.id', $penguji1->dosen->id)
            ->assertJsonPath('data.jadwal.dosen_penguji.1.urutan', 2)
            ->assertJsonPath('data.jadwal.dosen_penguji.1.id', $penguji2->dosen->id);

        $this->assertSame(1, JadwalSidangTA::count());
        $this->assertSame(2, PengujiTA::count());
    }

    public function test_menjadwalkan_ulang_mengganti_penguji_tanpa_bentrok_dengan_diri_sendiri(): void
    {
        [, , , , $sidang] = $this->siapUji();
        $penguji1 = $this->makeUser('dosen');
        $penguji2 = $this->makeUser('dosen');

        Sanctum::actingAs($this->makeUser('staff'));

        // simpan dua kali dengan data yang sama: tidak bentrok dengan dirinya sendiri
        $this->putJson($this->urlJadwal($sidang), $this->payload([$penguji1]))->assertCreated();
        $this->putJson($this->urlJadwal($sidang), $this->payload([$penguji1]))->assertOk();

        $this->putJson($this->urlJadwal($sidang), $this->payload([$penguji2], ['ruang' => 'R.402']))
            ->assertOk()
            ->assertJsonPath('data.jadwal.ruang', 'R.402')
            ->assertJsonCount(1, 'data.jadwal.dosen_penguji')
            ->assertJsonPath('data.jadwal.dosen_penguji.0.id', $penguji2->dosen->id);

        $this->assertSame(1, JadwalSidangTA::count());
        $this->assertSame(1, PengujiTA::count());
    }

    public function test_jadwal_hanya_untuk_pengajuan_yang_sudah_disetujui(): void
    {
        [, , , , $pending] = $this->siapUji('PENDING');

        Sanctum::actingAs($this->makeUser('staff'));

        $this->putJson($this->urlJadwal($pending), $this->payload([$this->makeUser('dosen')]))
            ->assertStatus(409);

        $this->postJson($this->urlJadwal($pending) . '/cek', $this->payload([$this->makeUser('dosen')]))
            ->assertStatus(409);
    }

    public function test_validasi_jadwal(): void
    {
        [, , , , $sidang] = $this->siapUji();
        $dosen = [
            $this->makeUser('dosen'),
            $this->makeUser('dosen'),
            $this->makeUser('dosen'),
            $this->makeUser('dosen'),
        ];

        Sanctum::actingAs($this->makeUser('staff'));

        $url = $this->urlJadwal($sidang);

        $this->putJson($url, [])->assertStatus(422);

        $this->putJson($url, $this->payload([$dosen[0]], ['tanggal' => now()->subDay()->toDateString()]))
            ->assertStatus(422)->assertJsonValidationErrors('tanggal');

        $this->putJson($url, $this->payload([$dosen[0]], ['waktu_mulai' => '09:00', 'waktu_selesai' => '08:00']))
            ->assertStatus(422)->assertJsonValidationErrors('waktu_selesai');

        $this->putJson($url, $this->payload([$dosen[0]], ['waktu_mulai' => '9 pagi']))
            ->assertStatus(422)->assertJsonValidationErrors('waktu_mulai');

        $this->putJson($url, $this->payload([$dosen[0]], ['ruang' => '']))
            ->assertStatus(422)->assertJsonValidationErrors('ruang');

        $this->putJson($url, $this->payload([], []))
            ->assertStatus(422)->assertJsonValidationErrors('dosen_penguji_ids');

        // maksimal 3 penguji
        $this->putJson($url, $this->payload($dosen))
            ->assertStatus(422)->assertJsonValidationErrors('dosen_penguji_ids');

        // penguji ganda
        $this->putJson($url, $this->payload([$dosen[0], $dosen[0]]))->assertStatus(422);

        // dosen tidak ada
        $this->putJson($url, $this->payload([$dosen[0]], ['dosen_penguji_ids' => [999999]]))
            ->assertStatus(422);

        $this->assertSame(0, JadwalSidangTA::count());
    }

    public function test_pembimbing_tidak_boleh_menjadi_penguji_mahasiswanya_sendiri(): void
    {
        [, $utama, $co, , $sidang] = $this->siapUji();
        $lain = $this->makeUser('dosen');

        Sanctum::actingAs($this->makeUser('staff'));

        foreach ([$utama, $co] as $pembimbing) {
            $this->putJson($this->urlJadwal($sidang), $this->payload([$lain, $pembimbing]))
                ->assertStatus(422)
                ->assertJsonValidationErrors('dosen_penguji_ids');
        }

        $this->assertSame(0, JadwalSidangTA::count());
    }

    /* ---------- bentrok ---------- */

    public function test_bentrok_dosen_penguji_pada_waktu_yang_beririsan(): void
    {
        [, , , , $sidangLain] = $this->siapUji();
        [, , , , $sidang] = $this->siapUji();
        $penguji = $this->makeUser('dosen');
        $pengujiBebas = $this->makeUser('dosen');

        $this->pasangJadwal($sidangLain, [$penguji], null, '09:00', '10:30', 'R.101');

        Sanctum::actingAs($this->makeUser('staff'));

        $this->putJson($this->urlJadwal($sidang), $this->payload(
            [$penguji, $pengujiBebas],
            ['waktu_mulai' => '10:00', 'waktu_selesai' => '11:00', 'ruang' => 'R.202']
        ))
            ->assertStatus(409)
            ->assertJsonCount(1, 'data.bentrok')
            ->assertJsonPath('data.bentrok.0.jenis', 'dosen')
            ->assertJsonPath('data.bentrok.0.dosen.id', $penguji->dosen->id)
            ->assertJsonPath('data.bentrok.0.jadwal.ruang', 'R.101');

        $this->assertNull($sidang->fresh()->jadwal);
    }

    public function test_jadwal_berurutan_atau_beda_hari_tidak_dianggap_bentrok(): void
    {
        [, , , , $sidangLain] = $this->siapUji();
        [, , , , $sidang] = $this->siapUji();
        $penguji = $this->makeUser('dosen');

        $this->pasangJadwal($sidangLain, [$penguji], null, '09:00', '10:30', 'R.301');

        Sanctum::actingAs($this->makeUser('staff'));

        // mulai tepat saat sidang lain selesai
        $this->putJson($this->urlJadwal($sidang), $this->payload(
            [$penguji],
            ['waktu_mulai' => '10:30', 'waktu_selesai' => '12:00']
        ))->assertCreated();

        // hari lain pada jam yang sama
        $this->putJson($this->urlJadwal($sidang), $this->payload(
            [$penguji],
            ['tanggal' => $this->tanggal(8)]
        ))->assertOk();
    }

    public function test_bentrok_ruang_tidak_peduli_huruf_besar_kecil_dan_spasi(): void
    {
        [, , , , $sidangLain] = $this->siapUji();
        [, , , , $sidang] = $this->siapUji();

        $this->pasangJadwal($sidangLain, [$this->makeUser('dosen')], null, '09:00', '10:30', 'R.301');

        Sanctum::actingAs($this->makeUser('staff'));

        $this->putJson($this->urlJadwal($sidang), $this->payload(
            [$this->makeUser('dosen')],
            ['waktu_mulai' => '09:30', 'waktu_selesai' => '11:00', 'ruang' => ' r.301 ']
        ))
            ->assertStatus(409)
            ->assertJsonCount(1, 'data.bentrok')
            ->assertJsonPath('data.bentrok.0.jenis', 'ruang');

        // ruang berbeda pada waktu yang sama tidak bentrok
        $this->putJson($this->urlJadwal($sidang), $this->payload(
            [$this->makeUser('dosen')],
            ['waktu_mulai' => '09:30', 'waktu_selesai' => '11:00', 'ruang' => 'R.302']
        ))->assertCreated();
    }

    public function test_bentrok_ruang_dan_dosen_sekaligus_dilaporkan_keduanya(): void
    {
        [, , , , $sidangLain] = $this->siapUji();
        [, , , , $sidang] = $this->siapUji();
        $penguji = $this->makeUser('dosen');

        $this->pasangJadwal($sidangLain, [$penguji], null, '09:00', '10:30', 'R.301');

        Sanctum::actingAs($this->makeUser('staff'));

        $response = $this->putJson($this->urlJadwal($sidang), $this->payload([$penguji]))
            ->assertStatus(409)
            ->assertJsonCount(2, 'data.bentrok');

        $jenis = collect($response->json('data.bentrok'))->pluck('jenis')->sort()->values()->all();
        $this->assertSame(['dosen', 'ruang'], $jenis);
    }

    public function test_cek_bentrok_tidak_menyimpan_apa_pun(): void
    {
        [, , , , $sidangLain] = $this->siapUji();
        [, , , , $sidang] = $this->siapUji();
        $penguji = $this->makeUser('dosen');

        $this->pasangJadwal($sidangLain, [$penguji], null, '09:00', '10:30', 'R.301');

        Sanctum::actingAs($this->makeUser('staff'));

        $this->postJson($this->urlJadwal($sidang) . '/cek', $this->payload([$penguji]))
            ->assertOk()
            ->assertJsonPath('data.tersedia', false)
            ->assertJsonCount(2, 'data.bentrok');

        $this->postJson($this->urlJadwal($sidang) . '/cek', $this->payload(
            [$this->makeUser('dosen')],
            ['ruang' => 'R.999']
        ))
            ->assertOk()
            ->assertJsonPath('data.tersedia', true)
            ->assertJsonCount(0, 'data.bentrok');

        $this->assertSame(1, JadwalSidangTA::count());
    }

    /* ---------- staff: membatalkan jadwal ---------- */

    public function test_staff_membatalkan_jadwal_dan_penguji_ikut_terhapus(): void
    {
        [, , , , $sidang] = $this->siapUji();
        $this->pasangJadwal($sidang, [$this->makeUser('dosen'), $this->makeUser('dosen')]);

        Sanctum::actingAs($this->makeUser('staff'));

        $this->deleteJson($this->urlJadwal($sidang))->assertOk();

        $this->assertSame(0, JadwalSidangTA::count());
        $this->assertSame(0, PengujiTA::count());
        $this->assertSame('APPROVED', $sidang->fresh()->status);

        $this->deleteJson($this->urlJadwal($sidang))->assertNotFound();
    }

    public function test_hanya_staff_yang_boleh_mengatur_jadwal(): void
    {
        [$mahasiswa, $utama, , , $sidang] = $this->siapUji();
        $penguji = $this->makeUser('dosen');

        foreach ([$mahasiswa, $utama, $penguji] as $user) {
            Sanctum::actingAs($user);

            $this->putJson($this->urlJadwal($sidang), $this->payload([$penguji]))->assertForbidden();
            $this->postJson($this->urlJadwal($sidang) . '/cek', $this->payload([$penguji]))->assertForbidden();
            $this->deleteJson($this->urlJadwal($sidang))->assertForbidden();
            $this->getJson('/api/ta/staff/siap-diuji')->assertForbidden();
        }

        $this->assertSame(0, JadwalSidangTA::count());
    }

    /* ---------- mahasiswa dan pembimbing melihat jadwal ---------- */

    public function test_mahasiswa_dan_pembimbing_melihat_jadwal_setelah_ditetapkan(): void
    {
        [$mahasiswa, $utama, , , $sidang] = $this->siapUji();
        $penguji = $this->makeUser('dosen');

        Sanctum::actingAs($mahasiswa);
        $this->getJson('/api/ta/sidang')->assertOk()->assertJsonPath('data.jadwal', null);

        $this->pasangJadwal($sidang, [$penguji], null, '09:00', '10:30', 'R.301');

        $this->getJson('/api/ta/sidang')
            ->assertOk()
            ->assertJsonPath('data.jadwal.ruang', 'R.301')
            ->assertJsonPath('data.jadwal.waktu_mulai', '09:00')
            ->assertJsonPath('data.jadwal.dosen_penguji.0.id', $penguji->dosen->id);

        Sanctum::actingAs($utama);
        $this->getJson("/api/ta/dosen/sidang/{$sidang->id}")
            ->assertOk()
            ->assertJsonPath('data.jadwal.ruang', 'R.301');
    }

    /* ---------- dosen penguji ---------- */

    public function test_penguji_hanya_melihat_jadwal_menguji_miliknya_berurutan_dan_bisa_difilter(): void
    {
        [, , , , $sidangA] = $this->siapUji();
        [, , , , $sidangB] = $this->siapUji();
        [, , , , $sidangC] = $this->siapUji();
        $penguji = $this->makeUser('dosen');
        $pengujiLain = $this->makeUser('dosen');

        $this->pasangJadwal($sidangA, [$penguji, $pengujiLain], $this->tanggal(9));
        $this->pasangJadwal($sidangB, [$pengujiLain, $penguji], $this->tanggal(7), '13:00', '14:30', 'R.102');
        $this->pasangJadwal($sidangC, [$pengujiLain], $this->tanggal(8), '09:00', '10:30', 'R.103');

        Sanctum::actingAs($penguji);

        $response = $this->getJson('/api/ta/penguji/jadwal')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.tanggal', $this->tanggal(7))
            ->assertJsonPath('data.0.urutan_saya', 2)
            ->assertJsonPath('data.1.tanggal', $this->tanggal(9))
            ->assertJsonPath('data.1.urutan_saya', 1);

        $this->assertNotNull($response->json('data.0.mahasiswa.name'));

        $this->getJson('/api/ta/penguji/jadwal?dari=' . $this->tanggal(8))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.tanggal', $this->tanggal(9));

        $this->getJson('/api/ta/penguji/jadwal?dari=' . $this->tanggal(9) . '&sampai=' . $this->tanggal(7))
            ->assertStatus(422);
    }

    public function test_dosen_yang_bukan_penguji_dan_mahasiswa_tidak_melihat_jadwal_menguji(): void
    {
        [$mahasiswa, $utama, , , $sidang] = $this->siapUji();
        $this->pasangJadwal($sidang, [$this->makeUser('dosen')]);

        Sanctum::actingAs($utama);
        $this->getJson('/api/ta/penguji/jadwal')->assertOk()->assertJsonCount(0, 'data');

        Sanctum::actingAs($mahasiswa);
        $this->getJson('/api/ta/penguji/jadwal')->assertForbidden();
    }

    public function test_detail_sidang_untuk_penguji_hanya_memuat_draf_laporan(): void
    {
        [, , , , $sidang] = $this->siapUji();
        $penguji = $this->makeUser('dosen');
        $bukanPenguji = $this->makeUser('dosen');
        $jadwal = $this->pasangJadwal($sidang, [$penguji]);

        $this->tambahDokumen($sidang, 'draf_laporan');
        $this->tambahDokumen($sidang, 'akte_kelahiran');

        Sanctum::actingAs($penguji);

        $this->getJson("/api/ta/penguji/jadwal/{$jadwal->id}")
            ->assertOk()
            ->assertJsonPath('data.urutan_saya', 1)
            ->assertJsonCount(1, 'data.dokumen')
            ->assertJsonPath('data.dokumen.0.jenis', 'draf_laporan')
            ->assertJsonMissingPath('data.dokumen.0.path');

        Sanctum::actingAs($bukanPenguji);

        $this->getJson("/api/ta/penguji/jadwal/{$jadwal->id}")->assertForbidden();
    }

    public function test_penguji_hanya_bisa_mengunduh_draf_laporan_mahasiswa_yang_diujinya(): void
    {
        [, , , , $sidang] = $this->siapUji();
        [, , , , $sidangLain] = $this->siapUji();
        $penguji = $this->makeUser('dosen');
        $pengujiLain = $this->makeUser('dosen');
        $bukanPenguji = $this->makeUser('dosen');

        $this->pasangJadwal($sidang, [$penguji]);
        $this->pasangJadwal($sidangLain, [$pengujiLain], null, '13:00', '14:30', 'R.202');

        $draf = $this->tambahDokumen($sidang, 'draf_laporan');
        $akte = $this->tambahDokumen($sidang, 'akte_kelahiran');

        Sanctum::actingAs($penguji);

        $this->get("/api/kp/dokumen/{$draf}/download", ['Accept' => 'application/json'])->assertOk();
        $this->getJson("/api/kp/dokumen/{$akte}/download")->assertForbidden();

        foreach ([$pengujiLain, $bukanPenguji] as $user) {
            Sanctum::actingAs($user);

            $this->getJson("/api/kp/dokumen/{$draf}/download")->assertForbidden();
        }
    }
}
