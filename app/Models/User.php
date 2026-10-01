<?php

namespace App\Models;

use App\Models\Dosen;
use App\Models\Mahasiswa;
use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'nomor_induk',
        'email',
        'password',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function mahasiswa(): HasOne
    {
        return $this->hasOne(Mahasiswa::class);
    }

    public function dosen(): HasOne
    {
        return $this->hasOne(Dosen::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function hasRole(string $roleName): bool
    {
        return $this->roles()
            ->where('name', $roleName)
            ->exists();
    }

    public function hasAnyRole(array $roleNames): bool
    {
        return $this->roles()
            ->whereIn('name', $roleNames)
            ->exists();
    }

    public function hasFullAccess(): bool
    {
        return $this->hasAnyRole([
            'staff',
            'sekprodi',
            'kaprodi',
        ]);
    }

    public function assignRole(string $roleName): void
    {
        $role = Role::where('name', $roleName)->firstOrFail();

        $singleRoleOnly = [
            'mahasiswa',
            'dosen',
        ];

        if (in_array($roleName, $singleRoleOnly)) {
            $this->roles()->sync([$role->id]);
            return;
        }

        $this->roles()->syncWithoutDetaching([$role->id]);
    }


    public function removeRole(string $roleName): void
    {
        $role = Role::where('name', $roleName)->firstOrFail();

        $this->roles()->detach($role->id);
    }
}