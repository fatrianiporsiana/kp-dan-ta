<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PembimbingTA extends Model
{
    public const PERAN_UTAMA = 'utama';

    public const PERAN_CO = 'co';

    protected $table = 'pembimbing_tas';

    protected $fillable = [
        'pendaftaran_ta_id',
        'dosen_id',
        'peran',
    ];

    public function pendaftaranTA(): BelongsTo
    {
        return $this->belongsTo(PendaftaranTA::class, 'pendaftaran_ta_id');
    }

    public function dosen(): BelongsTo
    {
        return $this->belongsTo(Dosen::class, 'dosen_id');
    }
}
