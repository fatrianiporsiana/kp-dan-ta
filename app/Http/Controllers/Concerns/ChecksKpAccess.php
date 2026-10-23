<?php

namespace App\Http\Controllers\Concerns;

use App\Models\PendaftaranKP;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pengecekan akses yang dipakai bersama oleh controller modul KP.
 */
trait ChecksKpAccess
{
    /**
     * Pendaftaran KP aktif = pendaftaran terbaru yang berstatus APPROVED.
     */
    protected function activePendaftaran(int $mahasiswaId): ?PendaftaranKP
    {
        return PendaftaranKP::with('pembimbing')
            ->where('mahasiswa_id', $mahasiswaId)
            ->where('status', 'APPROVED')
            ->latest()
            ->first();
    }

    /**
     * Pastikan dosen yang login adalah pembimbing pendaftaran ini.
     * Mengembalikan response error jika tidak, atau null jika boleh.
     */
    protected function denyUnlessPembimbing(
        Request $request,
        PendaftaranKP $pendaftaran
    ): ?JsonResponse {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return response()->json([
                'success' => false,
                'message' => 'Data dosen tidak ditemukan.',
            ], 404);
        }

        $pembimbing = $pendaftaran->pembimbing;

        if (!$pembimbing || (int) $pembimbing->dosen_id !== (int) $dosen->id) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu tidak memiliki akses ke pendaftaran KP ini.',
            ], 403);
        }

        return null;
    }

    protected function mahasiswaNotFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Data mahasiswa tidak ditemukan.',
        ], 404);
    }
}
