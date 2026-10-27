<?php

namespace Tests\Feature;

use App\Models\DokumenKP;
use App\Models\PendaftaranKP;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesKpFixtures;
use Tests\TestCase;

class DokumenPrivatTest extends TestCase
{
    use RefreshDatabase;
    use CreatesKpFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        Storage::fake('local');
        Storage::fake('public');
    }

    private function dokumenPendaftaran(PendaftaranKP $pendaftaran, string $jenis = 'krs'): DokumenKP
    {
        return $pendaftaran->dokumen()->create([
            'jenis' => $jenis,
            'nama_file' => "{$jenis}.pdf",
            'path' => "dokumen-kp/pendaftaran/{$pendaftaran->id}/{$jenis}.pdf",
            'ukuran' => 7,
            'mime_type' => 'application/pdf',
        ]);
    }

    /* ---------- upload dokumen pendaftaran ---------- */

    public function test_upload_dokumen_pendaftaran_disimpan_di_disk_privat(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen, 'PENDING', false);

        Sanctum::actingAs($mahasiswa);

        $this->post("/api/kp/pendaftaran/{$pendaftaran->id}/dokumen", [
            'jenis' => 'krs',
            'file' => UploadedFile::fake()->create('krs.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonMissingPath('data.path');

        $path = $pendaftaran->dokumen()->firstOrFail()->path;

        Storage::disk('local')->assertExists($path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_mengganti_dokumen_menghapus_file_lama_di_disk_public(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen, 'PENDING', false);

        $lama = $this->dokumenPendaftaran($pendaftaran, 'krs');
        Storage::disk('public')->put($lama->path, 'isi lama');

        Sanctum::actingAs($mahasiswa);

        $this->post("/api/kp/pendaftaran/{$pendaftaran->id}/dokumen", [
            'jenis' => 'krs',
            'file' => UploadedFile::fake()->create('krs-baru.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();

        Storage::disk('public')->assertMissing($lama->path);
        $this->assertSame(1, $pendaftaran->dokumen()->where('jenis', 'krs')->count());

        $baru = $pendaftaran->dokumen()->where('jenis', 'krs')->firstOrFail();
        Storage::disk('local')->assertExists($baru->path);
    }

    /* ---------- response mahasiswa tidak membocorkan path ---------- */

    public function test_show_pendaftaran_mahasiswa_tidak_menampilkan_path_file(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);

        $this->dokumenPendaftaran($pendaftaran);

        $penyelesaian = $pendaftaran->penyelesaian()->create([
            'tahap' => 1,
            'status' => 'PENDING',
            'submitted_at' => now(),
        ]);
        $penyelesaian->dokumen()->create([
            'jenis' => 'laporan_kp',
            'nama_file' => 'laporan.pdf',
            'path' => 'dokumen-kp/penyelesaian/1/tahap-1/laporan.pdf',
            'ukuran' => 7,
            'mime_type' => 'application/pdf',
        ]);

        $perpanjangan = $pendaftaran->perpanjangan()->create([
            'alasan' => 'Proyek belum selesai',
            'durasi_bulan' => 2,
            'status' => 'PENDING',
            'submitted_at' => now(),
        ]);
        $perpanjangan->dokumen()->create([
            'jenis' => 'scan_perpanjangan',
            'nama_file' => 'scan.pdf',
            'path' => 'dokumen-kp/perpanjangan/1/scan.pdf',
            'ukuran' => 7,
            'mime_type' => 'application/pdf',
        ]);

        Sanctum::actingAs($mahasiswa);

        $this->getJson('/api/kp/pendaftaran')
            ->assertOk()
            ->assertJsonPath('data.dokumen.0.nama_file', 'krs.pdf')
            ->assertJsonMissingPath('data.dokumen.0.path')
            ->assertJsonPath('data.penyelesaian.0.tahap', 1)
            ->assertJsonPath('data.penyelesaian.0.dokumen.0.nama_file', 'laporan.pdf')
            ->assertJsonMissingPath('data.penyelesaian.0.dokumen.0.path')
            ->assertJsonPath('data.perpanjangan.0.alasan', 'Proyek belum selesai')
            ->assertJsonPath('data.perpanjangan.0.dokumen.0.nama_file', 'scan.pdf')
            ->assertJsonMissingPath('data.perpanjangan.0.dokumen.0.path');
    }

    /* ---------- artisan kp:pindahkan-dokumen-privat ---------- */

    public function test_command_memindahkan_file_public_ke_privat_tanpa_mengubah_path_di_database(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $dokumen = $this->dokumenPendaftaran($this->makePendaftaran($mahasiswa, $dosen));
        Storage::disk('public')->put($dokumen->path, 'isi pdf');

        $this->artisan('kp:pindahkan-dokumen-privat')->assertExitCode(0);

        Storage::disk('local')->assertExists($dokumen->path);
        Storage::disk('public')->assertMissing($dokumen->path);
        $this->assertSame('isi pdf', Storage::disk('local')->get($dokumen->path));
        $this->assertSame($dokumen->path, $dokumen->fresh()->path);
    }

    public function test_command_dry_run_tidak_mengubah_apa_pun(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $dokumen = $this->dokumenPendaftaran($this->makePendaftaran($mahasiswa, $dosen));
        Storage::disk('public')->put($dokumen->path, 'isi pdf');

        $this->artisan('kp:pindahkan-dokumen-privat', ['--dry-run' => true])->assertExitCode(0);

        Storage::disk('public')->assertExists($dokumen->path);
        Storage::disk('local')->assertMissing($dokumen->path);
    }

    public function test_command_aman_dijalankan_ulang_dan_tidak_gagal_karena_file_hilang(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);

        $sudahPrivat = $this->dokumenPendaftaran($pendaftaran, 'krs');
        Storage::disk('local')->put($sudahPrivat->path, 'isi pdf');

        $this->dokumenPendaftaran($pendaftaran, 'transkrip'); // file tidak ada di mana pun

        $this->artisan('kp:pindahkan-dokumen-privat')->assertExitCode(0);
        $this->artisan('kp:pindahkan-dokumen-privat')->assertExitCode(0);

        $this->assertSame('isi pdf', Storage::disk('local')->get($sudahPrivat->path));
    }

    public function test_command_tidak_menghapus_file_publik_jika_salinan_privat_berbeda(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $dokumen = $this->dokumenPendaftaran($this->makePendaftaran($mahasiswa, $dosen));

        Storage::disk('public')->put($dokumen->path, 'versi publik yang panjang');
        Storage::disk('local')->put($dokumen->path, 'pendek');

        $this->artisan('kp:pindahkan-dokumen-privat')->assertExitCode(1);

        Storage::disk('public')->assertExists($dokumen->path);
    }

    public function test_dokumen_lama_tetap_bisa_diunduh_lewat_endpoint_setelah_dipindahkan(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $dokumen = $this->dokumenPendaftaran($this->makePendaftaran($mahasiswa, $dosen));
        Storage::disk('public')->put($dokumen->path, 'isi pdf');

        $this->artisan('kp:pindahkan-dokumen-privat')->assertExitCode(0);

        foreach ([$staff, $mahasiswa, $dosen] as $user) {
            Sanctum::actingAs($user);

            $this->get("/api/kp/dokumen/{$dokumen->id}/download", ['Accept' => 'application/json'])
                ->assertOk();
        }
    }
}
