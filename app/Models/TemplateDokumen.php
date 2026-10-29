<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TemplateDokumen extends Model
{
    public const MODUL = ['kp', 'ta', 'umum'];

    protected $table = 'template_dokumens';

    protected $fillable = [
        'kode',
        'nama',
        'deskripsi',
        'modul',
        'terlihat_mahasiswa',
        'nama_file',
        'path',
        'ukuran',
        'mime_type',
    ];

    protected function casts(): array
    {
        return [
            'terlihat_mahasiswa' => 'boolean',
            'ukuran' => 'integer',
        ];
    }

    /**
     * Route model binding memakai kode (bukan id): /templates/kuesioner-kp/download
     */
    public function getRouteKeyName(): string
    {
        return 'kode';
    }
}
