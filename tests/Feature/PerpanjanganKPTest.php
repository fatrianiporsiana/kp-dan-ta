<?php

namespace Tests\Feature;

use App\Models\DokumenKP;
use App\Models\PendaftaranKP;
use App\Models\PerpanjanganKP;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesKpFixtures;
use Tests\TestCase;

class PerpanjanganKPTest extends TestCase
{
    use RefreshDatabase;
    use CreatesKpFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        Storage::fake('local');
    }

    private function form(array $override = []): array
    {
        return array_merge([
            'alasan' => 'Proyek di perusahaan belum selesai.',
            'durasi_bulan' => 2,
        ], $override);
    }

    private function makePerpanjangan(
        PendaftaranKP $pendaftaran,
        string $status = 'DRAFT'
    ): PerpanjanganKP {
        return $pendaftaran->perpanjangan()->create($this->form() + [
            'status' => $status,
            'submitted_at' => $status === 'DRAFT' ? null : now(),
        ]);
    }

    private function scan(): UploadedFile
    {
        return UploadedFile::fake()->create('scan.pdf', 100, 'application/pdf');
    }

    /* ---------- mahasiswa: membuat & mengubah ---------- */

    public function test_tanpa_pembimbing_tidak_bisa_mengajukan_perpanjangan(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswa, $dosen, 'APPROVED', false);

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/kp/perpanjangan', $this->form())->assertStatus(409);
    }

    public function test_mahasiswa_bisa_membuat_pengajuan_berstatus_draft(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/kp/perpanjangan', $this->form())
            ->assertCreated()
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.durasi_bulan', 2);

        $this->assertSame(1, $pendaftaran->perpanjangan()->count());
    }

    public function test_validasi_form_perpanjangan(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswa, $dosen);

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/kp/perpanjangan', [])->assertStatus(422);

        $this->postJson('/api/kp/perpanjangan', $this->form(['durasi_bulan' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors('durasi_bulan');

        $this->postJson('/api/kp/perpanjangan', $this->form(['durasi_bulan' => 13]))
            ->assertStatus(422)->assertJsonValidationErrors('durasi_bulan');
    }

    public function test_tidak_bisa_membuat_pengajuan_baru_selama_ada_yang_belum_selesai(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $this->makePerpanjangan($pendaftaran, 'DRAFT');

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/kp/perpanjangan', $this->form())->assertStatus(409);
    }

    public function test_setelah_ditolak_mahasiswa_boleh_mengajukan_lagi(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $this->makePerpanjangan($pendaftaran, 'REJECTED');

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/kp/perpanjangan', $this->form())->assertCreated();
    }

    public function test_draft_bisa_diubah_dan_dibatalkan_tetapi_pending_tidak(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $draft = $this->makePerpanjangan($pendaftaran, 'DRAFT');

        Sanctum::actingAs($mahasiswa);

        $this->putJson("/api/kp/perpanjangan/{$draft->id}", $this->form(['durasi_bulan' => 3]))
            ->assertOk()
            ->assertJsonPath('data.durasi_bulan', 3);

        $draft->update(['status' => 'PENDING']);

        $this->putJson("/api/kp/perpanjangan/{$draft->id}", $this->form())->assertStatus(409);
        $this->deleteJson("/api/kp/perpanjangan/{$draft->id}")->assertStatus(409);

        $draft->update(['status' => 'DRAFT']);

        $this->deleteJson("/api/kp/perpanjangan/{$draft->id}")->assertOk();
        $this->assertDatabaseMissing('perpanjangan_kps', ['id' => $draft->id]);
    }

    public function test_mahasiswa_lain_tidak_bisa_mengubah_atau_mengunggah(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswaA = $this->makeUser('mahasiswa');
        $mahasiswaB = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswaA, $dosen);
        $pendaftaranB = $this->makePendaftaran($mahasiswaB, $dosen);
        $milikB = $this->makePerpanjangan($pendaftaranB);

        Sanctum::actingAs($mahasiswaA);

        $this->putJson("/api/kp/perpanjangan/{$milikB->id}", $this->form())->assertForbidden();
        $this->deleteJson("/api/kp/perpanjangan/{$milikB->id}")->assertForbidden();
        $this->post("/api/kp/perpanjangan/{$milikB->id}/dokumen", ['file' => $this->scan()], ['Accept' => 'application/json'])
            ->assertForbidden();
    }

    /* ---------- mahasiswa: unggah scan ---------- */

    public function test_unggah_scan_mengubah_status_menjadi_pending_dan_menyimpan_file_privat(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $perpanjangan = $this->makePerpanjangan($pendaftaran);

        Sanctum::actingAs($mahasiswa);

        $this->post("/api/kp/perpanjangan/{$perpanjangan->id}/dokumen", ['file' => $this->scan()], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonCount(1, 'data.dokumen')
            ->assertJsonMissingPath('data.dokumen.0.path');

        $perpanjangan->refresh();
        $this->assertNotNull($perpanjangan->submitted_at);

        $dokumen = $perpanjangan->dokumen()->first();
        $this->assertSame('scan_perpanjangan', $dokumen->jenis);
        Storage::disk('local')->assertExists($dokumen->path);
    }

    public function test_mengganti_scan_saat_pending_menghapus_file_lama(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $perpanjangan = $this->makePerpanjangan($pendaftaran);

        Sanctum::actingAs($mahasiswa);

        $url = "/api/kp/perpanjangan/{$perpanjangan->id}/dokumen";

        $this->post($url, ['file' => $this->scan()], ['Accept' => 'application/json'])->assertOk();
        $pathLama = $perpanjangan->dokumen()->first()->path;

        $this->post($url, ['file' => $this->scan()], ['Accept' => 'application/json'])->assertOk();

        $this->assertSame(1, $perpanjangan->dokumen()->count());
        Storage::disk('local')->assertMissing($pathLama);
    }

    public function test_unggah_scan_menolak_file_bukan_pdf_dan_pengajuan_yang_sudah_diproses(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $draft = $this->makePerpanjangan($pendaftaran);

        Sanctum::actingAs($mahasiswa);

        $this->post(
            "/api/kp/perpanjangan/{$draft->id}/dokumen",
            ['file' => UploadedFile::fake()->create('foto.png', 100, 'image/png')],
            ['Accept' => 'application/json']
        )->assertStatus(422)->assertJsonValidationErrors('file');

        $draft->update(['status' => 'APPROVED']);

        $this->post("/api/kp/perpanjangan/{$draft->id}/dokumen", ['file' => $this->scan()], ['Accept' => 'application/json'])
            ->assertStatus(409);
    }

    /* ---------- dosen pembimbing ---------- */

    public function test_dosen_pembimbing_bisa_melihat_tetapi_dosen_lain_tidak(): void
    {
        $dosen = $this->makeUser('dosen');
        $dosenLain = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $this->makePerpanjangan($pendaftaran, 'DRAFT');

        Sanctum::actingAs($dosen);

        $this->getJson("/api/kp/dosen/mahasiswa/{$pendaftaran->id}/perpanjangan")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        Sanctum::actingAs($dosenLain);

        $this->getJson("/api/kp/dosen/mahasiswa/{$pendaftaran->id}/perpanjangan")
            ->assertForbidden();
    }

    /* ---------- staff ---------- */

    public function test_staff_hanya_melihat_pengajuan_yang_sudah_dikirim(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswaA = $this->makeUser('mahasiswa');
        $mahasiswaB = $this->makeUser('mahasiswa');
        $this->makePerpanjangan($this->makePendaftaran($mahasiswaA, $dosen), 'DRAFT');
        $this->makePerpanjangan($this->makePendaftaran($mahasiswaB, $dosen), 'PENDING');

        Sanctum::actingAs($staff);

        $this->getJson('/api/kp/staff/perpanjangan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'PENDING')
            ->assertJsonPath('data.0.pendaftaran.mahasiswa.name', $mahasiswaB->name);

        $this->getJson('/api/kp/staff/perpanjangan?status=APPROVED')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_mahasiswa_tidak_bisa_mengakses_endpoint_staff(): void
    {
        $mahasiswa = $this->makeUser('mahasiswa');

        Sanctum::actingAs($mahasiswa);

        $this->getJson('/api/kp/staff/perpanjangan')->assertForbidden();
    }

    public function test_staff_bisa_menyetujui_pengajuan_pending(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $perpanjangan = $this->makePerpanjangan($this->makePendaftaran($mahasiswa, $dosen), 'PENDING');

        Sanctum::actingAs($staff);

        $this->patchJson("/api/kp/staff/perpanjangan/{$perpanjangan->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');

        $this->patchJson("/api/kp/staff/perpanjangan/{$perpanjangan->id}/approve")
            ->assertStatus(409);
    }

    public function test_staff_tidak_bisa_memproses_draft(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $draft = $this->makePerpanjangan($this->makePendaftaran($mahasiswa, $dosen), 'DRAFT');

        Sanctum::actingAs($staff);

        $this->patchJson("/api/kp/staff/perpanjangan/{$draft->id}/approve")->assertStatus(409);
    }

    public function test_menolak_perpanjangan_wajib_menyertakan_catatan(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $perpanjangan = $this->makePerpanjangan($this->makePendaftaran($mahasiswa, $dosen), 'PENDING');

        Sanctum::actingAs($staff);

        $this->patchJson("/api/kp/staff/perpanjangan/{$perpanjangan->id}/reject", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('catatan');

        $this->patchJson("/api/kp/staff/perpanjangan/{$perpanjangan->id}/reject", [
            'catatan' => 'Tanda tangan belum ada.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'REJECTED')
            ->assertJsonPath('data.catatan', 'Tanda tangan belum ada.');
    }

    /* ---------- download dokumen ---------- */

    private function makeDokumenPerpanjangan(PerpanjanganKP $perpanjangan, bool $adaFile = true): DokumenKP
    {
        $path = 'dokumen-kp/perpanjangan/' . $perpanjangan->id . '/scan.pdf';

        if ($adaFile) {
            Storage::disk('local')->put($path, 'isi pdf');
        }

        return $perpanjangan->dokumen()->create([
            'jenis' => 'scan_perpanjangan',
            'nama_file' => 'scan.pdf',
            'path' => $path,
            'ukuran' => 7,
            'mime_type' => 'application/pdf',
        ]);
    }

    public function test_pemilik_pembimbing_dan_staff_bisa_mengunduh_dokumen(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $perpanjangan = $this->makePerpanjangan($this->makePendaftaran($mahasiswa, $dosen), 'PENDING');
        $dokumen = $this->makeDokumenPerpanjangan($perpanjangan);

        foreach ([$mahasiswa, $dosen, $staff] as $user) {
            Sanctum::actingAs($user);

            $this->get("/api/kp/dokumen/{$dokumen->id}/download", ['Accept' => 'application/json'])
                ->assertOk();
        }
    }

    public function test_mahasiswa_dan_dosen_lain_tidak_bisa_mengunduh_dokumen(): void
    {
        $dosen = $this->makeUser('dosen');
        $dosenLain = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $mahasiswaLain = $this->makeUser('mahasiswa');
        $perpanjangan = $this->makePerpanjangan($this->makePendaftaran($mahasiswa, $dosen), 'PENDING');
        $dokumen = $this->makeDokumenPerpanjangan($perpanjangan);

        foreach ([$mahasiswaLain, $dosenLain] as $user) {
            Sanctum::actingAs($user);

            $this->getJson("/api/kp/dokumen/{$dokumen->id}/download")->assertForbidden();
        }
    }

    public function test_unduh_tanpa_login_ditolak_dan_file_hilang_menghasilkan_404(): void
    {
        $dosen = $this->makeUser('dosen');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');
        $perpanjangan = $this->makePerpanjangan($this->makePendaftaran($mahasiswa, $dosen), 'PENDING');
        $dokumen = $this->makeDokumenPerpanjangan($perpanjangan, false);

        $this->getJson("/api/kp/dokumen/{$dokumen->id}/download")->assertUnauthorized();

        Sanctum::actingAs($staff);

        $this->getJson("/api/kp/dokumen/{$dokumen->id}/download")->assertNotFound();
    }
}
