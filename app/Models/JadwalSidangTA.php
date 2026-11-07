<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JadwalSidangTA extends Model
{
    protected $table = 'jadwal_sidang_tas';

    protected $fillable = [
        'pengajuan_sidang_ta_id',
        'tanggal',
        'waktu_mulai',
        'waktu_selesai',
        'ruang',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
        ];
    }

    public function pengajuanSidang(): BelongsTo
    {
        return $this->belongsTo(PengajuanSidangTA::class, 'pengajuan_sidang_ta_id');
    }

    public function penguji(): HasMany
    {
        return $this->hasMany(PengujiTA::class, 'jadwal_sidang_ta_id')
            ->orderBy('urutan');
    }
}
