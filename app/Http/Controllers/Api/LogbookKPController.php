<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LogbookKPResource;
use App\Models\LogbookKP;
use App\Models\PendaftaranKP;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogbookKPController extends Controller
{
    /*
     * =========================================================
     * MAHASISWA
     * =========================================================
     */

    /**
     * Daftar logbook milik mahasiswa yang sedang login.
     */
    public function index(Request $request): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        $pendaftaran = $this->activePendaftaran($mahasiswa->id);

        if (!$pendaftaran) {
            return response()->json([
                'success' => true,
                'message' => 'Belum ada pendaftaran KP yang disetujui.',
                'data' => [],
            ]);
        }

        return $this->listResponse($request, $pendaftaran);
    }

    /**
     * Menambah entry logbook.
     */
    public function store(Request $request): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        $pendaftaran = $this->activePendaftaran($mahasiswa->id);

        if (!$pendaftaran || !$pendaftaran->pembimbing) {
            return response()->json([
                'success' => false,
                'message' => 'Logbook baru bisa diisi setelah pendaftaran KP disetujui dan dosen pembimbing ditetapkan.',
            ], 409);
        }

        $validated = $this->validateEntry($request);

        $logbook = $pendaftaran->logbook()->create($validated + [
            'status' => 'PENDING',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Logbook berhasil ditambahkan.',
            'data' => (new LogbookKPResource($logbook))->resolve($request),
        ], 201);
    }

    /**
     * Mengubah entry logbook. Hanya boleh saat PENDING atau REJECTED;
     * setelah diubah, statusnya kembali PENDING untuk diverifikasi ulang.
     */
    public function update(Request $request, LogbookKP $logbook): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        if (!$this->ownedBy($logbook, $mahasiswa->id)) {
            return $this->forbiddenLogbook();
        }

        if (!in_array($logbook->status, ['PENDING', 'REJECTED'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Logbook yang sudah disetujui tidak dapat diubah.',
            ], 409);
        }

        $validated = $this->validateEntry($request);

        $logbook->update($validated + [
            'status' => 'PENDING',
            'catatan' => null,
            'verified_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Logbook berhasil diperbarui.',
            'data' => (new LogbookKPResource($logbook))->resolve($request),
        ]);
    }

    /**
     * Menghapus entry logbook. Hanya boleh saat PENDING atau REJECTED.
     */
    public function destroy(Request $request, LogbookKP $logbook): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        if (!$this->ownedBy($logbook, $mahasiswa->id)) {
            return $this->forbiddenLogbook();
        }

        if (!in_array($logbook->status, ['PENDING', 'REJECTED'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Logbook yang sudah disetujui tidak dapat dihapus.',
            ], 409);
        }

        $logbook->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logbook berhasil dihapus.',
        ]);
    }

    /*
     * =========================================================
     * DOSEN PEMBIMBING
     * =========================================================
     */

    /**
     * Daftar logbook milik mahasiswa bimbingan.
     * Query opsional: ?status=PENDING|APPROVED|REJECTED
     */
    public function indexForDosen(
        Request $request,
        PendaftaranKP $pendaftaran
    ): JsonResponse {
        if ($denied = $this->denyUnlessPembimbing($request, $pendaftaran)) {
            return $denied;
        }

        return $this->listResponse($request, $pendaftaran);
    }

    public function approve(Request $request, LogbookKP $logbook): JsonResponse
    {
        $logbook->load('pendaftaranKP.pembimbing');

        if ($denied = $this->denyUnlessPembimbing($request, $logbook->pendaftaranKP)) {
            return $denied;
        }

        if ($logbook->status !== 'PENDING') {
            return $this->notPending();
        }

        $logbook->update([
            'status' => 'APPROVED',
            'catatan' => null,
            'verified_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Logbook berhasil disetujui.',
            'data' => (new LogbookKPResource($logbook))->resolve($request),
        ]);
    }

    public function reject(Request $request, LogbookKP $logbook): JsonResponse
    {
        $logbook->load('pendaftaranKP.pembimbing');

        if ($denied = $this->denyUnlessPembimbing($request, $logbook->pendaftaranKP)) {
            return $denied;
        }

        if ($logbook->status !== 'PENDING') {
            return $this->notPending();
        }

        $validated = $request->validate([
            'catatan' => ['required', 'string', 'max:1000'],
        ]);

        $logbook->update([
            'status' => 'REJECTED',
            'catatan' => $validated['catatan'],
            'verified_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Logbook berhasil ditolak.',
            'data' => (new LogbookKPResource($logbook))->resolve($request),
        ]);
    }

    /*
     * =========================================================
     * STAFF / SEKPRODI / KAPRODI (akses penuh, hanya melihat)
     * =========================================================
     */

    public function indexForStaff(
        Request $request,
        PendaftaranKP $pendaftaran
    ): JsonResponse {
        return $this->listResponse($request, $pendaftaran);
    }

    /*
     * =========================================================
     * HELPER
     * =========================================================
     */

    /**
     * Pendaftaran KP aktif = pendaftaran terbaru yang berstatus APPROVED.
     */
    private function activePendaftaran(int $mahasiswaId): ?PendaftaranKP
    {
        return PendaftaranKP::with('pembimbing')
            ->where('mahasiswa_id', $mahasiswaId)
            ->where('status', 'APPROVED')
            ->latest()
            ->first();
    }

    private function listResponse(
        Request $request,
        PendaftaranKP $pendaftaran
    ): JsonResponse {
        $validated = $request->validate([
            'status' => ['nullable', 'in:PENDING,APPROVED,REJECTED'],
        ]);

        $query = $pendaftaran->logbook()
            ->orderByDesc('tanggal')
            ->orderByDesc('id');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data logbook KP berhasil diambil.',
            'data' => LogbookKPResource::collection($query->get())
                ->resolve($request),
        ]);
    }

    private function validateEntry(Request $request): array
    {
        return $request->validate([
            'tanggal' => ['required', 'date', 'before_or_equal:today'],
            'bidang_kerja' => ['required', 'string', 'max:255'],
            'deskripsi_kegiatan' => ['required', 'string'],
            'proses_penyelesaian' => ['nullable', 'string'],
            'luaran_hasil' => ['required', 'string'],
            'nama_pic' => ['required', 'string', 'max:255'],
        ]);
    }

    private function ownedBy(LogbookKP $logbook, int $mahasiswaId): bool
    {
        return (int) $logbook->pendaftaranKP->mahasiswa_id === $mahasiswaId;
    }

    /**
     * Pastikan dosen yang login adalah pembimbing pendaftaran ini.
     * Mengembalikan response error jika tidak, atau null jika boleh.
     */
    private function denyUnlessPembimbing(
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

    private function mahasiswaNotFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Data mahasiswa tidak ditemukan.',
        ], 404);
    }

    private function forbiddenLogbook(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Kamu tidak memiliki akses ke logbook ini.',
        ], 403);
    }

    private function notPending(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Logbook ini tidak sedang menunggu verifikasi.',
        ], 409);
    }
}
