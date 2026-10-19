<?php

namespace App\Models;

use App\Models\PembimbingKP;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Dosen extends Model
{
    protected $fillable = [
        'user_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pembimbingKps(): HasMany
{
    return $this->hasMany(
        PembimbingKP::class,
        'dosen_id'
    );
}
}