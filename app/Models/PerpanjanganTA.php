<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PerpanjanganTA extends Model
{
    protected $table = 'perpanjangan_tas';

    protected $fillable = [
        'pendaftaran_ta_id',
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

    public function pendaftaranTA(): BelongsTo
    {
        return $this->belongsTo(
            PendaftaranTA::class,
            'pendaftaran_ta_id'
        );
    }

    public function dokumen(): MorphMany
    {
        return $this->morphMany(DokumenKP::class, 'documentable');
    }
}
