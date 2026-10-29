<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TemplateDokumenResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // path file sengaja tidak ditampilkan; unduh lewat endpoint download.
        return [
            'id' => $this->id,
            'kode' => $this->kode,
            'nama' => $this->nama,
            'deskripsi' => $this->deskripsi,
            'modul' => $this->modul,
            'terlihat_mahasiswa' => $this->terlihat_mahasiswa,
            'nama_file' => $this->nama_file,
            'ukuran' => $this->ukuran,
            'mime_type' => $this->mime_type,
            'updated_at' => $this->updated_at,
        ];
    }
}
