<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dosen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DosenController extends Controller
{
    /**
     * Daftar dosen aktif.
     *
     * - Mahasiswa: untuk memilih dosen usulan saat pendaftaran KP.
     * - Staff/Sekprodi/Kaprodi: untuk menetapkan dosen pembimbing,
     *   dilengkapi jumlah mahasiswa bimbingan KP sebagai gambaran beban dosen.
     *
     * Query opsional: ?q=<nama atau nomor induk>
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $showBeban = $request->user()->hasFullAccess();
        $term = $validated['q'] ?? null;

        $query = Dosen::query()
            ->with('user:id,name,nomor_induk,email')
            ->whereHas('user', function ($user) use ($term) {
                $user->where('is_active', true);

                if ($term !== null && $term !== '') {
                    $like = '%' . $term . '%';

                    $user->where(function ($search) use ($like) {
                        $search->where('name', 'like', $like)
                            ->orWhere('nomor_induk', 'like', $like);
                    });
                }
            });

        if ($showBeban) {
            $query->withCount('pembimbingKps');
        }

        $data = $query->get()
            ->sortBy(fn (Dosen $dosen) => mb_strtolower($dosen->user->name))
            ->values()
            ->map(function (Dosen $dosen) use ($showBeban) {
                $row = [
                    'id' => $dosen->id,
                    'nomor_induk' => $dosen->user->nomor_induk,
                    'name' => $dosen->user->name,
                    'email' => $dosen->user->email,
                ];

                if ($showBeban) {
                    $row['jumlah_bimbingan_kp'] = $dosen->pembimbing_kps_count;
                }

                return $row;
            });

        return response()->json([
            'success' => true,
            'message' => 'Data dosen berhasil diambil.',
            'data' => $data,
        ]);
    }
}
