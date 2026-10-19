<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class DokumenKP extends Model
{
    protected $table = 'dokumen_kps';

    protected $fillable = [
        'documentable_type',
        'documentable_id',
        'jenis',
        'nama_file',
        'path',
        'ukuran',
        'mime_type',
    ];

    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }
}