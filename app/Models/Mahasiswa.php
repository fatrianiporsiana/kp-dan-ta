<?php

namespace App\Models;

use App\Models\PendaftaranKP;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Mahasiswa extends Model
{
    protected $fillable = [
        'user_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pendaftaranKps(): HasMany
    {
        return $this->hasMany(PendaftaranKP::class);
    }
}