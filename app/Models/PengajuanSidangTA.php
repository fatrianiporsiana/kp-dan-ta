<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PengajuanSidangTA extends Model
{
    protected $table = 'pengajuan_sidang_tas';

    protected $fillable = [
        'pendaftaran_ta_id',

        'alamat',
        'tempat_lahir',
        'tanggal_lahir',
        'email_widyatama',
        'nomor_telepon',
        'ipk',
        'skor_toefl',
        'judul_ta',

        'jurnal_berbayar',

        'status',
        'catatan',
        'dosen_confirmed_at',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_lahir' => 'date',
            'ipk' => 'decimal:2',
            'skor_toefl' => 'integer',
            'jurnal_berbayar' => 'boolean',
            'dosen_confirmed_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function pendaftaranTA(): BelongsTo
    {
        return $this->belongsTo(PendaftaranTA::class, 'pendaftaran_ta_id');
    }

    public function dokumen(): MorphMany
    {
        return $this->morphMany(DokumenKP::class, 'documentable');
    }
}
