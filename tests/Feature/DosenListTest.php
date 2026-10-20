<?php

namespace Tests\Feature;

use App\Models\Dosen;
use App\Models\Mahasiswa;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DosenListTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function makeUser(string $role, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->roles()->attach(Role::where('name', $role)->value('id'));

        if ($role === 'dosen') {
            Dosen::create(['user_id' => $user->id]);
        }

        if ($role === 'mahasiswa') {
            Mahasiswa::create(['user_id' => $user->id]);
        }

        return $user;
    }

    public function test_tanpa_token_ditolak(): void
    {
        $this->getJson('/api/dosen')->assertUnauthorized();
    }

    public function test_dosen_tidak_boleh_mengakses_daftar_dosen(): void
    {
        Sanctum::actingAs($this->makeUser('dosen'));

        $this->getJson('/api/dosen')->assertForbidden();
    }

    public function test_mahasiswa_melihat_dosen_aktif_urut_nama_tanpa_data_beban(): void
    {
        $this->makeUser('dosen', ['name' => 'Budi Dosen']);
        $this->makeUser('dosen', ['name' => 'Andi Dosen']);
        $this->makeUser('dosen', ['name' => 'Nonaktif Dosen', 'is_active' => false]);

        Sanctum::actingAs($this->makeUser('mahasiswa'));

        $response = $this->getJson('/api/dosen')->assertOk();

        $response->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Andi Dosen')
            ->assertJsonPath('data.1.name', 'Budi Dosen')
            ->assertJsonMissingPath('data.0.jumlah_bimbingan_kp');
    }

    public function test_staff_melihat_jumlah_bimbingan_kp(): void
    {
        $this->makeUser('dosen', ['name' => 'Andi Dosen']);

        Sanctum::actingAs($this->makeUser('staff'));

        $this->getJson('/api/dosen')
            ->assertOk()
            ->assertJsonPath('data.0.jumlah_bimbingan_kp', 0);
    }

    public function test_pencarian_berdasarkan_nama_atau_nomor_induk(): void
    {
        $this->makeUser('dosen', ['name' => 'Andi Dosen', 'nomor_induk' => '1111']);
        $this->makeUser('dosen', ['name' => 'Budi Dosen', 'nomor_induk' => '2222']);

        Sanctum::actingAs($this->makeUser('mahasiswa'));

        $this->getJson('/api/dosen?q=budi')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Budi Dosen');

        $this->getJson('/api/dosen?q=1111')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Andi Dosen');
    }
}
