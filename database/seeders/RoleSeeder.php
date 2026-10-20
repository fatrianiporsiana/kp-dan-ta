<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public const ROLES = [
        'mahasiswa',
        'dosen',
        'staff',
        'sekprodi',
        'kaprodi',
    ];

    /**
     * Aman dijalankan berulang kali (tidak membuat duplikat).
     */
    public function run(): void
    {
        foreach (self::ROLES as $name) {
            Role::firstOrCreate(['name' => $name]);
        }
    }
}
