<?php

namespace App\Models;

use App\Models\DokumenKP;
use App\Models\Dosen;
use App\Models\Mahasiswa;
use App\Models\PembimbingKP;
use App\Models\PerpanjanganKP;
use App\Models\PenyelesaianKP;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PendaftaranKP extends Model
{
    protected $table = 'pendaftaran_kps';

    protected $fillable = [
        'mahasiswa_id',
        'dosen_usulan_1_id',
        'dosen_usulan_2_id',

        'alamat',
        'tempat_lahir',
        'tanggal_lahir',
        'email_widyatama',
        'nomor_telepon',
        'ipk',
        'judul_kp',

        'nama_perusahaan',
        'bidang_usaha',
        'alamat_perusahaan',
        'kota',
        'kontak_perusahaan',
        'pembimbing_lapangan',

        'status',
        'catatan',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_lahir' => 'date',
            'ipk' => 'decimal:2',
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

    public function pembimbing(): HasOne
    {
        return $this->hasOne(
            PembimbingKP::class,
            'pendaftaran_kp_id'
        );
    }

    public function penyelesaian(): HasMany
    {
        return $this->hasMany(
            PenyelesaianKP::class,
            'pendaftaran_kp_id'
        );
    }

    public function perpanjangan(): HasMany
    {
        return $this->hasMany(
            PerpanjanganKP::class,
            'pendaftaran_kp_id'
        );
    }

    public function dokumen(): MorphMany
    {
        return $this->morphMany(DokumenKP::class, 'documentable');
    }
}