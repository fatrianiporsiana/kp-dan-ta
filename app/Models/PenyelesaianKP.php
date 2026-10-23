<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PenyelesaianKP extends Model
{
    protected $table = 'penyelesaian_kps';

    protected $fillable = [
        'pendaftaran_kp_id',
        'tahap',
        'status',
        'catatan',
        'dosen_confirmed_at',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'tahap' => 'integer',
            'dosen_confirmed_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function pendaftaranKP(): BelongsTo
    {
        return $this->belongsTo(
            PendaftaranKP::class,
            'pendaftaran_kp_id'
        );
    }

    public function dokumen(): MorphMany
    {
        return $this->morphMany(DokumenKP::class, 'documentable');
    }
}