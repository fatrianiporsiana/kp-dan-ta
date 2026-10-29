<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PerpanjanganTAResource;
use App\Models\PendaftaranTA;
use App\Models\PerpanjanganTA;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Alur perpanjangan TA (sama dengan perpanjangan KP):
 *
 *  DRAFT    -> mahasiswa mengisi alasan & durasi (bagian ini dicetak bersama
 *              Kartu Bimbingan dan ditandatangani dosen pembimbing secara manual)
 *  PENDING  -> mahasiswa mengunggah scan yang sudah ditandatangani,
 *              menunggu konfirmasi staff
 *  APPROVED / REJECTED -> hasil konfirmasi staff
 *
 * Dosen pembimbing (utama maupun co) hanya melihat; tanda tangan dilakukan manual.
 */
class PerpanjanganTAController extends Controller
{
    private const MAKS_DURASI_BULAN = 12;

    /*
     * =========================================================
     * MAHASISWA
     * =========================================================
     */

    public function index(Request $request): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        $pendaftaran = $this->pendaftaranAktif($mahasiswa->id);

        if (!$pendaftaran) {
            return response()->json([
                'success' => true,
                'message' => 'Belum ada pendaftaran TA yang disetujui.',
                'data' => [],
            ]);
        }

        return $this->listResponse($request, $pendaftaran);
    }

    public function store(Request $request): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        $pendaftaran = $this->pendaftaranAktif($mahasiswa->id);

        if (!$pendaftaran || $pendaftaran->pembimbing->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Perpanjangan hanya bisa diajukan setelah pendaftaran TA disetujui dan dosen pembimbing ditetapkan.',
            ], 409);
        }

        $belumSelesai = $pendaftaran->perpanjangan()
            ->whereIn('status', ['DRAFT', 'PENDING'])
            ->exists();

        if ($belumSelesai) {
            return response()->json([
                'success' => false,
                'message' => 'Masih ada pengajuan perpanjangan yang belum selesai diproses.',
            ], 409);
        }

        $validated = $this->validateForm($request);

        $perpanjangan = $pendaftaran->perpanjangan()->create($validated + [
            'status' => 'DRAFT',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan perpanjangan berhasil dibuat. Cetak, minta tanda tangan dosen pembimbing, lalu unggah scan-nya.',
            'data' => $this->single($request, $perpanjangan),
        ], 201);
    }

    /**
     * Mengubah alasan/durasi. Hanya boleh selama masih DRAFT.
     */
    public function update(Request $request, PerpanjanganTA $perpanjangan): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        if (!$this->ownedBy($perpanjangan, $mahasiswa->id)) {
            return $this->forbiddenPerpanjangan();
        }

        if ($perpanjangan->status !== 'DRAFT') {
            return $this->alreadySubmitted();
        }

        $perpanjangan->update($this->validateForm($request));

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan perpanjangan berhasil diperbarui.',
            'data' => $this->single($request, $perpanjangan),
        ]);
    }

    /**
     * Membatalkan pengajuan. Hanya boleh selama masih DRAFT.
     */
    public function destroy(Request $request, PerpanjanganTA $perpanjangan): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        if (!$this->ownedBy($perpanjangan, $mahasiswa->id)) {
            return $this->forbiddenPerpanjangan();
        }

        if ($perpanjangan->status !== 'DRAFT') {
            return $this->alreadySubmitted();
        }

        $perpanjangan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan perpanjangan berhasil dibatalkan.',
        ]);
    }

    /**
     * Unggah scan yang sudah ditandatangani dosen pembimbing.
     * DRAFT -> PENDING. Selama masih PENDING, scan boleh diganti.
     */
    public function uploadScan(Request $request, PerpanjanganTA $perpanjangan): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        if (!$this->ownedBy($perpanjangan, $mahasiswa->id)) {
            return $this->forbiddenPerpanjangan();
        }

        if (!in_array($perpanjangan->status, ['DRAFT', 'PENDING'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan yang sudah diproses tidak dapat diubah.',
            ], 409);
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:5120'],
        ]);

        $file = $request->file('file');

        // Simpan file baru dulu; scan lama dihapus setelah yang baru berhasil dibuat.
        $scanLama = $perpanjangan->dokumen()->get();

        $path = $file->store(
            'dokumen-kp/ta/perpanjangan/' . $perpanjangan->id,
            'local'
        );

        $perpanjangan->dokumen()->create([
            'jenis' => 'scan_perpanjangan',
            'nama_file' => $file->getClientOriginalName(),
            'path' => $path,
            'ukuran' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        foreach ($scanLama as $lama) {
            Storage::disk('local')->delete($lama->path);
            $lama->delete();
        }

        $perpanjangan->update([
            'status' => 'PENDING',
            'catatan' => null,
            'submitted_at' => $perpanjangan->submitted_at ?? now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Scan berhasil diunggah. Pengajuan menunggu konfirmasi staff.',
            'data' => $this->single($request, $perpanjangan),
        ]);
    }

    /*
     * =========================================================
     * DOSEN PEMBIMBING (utama maupun co; hanya melihat)
     * =========================================================
     */

    public function indexForDosen(
        Request $request,
        PendaftaranTA $pendaftaran
    ): JsonResponse {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return response()->json([
                'success' => false,
                'message' => 'Data dosen tidak ditemukan.',
            ], 404);
        }

        $pembimbing = $pendaftaran->pembimbing()
            ->where('dosen_id', $dosen->id)
            ->exists();

        if (!$pembimbing) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu tidak memiliki akses ke pendaftaran TA ini.',
            ], 403);
        }

        return $this->listResponse($request, $pendaftaran);
    }

    /*
     * =========================================================
     * STAFF / SEKPRODI / KAPRODI
     * =========================================================
     */

    /**
     * Daftar pengajuan yang sudah dikirim (DRAFT tidak ditampilkan).
     * Query opsional: ?status=PENDING|APPROVED|REJECTED
     */
    public function indexForStaff(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:PENDING,APPROVED,REJECTED'],
        ]);

        $query = PerpanjanganTA::with([
            'dokumen',
            'pendaftaranTA.mahasiswa.user',
        ])
            ->where('status', '!=', 'DRAFT')
            ->latest('id');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data pengajuan perpanjangan TA berhasil diambil.',
            'data' => PerpanjanganTAResource::collection($query->get())
                ->resolve($request),
        ]);
    }

    public function approve(Request $request, PerpanjanganTA $perpanjangan): JsonResponse
    {
        if ($perpanjangan->status !== 'PENDING') {
            return $this->notPending();
        }

        $perpanjangan->update([
            'status' => 'APPROVED',
            'catatan' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Perpanjangan TA berhasil disetujui.',
            'data' => $this->single($request, $perpanjangan),
        ]);
    }

    public function reject(Request $request, PerpanjanganTA $perpanjangan): JsonResponse
    {
        if ($perpanjangan->status !== 'PENDING') {
            return $this->notPending();
        }

        $validated = $request->validate([
            'catatan' => ['required', 'string', 'max:1000'],
        ]);

        $perpanjangan->update([
            'status' => 'REJECTED',
            'catatan' => $validated['catatan'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Perpanjangan TA berhasil ditolak.',
            'data' => $this->single($request, $perpanjangan),
        ]);
    }

    /*
     * =========================================================
     * HELPER
     * =========================================================
     */

    /**
     * Pendaftaran TA aktif = pendaftaran terbaru yang berstatus APPROVED.
     */
    private function pendaftaranAktif(int $mahasiswaId): ?PendaftaranTA
    {
        return PendaftaranTA::with('pembimbing')
            ->where('mahasiswa_id', $mahasiswaId)
            ->where('status', 'APPROVED')
            ->latest('id')
            ->first();
    }

    private function listResponse(
        Request $request,
        PendaftaranTA $pendaftaran
    ): JsonResponse {
        $items = $pendaftaran->perpanjangan()
            ->with('dokumen')
            ->latest('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data perpanjangan TA berhasil diambil.',
            'data' => PerpanjanganTAResource::collection($items)
                ->resolve($request),
        ]);
    }

    private function single(Request $request, PerpanjanganTA $perpanjangan): array
    {
        $perpanjangan->load('dokumen');

        return (new PerpanjanganTAResource($perpanjangan))->resolve($request);
    }

    private function validateForm(Request $request): array
    {
        return $request->validate([
            'alasan' => ['required', 'string', 'max:2000'],
            'durasi_bulan' => [
                'required',
                'integer',
                'min:1',
                'max:' . self::MAKS_DURASI_BULAN,
            ],
        ]);
    }

    private function ownedBy(PerpanjanganTA $perpanjangan, int $mahasiswaId): bool
    {
        return (int) $perpanjangan->pendaftaranTA->mahasiswa_id === $mahasiswaId;
    }

    private function mahasiswaNotFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Data mahasiswa tidak ditemukan.',
        ], 404);
    }

    private function forbiddenPerpanjangan(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Kamu tidak memiliki akses ke pengajuan perpanjangan ini.',
        ], 403);
    }

    private function alreadySubmitted(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Pengajuan yang sudah dikirim tidak dapat diubah.',
        ], 409);
    }

    private function notPending(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Pengajuan perpanjangan ini tidak sedang menunggu konfirmasi.',
        ], 409);
    }
}
