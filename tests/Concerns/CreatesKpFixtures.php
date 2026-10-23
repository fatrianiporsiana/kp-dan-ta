<?php

namespace Tests\Concerns;

use App\Models\Dosen;
use App\Models\Mahasiswa;
use App\Models\PendaftaranKP;
use App\Models\Role;
use App\Models\User;

/**
 * Helper pembuatan data untuk test modul KP.
 * Pastikan RoleSeeder sudah dijalankan di setUp() test yang memakainya.
 */
trait CreatesKpFixtures
{
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
}
