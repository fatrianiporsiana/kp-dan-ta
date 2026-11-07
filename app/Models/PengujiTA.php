<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengujiTA extends Model
{
    protected $table = 'penguji_tas';

    protected $fillable = [
        'jadwal_sidang_ta_id',
        'dosen_id',
        'urutan',
    ];

    public function jadwal(): BelongsTo
    {
        return $this->belongsTo(JadwalSidangTA::class, 'jadwal_sidang_ta_id');
    }

    public function dosen(): BelongsTo
    {
        return $this->belongsTo(Dosen::class, 'dosen_id');
    }
}
