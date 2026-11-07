<?php

namespace Database\Seeders;

use App\Models\Dosen;
use App\Models\Mahasiswa;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Role wajib ada di semua environment.
        $this->call(RoleSeeder::class);

        // Akun contoh hanya untuk development/testing, jangan pernah dibuat di production.
        if (app()->environment('production')) {
            return;
        }

        $this->seedAccount(
            name: 'Test User',
            email: 'user@user.com',
            nomorInduk: '2210001',
            password: 'user123',
            roles: ['mahasiswa'],
        );

        $this->seedAccount(
            name: 'Test User 2',
            email: 'user2@user2.com',
            nomorInduk: '2210002',
            password: 'user123',
            roles: ['mahasiswa'],
        );

        $this->seedAccount(
            name: 'Test Dosen',
            email: 'dosen@dosen.com',
            nomorInduk: '1980001',
            password: 'dosen123',
            roles: ['dosen'],
        );

        $this->seedAccount(
            name: 'Test Dosen 2',
            email: 'dosen2@dosen2.com',
            nomorInduk: '1980002',
            password: 'dosen123',
            roles: ['dosen'],
        );

        $this->seedAccount(
            name: 'Test Dosen 3',
            email: 'tdosen3@tdosen3.com',
            nomorInduk: '1980003',
            password: 'dosen123',
            roles: ['dosen'],
        );

        $this->seedAccount(
            name: 'Test Dosen 4',
            email: 'dosen4@dosen4.com',
            nomorInduk: '1980004',
            password: 'dosen123',
            roles: ['dosen'],
        );

        $this->seedAccount(
            name: 'Test Dosen 5',
            email: 'dosen5@dosen5.com',
            nomorInduk: '1980005',
            password: 'dosen123',
            roles: ['dosen'],
        );

        $this->seedAccount(
            name: 'Test Dosen 6',
            email: 'dosen6@dosen6.com',
            nomorInduk: '1980006',
            password: 'dosen123',
            roles: ['dosen'],
        );

        // Staff, sekprodi, dan kaprodi punya akses penuh yang sama.
        $this->seedAccount(
            name: 'Test Admin',
            email: 'admin@admin.com',
            nomorInduk: '9000001',
            password: 'admin123',
            roles: ['staff', 'sekprodi', 'kaprodi'],
        );
    }

    /**
     * Membuat akun hanya jika emailnya belum ada, jadi akun yang sudah ada
     * (termasuk password-nya) tidak diubah saat seeder dijalankan ulang.
     */
    private function seedAccount(
        string $name,
        string $email,
        string $nomorInduk,
        string $password,
        array $roles,
    ): void {
        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'nomor_induk' => $nomorInduk,
                'password' => $password, // di-hash otomatis oleh cast 'hashed'
                'is_active' => true,
            ]
        );

        $roleIds = Role::whereIn('name', $roles)->pluck('id')->all();
        $user->roles()->syncWithoutDetaching($roleIds);

        if (in_array('mahasiswa', $roles, true)) {
            Mahasiswa::firstOrCreate(['user_id' => $user->id]);
        }

        if (in_array('dosen', $roles, true)) {
            Dosen::firstOrCreate(['user_id' => $user->id]);
        }
    }
}
