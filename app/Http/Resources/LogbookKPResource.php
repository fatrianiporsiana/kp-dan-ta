<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LogbookKPResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pendaftaran_kp_id' => $this->pendaftaran_kp_id,
            'tanggal' => $this->tanggal?->format('Y-m-d'),
            'bidang_kerja' => $this->bidang_kerja,
            'deskripsi_kegiatan' => $this->deskripsi_kegiatan,
            'proses_penyelesaian' => $this->proses_penyelesaian,
            'luaran_hasil' => $this->luaran_hasil,
            'nama_pic' => $this->nama_pic,
            'status' => $this->status,
            'catatan' => $this->catatan,
            'verified_at' => $this->verified_at,
            'created_at' => $this->created_at,
        ];
    }
}
