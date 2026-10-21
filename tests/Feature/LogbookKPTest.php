<?php

namespace Tests\Feature;

use App\Models\Dosen;
use App\Models\LogbookKP;
use App\Models\Mahasiswa;
use App\Models\PendaftaranKP;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LogbookKPTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    /* ---------- helper ---------- */

    private function makeUser(string $role): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', $role)->value('id'));

        if ($role === 'dosen') {
            Dosen::create(['user_id' => $user->id]);
        }

        if ($role === 'mahasiswa') {
            Mahasiswa::create(['user_id' => $user->id]);
        }

        return $user->fresh();
    }

    private function makePendaftaran(
        User $mahasiswaUser,
        User $dosenUser,
        string $status = 'APPROVED',
        bool $denganPembimbing = true
    ): PendaftaranKP {
        $pendaftaran = PendaftaranKP::create([
            'mahasiswa_id' => $mahasiswaUser->mahasiswa->id,
            'dosen_usulan_1_id' => $dosenUser->dosen->id,
            'alamat' => 'Jl. Contoh No. 1',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2004-05-10',
            'email_widyatama' => 'mhs@widyatama.ac.id',
            'nomor_telepon' => '08123456789',
            'ipk' => 3.5,
            'judul_kp' => 'Judul KP Contoh',
            'nama_perusahaan' => 'PT Contoh',
            'bidang_usaha' => 'IT',
            'alamat_perusahaan' => 'Jl. PT No. 2',
            'kota' => 'Bandung',
            'kontak_perusahaan' => '022123456',
            'pembimbing_lapangan' => 'Pak PIC',
            'status' => $status,
            'submitted_at' => now(),
        ]);

        if ($denganPembimbing) {
            $pendaftaran->pembimbing()->create([
                'dosen_id' => $dosenUser->dosen->id,
            ]);
        }

        return $pendaftaran;
    }

    private function entry(array $override = []): array
    {
        return array_merge([
            'tanggal' => now()->toDateString(),
            'bidang_kerja' => 'Backend',
            'deskripsi_kegiatan' => 'Membuat API pendaftaran',
            'proses_penyelesaian' => 'Diskusi dengan PIC',
            'luaran_hasil' => 'Endpoint berjalan',
            'nama_pic' => 'Pak PIC',
        ], $override);
    }

    private function makeLogbook(
        PendaftaranKP $pendaftaran,
        string $status = 'PENDING'
    ): LogbookKP {
        return $pendaftaran->logbook()->create($this->entry() + [
            'status' => $status,
        ]);
    }

    /* ---------- mahasiswa ---------- */

    public function test_mahasiswa_tanpa_pendaftaran_disetujui_tidak_bisa_mengisi_logbook(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswa, $dosen, 'PENDING');

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/kp/logbook', $this->entry())->assertStatus(409);
    }

    public function test_mahasiswa_tanpa_pembimbing_tidak_bisa_mengisi_logbook(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswa, $dosen, 'APPROVED', false);

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/kp/logbook', $this->entry())->assertStatus(409);
    }

    public function test_mahasiswa_bisa_menambah_logbook_dengan_status_pending(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/kp/logbook', $this->entry())
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.bidang_kerja', 'Backend');

        $this->assertSame(1, $pendaftaran->logbook()->count());
    }

    public function test_validasi_logbook(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswa, $dosen);

        Sanctum::actingAs($mahasiswa);

        $this->postJson('/api/kp/logbook', [])->assertStatus(422);

        $this->postJson('/api/kp/logbook', $this->entry([
            'tanggal' => now()->addDay()->toDateString(),
        ]))->assertStatus(422)->assertJsonValidationErrors('tanggal');
    }

    public function test_mahasiswa_hanya_melihat_logbook_miliknya(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswaA = $this->makeUser('mahasiswa');
        $mahasiswaB = $this->makeUser('mahasiswa');
        $pendaftaranA = $this->makePendaftaran($mahasiswaA, $dosen);
        $pendaftaranB = $this->makePendaftaran($mahasiswaB, $dosen);

        $this->makeLogbook($pendaftaranA);
        $this->makeLogbook($pendaftaranA);
        $this->makeLogbook($pendaftaranB);

        Sanctum::actingAs($mahasiswaA);

        $this->getJson('/api/kp/logbook')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_mahasiswa_tidak_bisa_mengubah_logbook_milik_orang_lain(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswaA = $this->makeUser('mahasiswa');
        $mahasiswaB = $this->makeUser('mahasiswa');
        $this->makePendaftaran($mahasiswaA, $dosen);
        $pendaftaranB = $this->makePendaftaran($mahasiswaB, $dosen);
        $logbookB = $this->makeLogbook($pendaftaranB);

        Sanctum::actingAs($mahasiswaA);

        $this->putJson("/api/kp/logbook/{$logbookB->id}", $this->entry())
            ->assertForbidden();

        $this->deleteJson("/api/kp/logbook/{$logbookB->id}")
            ->assertForbidden();
    }

    public function test_logbook_rejected_bisa_diubah_dan_kembali_pending(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $logbook = $this->makeLogbook($pendaftaran, 'REJECTED');
        $logbook->update(['catatan' => 'Kurang jelas']);

        Sanctum::actingAs($mahasiswa);

        $this->putJson("/api/kp/logbook/{$logbook->id}", $this->entry([
            'deskripsi_kegiatan' => 'Deskripsi diperbaiki',
        ]))
            ->assertOk()
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.catatan', null)
            ->assertJsonPath('data.deskripsi_kegiatan', 'Deskripsi diperbaiki');
    }

    public function test_logbook_approved_tidak_bisa_diubah_atau_dihapus(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $logbook = $this->makeLogbook($pendaftaran, 'APPROVED');

        Sanctum::actingAs($mahasiswa);

        $this->putJson("/api/kp/logbook/{$logbook->id}", $this->entry())
            ->assertStatus(409);

        $this->deleteJson("/api/kp/logbook/{$logbook->id}")
            ->assertStatus(409);

        $this->assertDatabaseHas('logbook_kps', ['id' => $logbook->id]);
    }

    public function test_logbook_pending_bisa_dihapus(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $logbook = $this->makeLogbook($pendaftaran);

        Sanctum::actingAs($mahasiswa);

        $this->deleteJson("/api/kp/logbook/{$logbook->id}")->assertOk();

        $this->assertDatabaseMissing('logbook_kps', ['id' => $logbook->id]);
    }

    /* ---------- dosen pembimbing ---------- */

    public function test_dosen_pembimbing_melihat_logbook_dengan_filter_status(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);

        $this->makeLogbook($pendaftaran, 'PENDING');
        $this->makeLogbook($pendaftaran, 'APPROVED');

        Sanctum::actingAs($dosen);

        $this->getJson("/api/kp/dosen/mahasiswa/{$pendaftaran->id}/logbook")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/kp/dosen/mahasiswa/{$pendaftaran->id}/logbook?status=PENDING")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'PENDING');
    }

    public function test_dosen_lain_tidak_bisa_melihat_atau_memverifikasi_logbook(): void
    {
        $dosenPembimbing = $this->makeUser('dosen');
        $dosenLain = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosenPembimbing);
        $logbook = $this->makeLogbook($pendaftaran);

        Sanctum::actingAs($dosenLain);

        $this->getJson("/api/kp/dosen/mahasiswa/{$pendaftaran->id}/logbook")
            ->assertForbidden();

        $this->patchJson("/api/kp/dosen/logbook/{$logbook->id}/approve")
            ->assertForbidden();
    }

    public function test_dosen_pembimbing_bisa_menyetujui_logbook(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $logbook = $this->makeLogbook($pendaftaran);

        Sanctum::actingAs($dosen);

        $this->patchJson("/api/kp/dosen/logbook/{$logbook->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');

        $this->assertNotNull($logbook->fresh()->verified_at);

        // sudah diverifikasi, tidak boleh diverifikasi lagi
        $this->patchJson("/api/kp/dosen/logbook/{$logbook->id}/approve")
            ->assertStatus(409);
    }

    public function test_menolak_logbook_wajib_menyertakan_catatan(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $logbook = $this->makeLogbook($pendaftaran);

        Sanctum::actingAs($dosen);

        $this->patchJson("/api/kp/dosen/logbook/{$logbook->id}/reject", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('catatan');

        $this->patchJson("/api/kp/dosen/logbook/{$logbook->id}/reject", [
            'catatan' => 'Tolong lengkapi luaran.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'REJECTED')
            ->assertJsonPath('data.catatan', 'Tolong lengkapi luaran.');
    }

    /* ---------- staff ---------- */

    public function test_staff_bisa_melihat_logbook_tetapi_mahasiswa_tidak(): void
    {
        $dosen = $this->makeUser('dosen');
        $mahasiswa = $this->makeUser('mahasiswa');
        $staff = $this->makeUser('staff');
        $pendaftaran = $this->makePendaftaran($mahasiswa, $dosen);
        $this->makeLogbook($pendaftaran);

        Sanctum::actingAs($staff);

        $this->getJson("/api/kp/staff/pendaftaran/{$pendaftaran->id}/logbook")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        Sanctum::actingAs($mahasiswa);

        $this->getJson("/api/kp/staff/pendaftaran/{$pendaftaran->id}/logbook")
            ->assertForbidden();
    }
}
