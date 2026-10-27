<?php

namespace App\Http\Resources;

use App\Models\Dosen;
use App\Support\LampiranTA;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PendaftaranTAResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'catatan' => $this->catatan,
            'submitted_at' => $this->submitted_at,
            'created_at' => $this->created_at,

            'mahasiswa' => $this->whenLoaded('mahasiswa', function () {
                $user = $this->mahasiswa->user;

                return $user ? [
                    'id' => $this->mahasiswa->id,
                    'nomor_induk' => $user->nomor_induk,
                    'name' => $user->name,
                    'email' => $user->email,
                ] : null;
            }),

            'data_pribadi' => [
                'alamat' => $this->alamat,
                'tempat_lahir' => $this->tempat_lahir,
                'tanggal_lahir' => $this->tanggal_lahir?->format('Y-m-d'),
                'email_widyatama' => $this->email_widyatama,
                'nomor_telepon' => $this->nomor_telepon,
                'ipk' => $this->ipk,
                'skor_toefl' => $this->skor_toefl,
            ],

            'data_ta' => [
                'jalur' => $this->jalur,
                'konsentrasi' => $this->konsentrasi,
                'judul_ta' => $this->judul_ta,
            ],

            'dosen_usulan' => $this->when(
                $this->relationLoaded('dosenUsulan1'),
                fn () => [
                    'dosen_1' => self::dosen($this->dosenUsulan1),
                    'dosen_2' => self::dosen($this->dosenUsulan2),
                ]
            ),

            'dosen_pembimbing' => $this->when(
                $this->relationLoaded('pembimbing'),
                fn () => [
                    'utama' => self::dosen(
                        $this->pembimbing->firstWhere('peran', 'utama')?->dosen
                    ),
                    'co' => self::dosen(
                        $this->pembimbing->firstWhere('peran', 'co')?->dosen
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

            // Checklist lampiran wajib sesuai konsentrasi, lengkap dengan status unggah.
            'lampiran' => $this->whenLoaded('dokumen', fn () => LampiranTA::checklist(
                $this->konsentrasi,
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
