<?php

namespace App\Support;

use App\Models\JadwalSidangTA;

/**
 * Mencari jadwal sidang yang beririsan waktu dengan jadwal yang diusulkan.
 *
 * Bentrok dicatat untuk:
 *  - ruang yang sama pada waktu yang beririsan, dan
 *  - dosen penguji yang sudah menguji sidang lain pada waktu yang beririsan.
 *
 * Dua jadwal beririsan jika mulai_A < selesai_B dan selesai_A > mulai_B
 * (jadwal yang berurutan, selesai 10:30 lalu mulai 10:30, tidak dianggap bentrok).
 */
final class BentrokJadwalSidang
{
    /**
     * @param  string  $tanggal  Y-m-d
     * @param  string  $mulai  H:i:s
     * @param  string  $selesai  H:i:s
     * @param  list<int>  $dosenIds
     * @param  int|null  $kecualiJadwalId  jadwal yang sedang diubah (tidak dihitung bentrok dengan dirinya)
     * @return list<array<string, mixed>>
     */
    public static function cari(
        string $tanggal,
        string $mulai,
        string $selesai,
        string $ruang,
        array $dosenIds,
        ?int $kecualiJadwalId = null
    ): array {
        $beririsan = JadwalSidangTA::query()
            ->with([
                'penguji.dosen.user',
                'pengajuanSidang.pendaftaranTA.mahasiswa.user',
            ])
            ->whereDate('tanggal', $tanggal)
            ->where('waktu_mulai', '<', $selesai)
            ->where('waktu_selesai', '>', $mulai)
            ->when($kecualiJadwalId, fn ($query) => $query->where('id', '!=', $kecualiJadwalId))
            ->get();

        $bentrok = [];
        $ruangBaru = self::normalisasi($ruang);

        foreach ($beririsan as $jadwal) {
            $ringkas = [
                'id' => $jadwal->id,
                'tanggal' => $jadwal->tanggal->format('Y-m-d'),
                'waktu_mulai' => substr((string) $jadwal->waktu_mulai, 0, 5),
                'waktu_selesai' => substr((string) $jadwal->waktu_selesai, 0, 5),
                'ruang' => $jadwal->ruang,
                'mahasiswa' => $jadwal->pengajuanSidang
                    ->pendaftaranTA->mahasiswa?->user?->name,
            ];

            if (self::normalisasi($jadwal->ruang) === $ruangBaru) {
                $bentrok[] = [
                    'jenis' => 'ruang',
                    'ruang' => $jadwal->ruang,
                    'jadwal' => $ringkas,
                ];
            }

            foreach ($jadwal->penguji as $penguji) {
                if (in_array((int) $penguji->dosen_id, $dosenIds, true)) {
                    $bentrok[] = [
                        'jenis' => 'dosen',
                        'dosen' => [
                            'id' => $penguji->dosen_id,
                            'name' => $penguji->dosen?->user?->name,
                        ],
                        'jadwal' => $ringkas,
                    ];
                }
            }
        }

        return $bentrok;
    }

    private static function normalisasi(string $ruang): string
    {
        return mb_strtolower(trim($ruang));
    }
}
