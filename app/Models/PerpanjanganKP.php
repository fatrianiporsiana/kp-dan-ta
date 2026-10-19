<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PerpanjanganKP extends Model
{
    protected $table = 'perpanjangan_kps';

    protected $fillable = [
        'pendaftaran_kp_id',
        'alasan',
        'durasi_bulan',
        'status',
        'catatan',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'durasi_bulan' => 'integer',
            'submitted_at' => 'datetime',
        ];
    }

    public function pendaftaranKP(): BelongsTo
    {
        return $this->belongsTo(PendaftaranKP::class);
    }

    public function dokumen(): MorphMany
    {
        return $this->morphMany(DokumenKP::class, 'documentable');
    }
}