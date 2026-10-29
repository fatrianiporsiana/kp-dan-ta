<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PendaftaranTA extends Model
{
    public const JALUR = ['skripsi', 'jurnal'];

    public const KONSENTRASI = ['reg_a', 'reg_b'];

    protected $table = 'pendaftaran_tas';

    protected $fillable = [
        'mahasiswa_id',
        'jalur',
        'konsentrasi',
        'dosen_usulan_1_id',
        'dosen_usulan_2_id',

        'alamat',
        'tempat_lahir',
        'tanggal_lahir',
        'email_widyatama',
        'nomor_telepon',
        'ipk',
        'skor_toefl',
        'judul_ta',

        'status',
        'catatan',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_lahir' => 'date',
            'ipk' => 'decimal:2',
            'skor_toefl' => 'integer',
            'submitted_at' => 'datetime',
        ];
    }

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(Mahasiswa::class);
    }

    public function dosenUsulan1(): BelongsTo
    {
        return $this->belongsTo(Dosen::class, 'dosen_usulan_1_id');
    }

    public function dosenUsulan2(): BelongsTo
    {
        return $this->belongsTo(Dosen::class, 'dosen_usulan_2_id');
    }

    /**
     * Semua pembimbing (utama dan co).
     */
    public function pembimbing(): HasMany
    {
        return $this->hasMany(PembimbingTA::class, 'pendaftaran_ta_id');
    }

    public function perpanjangan(): HasMany
    {
        return $this->hasMany(PerpanjanganTA::class, 'pendaftaran_ta_id');
    }

    public function dokumen(): MorphMany
    {
        return $this->morphMany(DokumenKP::class, 'documentable');
    }
}
