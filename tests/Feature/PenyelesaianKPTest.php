<?php

namespace Tests\Feature;

use App\Models\PendaftaranKP;
use App\Models\PenyelesaianKP;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesKpFixtures;
use Tests\TestCase;

class PenyelesaianKPTest extends TestCase
{
    use RefreshDatabase;
    use CreatesKpFixtures;

    private const URL_TAHAP_1 = '/api/kp/penyelesaian/tahap-1';
    private const URL_TAHAP_2 = '/api/kp/penyelesaian/tahap-2';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        Storage::fake('local');
    }

    /* ---------- helper ---------- */

    private function pdf(string $nama = 'berkas.pdf'): UploadedFile
    {
        return UploadedFile::fake()->create($nama, 100, 'application/pdf');
    }

    private function berkasTahap1(): array
    {
        return [
            'laporan' => $this->pdf('laporan.pdf'),
            'kartu_bimbingan' => $this->pdf('kartu.pdf'),
            'kuesioner' => $this->pdf('kuesioner.pdf'),
        ];
    }

    private function berkasTahap2(): array
    {
        return [
            'tanda_terima' => $this->pdf('tanda-terima.pdf'),
            'laporan_final' => $this->pdf('laporan-final.pdf'),
        ];
    }

    private function kirim(string $url, array $berkas)
    {
        return $this->post($url, $berkas, ['Accept' => 'application/json']);
    }

    private function makePenyelesaian(
        PendaftaranKP $pendaftaran,
        int $tahap,
        string $status = 'PENDING',
        bool $dikonfirmasiDosen = false
    ): PenyelesaianKP {
        return $pendaftaran->penyelesaian()->create([
            'tahap' => $tahap,
            'status' => $status,
            'submitted_at' => now(),
            'dosen_confirmed_at' => $dikonfirmasiDosen ? now() : null,
        ]);
    }

    /* ---------- mahasiswa: tahap 1 ---------- */

    public function test_tanpa_pembimbing_tidak_bisa_mengirim_tahap_1(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswa, $dosen, 'APPROVED', false);

        Sanctum::actingAs($mahasiswa);

        $this->kirim(self::URL_TAHAP_1, $this->berkasTahap1())->assertStatus(409);
    }

    public function test_tahap_1_berhasil_dikirim_dan_menunggu_dosen(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);

        Sanctum::actingAs($mahasiswa);

        $this->kirim(self::URL_TAHAP_1, $this->berkasTahap1())
            ->assertCreated()
            ->assertJsonPath('data.tahap', 1)
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.menunggu', 'dosen')
            ->assertJsonCount(3, 'data.dokumen')
            ->assertJsonMissingPath('data.dokumen.0.path');

        $penyelesaian = $pendaftaran->penyelesaian()->firstOrFail();

        $this->assertEqualsCanonicalizing(
            ['laporan_kp', 'scan_kartu_bimbingan', 'scan_kuesioner'],
            $penyelesaian->dokumen()->pluck('jenis')->all()
        );

        foreach ($penyelesaian->dokumen as $dokumen) {
            Storage::disk('local')->assertExists($dokumen->path);
        }
    }

    public function test_tahap_1_wajib_lengkap_dan_berformat_pdf(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswa, $dosen);

        Sanctum::actingAs($mahasiswa);

        $kurang = $this->berkasTahap1();
        unset($kurang['kuesioner']);

        $this->kirim(self::URL_TAHAP_1, $kurang)
            ->assertStatus(422)
            ->assertJsonValidationErrors('kuesioner');

        $salah = $this->berkasTahap1();
        $salah['laporan'] = UploadedFile::fake()->create('laporan.png', 100, 'image/png');

        $this->kirim(self::URL_TAHAP_1, $salah)
            ->assertStatus(422)
            ->assertJsonValidationErrors('laporan');
    }

    public function test_tidak_bisa_kirim_ulang_saat_masih_pending(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswa, $dosen);

        Sanctum::actingAs($mahasiswa);

        $this->kirim(self::URL_TAHAP_1, $this->berkasTahap1())->assertCreated();
        $this->kirim(self::URL_TAHAP_1, $this->berkasTahap1())->assertStatus(409);
    }

    public function test_tahap_2_ditolak_sebelum_tahap_1_disetujui(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $this->makePenyelesaian($pendaftaran, 1, 'PENDING', true);

        Sanctum::actingAs($mahasiswa);

        $this->kirim(self::URL_TAHAP_2, $this->berkasTahap2())->assertStatus(409);
    }

    public function test_index_mahasiswa_tanpa_pendaftaran_disetujui_mengembalikan_data_kosong(): void
    {
        $mahasiswa = $this->makeUser('mahasiswa');

        Sanctum::actingAs($mahasiswa);

        $this->getJson('/api/kp/penyelesaian')
            ->assertOk()
            ->assertJsonPath('data.tahap_1', null)
            ->assertJsonPath('data.tahap_2', null)
            ->assertJsonPath('data.kp_selesai', false);
    }

    /* ---------- dosen pembimbing ---------- */

    public function test_dosen_hanya_melihat_antrean_mahasiswa_bimbingannya(): void
    {
        $dosenA = $this->makeUser('dosen');
        $dosenB = $this->makeUser('dosen');
        $mahasiswaA = $this->makeUser('mahasiswa');
        $mahasiswaB = $this->makeUser('mahasiswa');

        $this->makePenyelesaian($this->makePendaftaran($mahasiswaA, $dosenA), 1, 'PENDING');
        $this->makePenyelesaian($this->makePendaftaran($mahasiswaB, $dosenB), 1, 'PENDING');

        Sanctum::actingAs($dosenA);

        $this->getJson('/api/kp/dosen/penyelesaian')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.pendaftaran.mahasiswa.name', $mahasiswaA->name);

        $this->getJson('/api/kp/dosen/penyelesaian?status=APPROVED')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_dosen_lain_tidak_bisa_mengonfirmasi(): void
    {
        $dosen = $this->makeUser('dosen');
        $dosenLain = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $penyelesaian = $this->makePenyelesaian($this->makePendaftaran($mahasiswa, $dosen), 1);

        Sanctum::actingAs($dosenLain);

        $this->patchJson("/api/kp/dosen/penyelesaian/{$penyelesaian->id}/approve")->assertForbidden();
        $this->patchJson("/api/kp/dosen/penyelesaian/{$penyelesaian->id}/reject", ['catatan' => 'x'])->assertForbidden();
    }

    public function test_konfirmasi_dosen_meneruskan_ke_staff(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $penyelesaian = $this->makePenyelesaian($this->makePendaftaran($mahasiswa, $dosen), 1);

        Sanctum::actingAs($dosen);

        $this->patchJson("/api/kp/dosen/penyelesaian/{$penyelesaian->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.menunggu', 'staff');

        $this->assertNotNull($penyelesaian->fresh()->dosen_confirmed_at);

        $this->patchJson("/api/kp/dosen/penyelesaian/{$penyelesaian->id}/approve")->assertStatus(409);
    }

    public function test_dosen_tidak_bisa_mengonfirmasi_tahap_2(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $this->makePenyelesaian($pendaftaran, 1, 'APPROVED', true);
        $tahap2 = $this->makePenyelesaian($pendaftaran, 2);

        Sanctum::actingAs($dosen);

        $this->patchJson("/api/kp/dosen/penyelesaian/{$tahap2->id}/approve")->assertStatus(409);
    }

    public function test_dosen_menolak_lalu_mahasiswa_kirim_ulang_dan_berkas_lama_terhapus(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);

        Sanctum::actingAs($mahasiswa);
        $this->kirim(self::URL_TAHAP_1, $this->berkasTahap1())->assertCreated();

        $penyelesaian = $pendaftaran->penyelesaian()->firstOrFail();
        $pathLama = $penyelesaian->dokumen()->pluck('path')->all();

        Sanctum::actingAs($dosen);

        $this->patchJson("/api/kp/dosen/penyelesaian/{$penyelesaian->id}/reject", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('catatan');

        $this->patchJson("/api/kp/dosen/penyelesaian/{$penyelesaian->id}/reject", [
            'catatan' => 'Bab 3 belum lengkap.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'REJECTED')
            ->assertJsonPath('data.catatan', 'Bab 3 belum lengkap.');

        Sanctum::actingAs($mahasiswa);

        $this->kirim(self::URL_TAHAP_1, $this->berkasTahap1())
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.catatan', null)
            ->assertJsonPath('data.menunggu', 'dosen')
            ->assertJsonCount(3, 'data.dokumen');

        $this->assertSame(1, $pendaftaran->penyelesaian()->where('tahap', 1)->count());
        $this->assertSame(3, $penyelesaian->dokumen()->count());

        foreach ($pathLama as $path) {
            Storage::disk('local')->assertMissing($path);
        }
    }

    /* ---------- staff ---------- */

    public function test_staff_tidak_bisa_memproses_tahap_1_sebelum_dosen_mengonfirmasi(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $penyelesaian = $this->makePenyelesaian($this->makePendaftaran($mahasiswa, $dosen), 1);

        Sanctum::actingAs($staff);

        $this->patchJson("/api/kp/staff/penyelesaian/{$penyelesaian->id}/approve")->assertStatus(409);
        $this->patchJson("/api/kp/staff/penyelesaian/{$penyelesaian->id}/reject", ['catatan' => 'x'])->assertStatus(409);
    }

    public function test_staff_menyetujui_tahap_1_lalu_mahasiswa_bisa_mengirim_tahap_2(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $tahap1 = $this->makePenyelesaian($pendaftaran, 1, 'PENDING', true);

        Sanctum::actingAs($staff);

        $this->patchJson("/api/kp/staff/penyelesaian/{$tahap1->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');

        Sanctum::actingAs($mahasiswa);

        $this->kirim(self::URL_TAHAP_2, $this->berkasTahap2())
            ->assertCreated()
            ->assertJsonPath('data.tahap', 2)
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.menunggu', 'staff')
            ->assertJsonCount(2, 'data.dokumen');
    }

    public function test_staff_menyelesaikan_proses_kp_pada_tahap_2(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $this->makePenyelesaian($pendaftaran, 1, 'APPROVED', true);
        $tahap2 = $this->makePenyelesaian($pendaftaran, 2);

        Sanctum::actingAs($staff);

        $this->patchJson("/api/kp/staff/penyelesaian/{$tahap2->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'COMPLETED');

        Sanctum::actingAs($mahasiswa);

        $this->getJson('/api/kp/penyelesaian')
            ->assertOk()
            ->assertJsonPath('data.kp_selesai', true)
            ->assertJsonPath('data.tahap_2.status', 'COMPLETED');

        $this->kirim(self::URL_TAHAP_2, $this->berkasTahap2())->assertStatus(409);
    }

    public function test_staff_menolak_tahap_2_wajib_catatan_dan_mahasiswa_bisa_mengirim_ulang(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $this->makePenyelesaian($pendaftaran, 1, 'APPROVED', true);
        $tahap2 = $this->makePenyelesaian($pendaftaran, 2);

        Sanctum::actingAs($staff);

        $this->patchJson("/api/kp/staff/penyelesaian/{$tahap2->id}/reject", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('catatan');

        $this->patchJson("/api/kp/staff/penyelesaian/{$tahap2->id}/reject", [
            'catatan' => 'Tanda terima tidak terbaca.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'REJECTED');

        Sanctum::actingAs($mahasiswa);

        $this->kirim(self::URL_TAHAP_2, $this->berkasTahap2())
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING');
    }

    public function test_staff_bisa_memfilter_daftar_dan_role_lain_ditolak(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $tahap1 = $this->makePenyelesaian($pendaftaran, 1, 'APPROVED', true);
        $this->makePenyelesaian($pendaftaran, 2, 'PENDING');

        Sanctum::actingAs($staff);

        $this->getJson('/api/kp/staff/penyelesaian')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/kp/staff/penyelesaian?tahap=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.tahap', 2);

        $this->getJson('/api/kp/staff/penyelesaian?status=APPROVED')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        Sanctum::actingAs($mahasiswa);
        $this->getJson('/api/kp/staff/penyelesaian')->assertForbidden();

        Sanctum::actingAs($dosen);
        $this->getJson('/api/kp/staff/penyelesaian')->assertForbidden();
        $this->patchJson("/api/kp/staff/penyelesaian/{$tahap1->id}/approve")->assertForbidden();
    }

    /* ---------- download berkas ---------- */

    public function test_berkas_penyelesaian_bisa_diunduh_pemilik_dosen_dan_staff_tetapi_tidak_orang_lain(): void
    {
        $dosen = $this->makeUser('dosen');
        $dosenLain = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $mahasiswaLain = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);

        Sanctum::actingAs($mahasiswa);
        $this->kirim(self::URL_TAHAP_1, $this->berkasTahap1())->assertCreated();

        $dokumen = $pendaftaran->penyelesaian()->firstOrFail()->dokumen()->firstOrFail();

        foreach ([$mahasiswa, $dosen, $staff] as $user) {
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
