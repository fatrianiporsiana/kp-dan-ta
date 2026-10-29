<?php

namespace App\Http\Resources;

use App\Models\Dosen;
use App\Support\LampiranSidangTA;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PengajuanSidangTAResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pendaftaran_ta_id' => $this->pendaftaran_ta_id,
            'status' => $this->status,
            'catatan' => $this->catatan,
            'dosen_confirmed_at' => $this->dosen_confirmed_at,
            'submitted_at' => $this->submitted_at,
            'created_at' => $this->created_at,

            // Siapa yang sedang ditunggu: 'dosen', 'staff', atau null.
            'menunggu' => $this->status === 'PENDING'
                ? ($this->dosen_confirmed_at ? 'staff' : 'dosen')
                : null,

            'data_pribadi' => [
                'alamat' => $this->alamat,
                'tempat_lahir' => $this->tempat_lahir,
                'tanggal_lahir' => $this->tanggal_lahir?->format('Y-m-d'),
                'email_widyatama' => $this->email_widyatama,
                'nomor_telepon' => $this->nomor_telepon,
                'ipk' => $this->ipk,
                'skor_toefl' => $this->skor_toefl,
            ],

            'data_sidang' => [
                'judul_ta' => $this->judul_ta,
                'jalur' => $this->pendaftaranTA->jalur,
                'konsentrasi' => $this->pendaftaranTA->konsentrasi,
                'jurnal_berbayar' => $this->jurnal_berbayar,
            ],

            'mahasiswa' => $this->when(
                $this->pendaftaranTA->relationLoaded('mahasiswa'),
                function () {
                    $mahasiswa = $this->pendaftaranTA->mahasiswa;
                    $user = $mahasiswa?->user;

                    return $user ? [
                        'id' => $mahasiswa->id,
                        'nomor_induk' => $user->nomor_induk,
                        'name' => $user->name,
                        'email' => $user->email,
                    ] : null;
                }
            ),

            'dosen_pembimbing' => $this->when(
                $this->pendaftaranTA->relationLoaded('pembimbing'),
                fn () => [
                    'utama' => self::dosen(
                        $this->pendaftaranTA->pembimbing->firstWhere('peran', 'utama')?->dosen
                    ),
                    'co' => self::dosen(
                        $this->pendaftaranTA->pembimbing->firstWhere('peran', 'co')?->dosen
                    ),
                ]
            ),

            // path file sengaja tidak ditampilkan; unduh lewat endpoint download.
            'dokumen' => $this->whenLoaded('dokumen', fn () => $this->dokumen
                ->map(fn ($dokumen) => [
                    'id' => $dokumen->id,
                    'jenis' => $dokumen->jenis,
                    'nama_file' => $dokumen->nama_file,
                    'ukuran' => $dokumen->ukuran,
                    'mime_type' => $dokumen->mime_type,
                    'created_at' => $dokumen->created_at,
                ])
                ->values()
                ->all()),

            // Checklist lampiran sesuai jalur, konsentrasi, dan jurnal berbayar.
            'lampiran' => $this->whenLoaded('dokumen', fn () => LampiranSidangTA::checklist(
                $this->pendaftaranTA->jalur,
                $this->pendaftaranTA->konsentrasi,
                (bool) $this->jurnal_berbayar,
                $this->dokumen->pluck('jenis')->all()
            )),
        ];
    }

    private static function dosen(?Dosen $dosen): ?array
    {
        $user = $dosen?->user;

        return $user ? [
            'id' => $dosen->id,
            'nomor_induk' => $user->nomor_induk,
            'name' => $user->name,
            'email' => $user->email,
        ] : null;
    }
}
