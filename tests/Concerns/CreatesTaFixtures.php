<?php

namespace Tests\Concerns;

use App\Models\PendaftaranTA;
use App\Models\User;

/**
 * Helper pembuatan data pendaftaran TA untuk test.
 * Dipakai bersama CreatesKpFixtures (untuk makeUser) dan setelah RoleSeeder dijalankan.
 */
trait CreatesTaFixtures
{
    private function makeTa(
        User $mahasiswa,
        User $dosen1,
        User $dosen2,
        string $status = 'APPROVED',
        string $konsentrasi = 'reg_a'
    ): PendaftaranTA {
        return PendaftaranTA::create([
            'mahasiswa_id' => $mahasiswa->mahasiswa->id,
            'jalur' => 'skripsi',
            'konsentrasi' => $konsentrasi,
            'alamat' => 'Jl. Contoh No. 1',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2003-05-10',
            'email_widyatama' => 'mhs@widyatama.ac.id',
            'nomor_telepon' => '08123456789',
            'ipk' => 3.5,
            'skor_toefl' => 480,
            'judul_ta' => 'Judul TA Contoh',
            'dosen_usulan_1_id' => $dosen1->dosen->id,
            'dosen_usulan_2_id' => $dosen2->dosen->id,
            'status' => $status,
            'submitted_at' => $status === 'DRAFT' ? null : now(),
        ]);
    }

    private function tambahPembimbingTa(PendaftaranTA $ta, User $utama, User $co): void
    {
        $ta->pembimbing()->create(['dosen_id' => $utama->dosen->id, 'peran' => 'utama']);
        $ta->pembimbing()->create(['dosen_id' => $co->dosen->id, 'peran' => 'co']);
    }
}
