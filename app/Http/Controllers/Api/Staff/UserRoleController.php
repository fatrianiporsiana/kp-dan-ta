<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\Mahasiswa;
use App\Models\Dosen;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserRoleController extends Controller
{
    public function assign(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => [
                'required',
                'string',
                Rule::in([
                    'mahasiswa',
                    'dosen',
                    'staff',
                    'sekprodi',
                    'kaprodi',
                ]),
            ],
        ]);

        $roleName = $validated['role'];

        $role = Role::where('name', $roleName)->first();

        if (!$role) {
            return response()->json([
                'success' => false,
                'message' => 'Role belum tersedia di database.',
            ], 422);
        }

        $currentRoles = $user->roleNames();

        $singleRoleOnly = ['mahasiswa', 'dosen'];

        $fullAccessRoles = ['staff', 'sekprodi', 'kaprodi'];

        // Mahasiswa dan dosen hanya boleh memiliki satu role.
        if (in_array($roleName, $singleRoleOnly)) {
            if (
                count($currentRoles) > 0 &&
                (
                    count($currentRoles) !== 1 ||
                    $currentRoles[0] !== $roleName
                )
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akun ini sudah memiliki role lain. Role mahasiswa dan dosen tidak dapat digabung dengan role lain.',
                ], 409);
            }
        }

        // Akun mahasiswa/dosen tidak boleh ditambahkan role full-access.
        if (
            in_array($roleName, $fullAccessRoles) &&
            count(array_intersect(
                $currentRoles,
                $singleRoleOnly
            )) > 0
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Akun mahasiswa atau dosen tidak dapat ditambahkan role full-access.',
            ], 409);
        }

        // Jangan menukar jenis profil yang sudah ada secara otomatis.
        if (
            $roleName === 'mahasiswa' &&
            $user->dosen()->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Akun ini sudah memiliki profil dosen.',
            ], 409);
        }

        if (
            $roleName === 'dosen' &&
            $user->mahasiswa()->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Akun ini sudah memiliki profil mahasiswa.',
            ], 409);
        }

        DB::transaction(function () use ($user, $role, $roleName) {
            $user->roles()->syncWithoutDetaching([$role->id]);

            if ($roleName === 'mahasiswa') {
                Mahasiswa::firstOrCreate([
                    'user_id' => $user->id,
                ]);
            }

            if ($roleName === 'dosen') {
                Dosen::firstOrCreate([
                    'user_id' => $user->id,
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Role berhasil diberikan.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'roles' => $user->fresh()
                    ->roles()
                    ->pluck('name')
                    ->values(),
                'mahasiswa_id' => $user->mahasiswa()->value('id'),
                'dosen_id' => $user->dosen()->value('id'),
            ],
        ]);
    }
}
