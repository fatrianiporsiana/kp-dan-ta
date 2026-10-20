<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AuthRegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_tanpa_field_role_berhasil_dan_user_belum_punya_role(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Budi',
            'nomor_induk' => '2210099',
            'email' => 'budi@example.com',
            'password' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.roles', []);

        $user = User::where('email', 'budi@example.com')->firstOrFail();
        $this->assertSame([], $user->roleNames());
    }

    public function test_field_role_dari_request_diabaikan(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Nakal',
            'nomor_induk' => '2210100',
            'email' => 'nakal@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ])->assertCreated()
            ->assertJsonPath('data.user.roles', []);
    }

    public function test_kolom_role_lama_sudah_dihapus_dari_tabel_users(): void
    {
        $this->assertFalse(Schema::hasColumn('users', 'role'));
    }
}
