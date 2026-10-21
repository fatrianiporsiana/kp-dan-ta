<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogbookKP extends Model
{
    protected $table = 'logbook_kps';

    protected $fillable = [
        'pendaftaran_kp_id',
        'tanggal',
        'bidang_kerja',
        'deskripsi_kegiatan',
        'proses_penyelesaian',
        'luaran_hasil',
        'nama_pic',
        'status',
        'catatan',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'verified_at' => 'datetime',
        ];
    }

    public function pendaftaranKP(): BelongsTo
    {
        return $this->belongsTo(
            PendaftaranKP::class,
            'pendaftaran_kp_id'
        );
    }
}
