<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PerpanjanganKPResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pendaftaran_kp_id' => $this->pendaftaran_kp_id,
            'alasan' => $this->alasan,
            'durasi_bulan' => $this->durasi_bulan,
            'status' => $this->status,
            'catatan' => $this->catatan,
            'submitted_at' => $this->submitted_at,
            'created_at' => $this->created_at,

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

            'pendaftaran' => $this->whenLoaded('pendaftaranKP', function () {
                $pendaftaran = $this->pendaftaranKP;
                $user = $pendaftaran->mahasiswa?->user;

                return [
                    'id' => $pendaftaran->id,
                    'judul_kp' => $pendaftaran->judul_kp,
                    'mahasiswa' => $user ? [
                        'id' => $pendaftaran->mahasiswa->id,
                        'nomor_induk' => $user->nomor_induk,
                        'name' => $user->name,
                        'email' => $user->email,
                    ] : null,
                ];
            }),
        ];
    }
}
