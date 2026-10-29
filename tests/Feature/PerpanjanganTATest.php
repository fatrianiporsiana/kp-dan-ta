<?php

namespace Tests\Feature;

use App\Models\DokumenKP;
use App\Models\PendaftaranTA;
use App\Models\PerpanjanganTA;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesKpFixtures;
use Tests\Concerns\CreatesTaFixtures;
use Tests\TestCase;

class PerpanjanganTATest extends TestCase
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
    private function skenario(): array
    {
        $mahasiswa = $this->makeUser('mahasiswa');
        $utama = $this->makeUser('dosen');
        $co = $this->makeUser('dosen');

        $ta = $this->makeTa($mahasiswa, $utama, $co, 'APPROVED');
        $this->tambahPembimbingTa($ta, $utama, $co);

        return [$mahasiswa, $utama, $co, $ta];
    }

    private function form(array $override = []): array
    {
        return array_merge([
            'alasan' => 'Penelitian belum selesai.',
            'durasi_bulan' => 3,
        ], $override);
    }

    private function buatPerpanjangan(PendaftaranTA $ta, string $status = 'DRAFT'): PerpanjanganTA
    {
        return $ta->perpanjangan()->create($this->form() + [
            'status' => $status,
            'submitted_at' => $status === 'DRAFT' ? null : now(),
        ]);
    }

    private function scan(): UploadedFile
    {
        return UploadedFile::fake()->create('scan.pdf', 100, 'application/pdf');
    }

    private function unggah(PerpanjanganTA $perpanjangan, ?UploadedFile $file = null)
    {
        return $this->post(
            "/api/ta/perpanjangan/{$perpanjangan->id}/dokumen",
            ['file' => $file ?? $this->scan()],
            ['Accept' => 'application/json']
        );
    }

    /* ---------- mahasiswa: membuat & mengubah ---------- */

    public function test_tanpa_ta_disetujui_dan_pembimbing_tidak_bisa_mengajukan(): void
    {
        $dosen1 = $this->makeUser('dosen');
        $dosen2 = $this->makeUser('dosen');

        // TA disetujui tetapi belum ada pembimbing
        $mahasiswa = $this->makeUser('mahasiswa');
        $this->makeTa($mahasiswa, $dosen1, $dosen2, 'APPROVED');

        Sanctum::actingAs($mahasiswa);
        $this->postJson('/api/ta/perpanjangan', $this->form())->assertStatus(409);

        // TA belum disetujui
        $lain = $this->makeUser('mahasiswa');
        $this->makeTa($lain, $dosen1, $dosen2, 'PENDING');

        Sanctum::actingAs($lain);
        $this->postJson('/api/ta/perpanjangan', $this->form())->assertStatus(409);
    }

    public function test_index_mahasiswa_tanpa_ta_disetujui_mengembalikan_daftar_kosong(): void
    {
        Sanctum::actingAs($this->makeUser('mahasiswa'));

        $this->getJson('/api/ta/perpanjangan')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_mahasiswa_bisa_membuat_pengajuan_berstatus_draft(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/perpanjangan', $this->form())
            ->assertCreated()
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.durasi_bulan', 3);

        $this->assertSame(1, $ta->perpanjangan()->count());

        $this->getJson('/api/ta/perpanjangan')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_validasi_form_perpanjangan_ta(): void
    {
        [$mahasiswa] = $this->skenario();

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/perpanjangan', [])->assertStatus(422);

        $this->postJson('/api/ta/perpanjangan', $this->form(['durasi_bulan' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors('durasi_bulan');

        $this->postJson('/api/ta/perpanjangan', $this->form(['durasi_bulan' => 13]))
            ->assertStatus(422)->assertJsonValidationErrors('durasi_bulan');
    }

    public function test_tidak_bisa_membuat_pengajuan_baru_selama_ada_yang_belum_selesai_tetapi_boleh_setelah_ditolak(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $perpanjangan = $this->buatPerpanjangan($ta, 'DRAFT');

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/ta/perpanjangan', $this->form())->assertStatus(409);

        $perpanjangan->update(['status' => 'PENDING']);
        $this->postJson('/api/ta/perpanjangan', $this->form())->assertStatus(409);

        $perpanjangan->update(['status' => 'REJECTED']);
        $this->postJson('/api/ta/perpanjangan', $this->form())->assertCreated();
    }

    public function test_draft_bisa_diubah_dan_dibatalkan_tetapi_pending_tidak(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $perpanjangan = $this->buatPerpanjangan($ta);

        Sanctum::actingAs($mahasiswa);

        $this->putJson("/api/ta/perpanjangan/{$perpanjangan->id}", $this->form(['durasi_bulan' => 4]))
            ->assertOk()
            ->assertJsonPath('data.durasi_bulan', 4);

        $perpanjangan->update(['status' => 'PENDING']);

        $this->putJson("/api/ta/perpanjangan/{$perpanjangan->id}", $this->form())->assertStatus(409);
        $this->deleteJson("/api/ta/perpanjangan/{$perpanjangan->id}")->assertStatus(409);

        $perpanjangan->update(['status' => 'DRAFT']);

        $this->deleteJson("/api/ta/perpanjangan/{$perpanjangan->id}")->assertOk();
        $this->assertDatabaseMissing('perpanjangan_tas', ['id' => $perpanjangan->id]);
    }

    public function test_mahasiswa_lain_tidak_bisa_mengubah_menghapus_atau_mengunggah(): void
    {
        [, , , $ta] = $this->skenario();
        $perpanjangan = $this->buatPerpanjangan($ta);
        $lain = $this->makeUser('mahasiswa');

        Sanctum::actingAs($lain);

        $this->putJson("/api/ta/perpanjangan/{$perpanjangan->id}", $this->form())->assertForbidden();
        $this->deleteJson("/api/ta/perpanjangan/{$perpanjangan->id}")->assertForbidden();
        $this->unggah($perpanjangan)->assertForbidden();
    }

    /* ---------- mahasiswa: unggah scan ---------- */

    public function test_unggah_scan_mengubah_status_menjadi_pending_dan_menyimpan_file_privat(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $perpanjangan = $this->buatPerpanjangan($ta);

        Sanctum::actingAs($mahasiswa);

        $this->unggah($perpanjangan)
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonCount(1, 'data.dokumen')
            ->assertJsonMissingPath('data.dokumen.0.path');

        $perpanjangan->refresh();
        $this->assertNotNull($perpanjangan->submitted_at);

        $dokumen = $perpanjangan->dokumen()->firstOrFail();
        $this->assertSame('scan_perpanjangan', $dokumen->jenis);
        Storage::disk('local')->assertExists($dokumen->path);
    }

    public function test_mengganti_scan_saat_pending_menghapus_file_lama(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $perpanjangan = $this->buatPerpanjangan($ta);

        Sanctum::actingAs($mahasiswa);

        $this->unggah($perpanjangan)->assertOk();
        $pathLama = $perpanjangan->dokumen()->firstOrFail()->path;

        $this->unggah($perpanjangan)->assertOk();

        $this->assertSame(1, $perpanjangan->dokumen()->count());
        Storage::disk('local')->assertMissing($pathLama);
    }

    public function test_unggah_scan_menolak_bukan_pdf_dan_pengajuan_yang_sudah_diproses(): void
    {
        [$mahasiswa, , , $ta] = $this->skenario();
        $perpanjangan = $this->buatPerpanjangan($ta);

        Sanctum::actingAs($mahasiswa);

        $this->unggah($perpanjangan, UploadedFile::fake()->create('foto.png', 100, 'image/png'))
            ->assertStatus(422)->assertJsonValidationErrors('file');

        $perpanjangan->update(['status' => 'APPROVED']);

        $this->unggah($perpanjangan)->assertStatus(409);
    }

    /* ---------- dosen pembimbing ---------- */

    public function test_dosen_utama_dan_co_bisa_melihat_tetapi_dosen_lain_tidak(): void
    {
        [, $utama, $co, $ta] = $this->skenario();
        $lain = $this->makeUser('dosen');
        $this->buatPerpanjangan($ta, 'DRAFT');

        foreach ([$utama, $co] as $dosen) {
            Sanctum::actingAs($dosen);

            $this->getJson("/api/ta/dosen/mahasiswa/{$ta->id}/perpanjangan")
                ->assertOk()
                ->assertJsonCount(1, 'data');
        }

        Sanctum::actingAs($lain);

        $this->getJson("/api/ta/dosen/mahasiswa/{$ta->id}/perpanjangan")->assertForbidden();
    }

    /* ---------- staff ---------- */

    public function test_staff_hanya_melihat_pengajuan_yang_sudah_dikirim_beserta_data_mahasiswa(): void
    {
        [$mahasiswa, $utama, $co, $ta] = $this->skenario();
        $staff = $this->makeUser('staff');

        $this->buatPerpanjangan($ta, 'REJECTED');
        $dikirim = $this->buatPerpanjangan($ta, 'PENDING');
        $this->buatPerpanjangan($ta, 'DRAFT');

        Sanctum::actingAs($staff);

        $this->getJson('/api/ta/staff/perpanjangan')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/ta/staff/perpanjangan?status=PENDING')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $dikirim->id)
            ->assertJsonPath('data.0.pendaftaran.judul_ta', 'Judul TA Contoh')
            ->assertJsonPath('data.0.pendaftaran.mahasiswa.name', $mahasiswa->name);

        $this->getJson('/api/ta/staff/perpanjangan?status=APPROVED')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_mahasiswa_dan_dosen_tidak_bisa_mengakses_endpoint_staff(): void
    {
        [$mahasiswa, $utama, , $ta] = $this->skenario();
        $perpanjangan = $this->buatPerpanjangan($ta, 'PENDING');

        foreach ([$mahasiswa, $utama] as $user) {
            Sanctum::actingAs($user);

            $this->getJson('/api/ta/staff/perpanjangan')->assertForbidden();
            $this->patchJson("/api/ta/staff/perpanjangan/{$perpanjangan->id}/approve")->assertForbidden();
        }
    }

    public function test_staff_menyetujui_pengajuan_pending_dan_tidak_bisa_memproses_draft(): void
    {
        [, , , $ta] = $this->skenario();
        $staff = $this->makeUser('staff');
        $pending = $this->buatPerpanjangan($ta, 'PENDING');
        $draft = $this->buatPerpanjangan($ta, 'DRAFT');

        Sanctum::actingAs($staff);

        $this->patchJson("/api/ta/staff/perpanjangan/{$pending->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');

        $this->patchJson("/api/ta/staff/perpanjangan/{$pending->id}/approve")->assertStatus(409);
        $this->patchJson("/api/ta/staff/perpanjangan/{$draft->id}/approve")->assertStatus(409);
    }

    public function test_menolak_perpanjangan_wajib_menyertakan_catatan(): void
    {
        [, , , $ta] = $this->skenario();
        $staff = $this->makeUser('staff');
        $perpanjangan = $this->buatPerpanjangan($ta, 'PENDING');

        Sanctum::actingAs($staff);

        $this->patchJson("/api/ta/staff/perpanjangan/{$perpanjangan->id}/reject", [])
            ->assertStatus(422)->assertJsonValidationErrors('catatan');

        $this->patchJson("/api/ta/staff/perpanjangan/{$perpanjangan->id}/reject", [
            'catatan' => 'Tanda tangan belum ada.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'REJECTED')
            ->assertJsonPath('data.catatan', 'Tanda tangan belum ada.');
    }

    /* ---------- download ---------- */

    public function test_scan_perpanjangan_ta_bisa_diunduh_pemilik_pembimbing_dan_staff_tetapi_tidak_orang_lain(): void
    {
        [$mahasiswa, $utama, $co, $ta] = $this->skenario();
        $staff = $this->makeUser('staff');
        $mahasiswaLain = $this->makeUser('mahasiswa');
        $dosenLain = $this->makeUser('dosen');

        $perpanjangan = $this->buatPerpanjangan($ta, 'PENDING');
        $path = "dokumen-kp/ta/perpanjangan/{$perpanjangan->id}/scan.pdf";
        Storage::disk('local')->put($path, 'isi pdf');
        $dokumen = $perpanjangan->dokumen()->create([
            'jenis' => 'scan_perpanjangan',
            'nama_file' => 'scan.pdf',
            'path' => $path,
            'ukuran' => 7,
            'mime_type' => 'application/pdf',
        ]);

        foreach ([$mahasiswa, $utama, $co, $staff] as $user) {
            Sanctum::actingAs($user);

            $this->get("/api/kp/dokumen/{$dokumen->id}/download", ['Accept' => 'application/json'])
                ->assertOk();
        }

        foreach ([$mahasiswaLain, $dosenLain] as $user) {
            Sanctum::actingAs($user);

            $this->getJson("/api/kp/dokumen/{$dokumen->id}/download")->assertForbidden();
        }

        $this->assertSame(1, DokumenKP::count());
    }
}
