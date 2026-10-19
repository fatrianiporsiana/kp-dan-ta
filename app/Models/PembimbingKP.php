<?php

namespace App\Models;

use App\Models\Dosen;
use App\Models\PendaftaranKP;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PembimbingKP extends Model
{
    protected $table = 'pembimbing_kps';

    protected $fillable = [
        'pendaftaran_kp_id',
        'dosen_id',
    ];

    public function pendaftaranKP(): BelongsTo
    {
        return $this->belongsTo(
            PendaftaranKP::class,
            'pendaftaran_kp_id',
            'id'
        );
    }

    public function dosen(): BelongsTo
    {
        return $this->belongsTo(
            Dosen::class,
            'dosen_id',
            'id'
        );
    }
}