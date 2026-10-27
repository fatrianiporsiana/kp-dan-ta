<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PendaftaranTAResource;
use App\Models\PembimbingTA;
use App\Models\PendaftaranTA;
use App\Support\LampiranTA;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Alur pendaftaran TA:
 *
 *  DRAFT    -> mahasiswa mengisi data dan mengunggah lampiran satu per satu
 *  PENDING  -> mahasiswa menekan "kirim" (semua lampiran wajib sudah lengkap)
 *  APPROVED / REJECTED -> hasil verifikasi staff
 *  REJECTED -> mahasiswa memperbaiki data/lampiran, lalu kirim ulang
 *
 * Setelah APPROVED, staff menetapkan pembimbing utama dan co-pembimbing.
 */
class PendaftaranTAController extends Controller
{
    private const RELASI_LENGKAP = [
        'mahasiswa.user',
        'dosenUsulan1.user',
        'dosenUsulan2.user',
        'pembimbing.dosen.user',
        'dokumen',
    ];

    /*
     * =========================================================
     * MAHASISWA
     * =========================================================
     */

    /**
     * Daftar lampiran wajib untuk sebuah konsentrasi (untuk checklist di form).
     * Query: ?konsentrasi=reg_a|reg_b
     */
    public function lampiran(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'konsentrasi' => ['required', Rule::in(PendaftaranTA::KONSENTRASI)],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daftar lampiran berhasil diambil.',
            'data' => LampiranTA::daftar($validated['konsentrasi']),
        ]);
    }

    /**
     * Pendaftaran TA terbaru milik mahasiswa yang sedang login.
     */
    public function show(Request $request): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        $pendaftaran = PendaftaranTA::with(self::RELASI_LENGKAP)
            ->where('mahasiswa_id', $mahasiswa->id)
            ->latest('id')
            ->first();

        return response()->json([
            'success' => true,
            'message' => $pendaftaran
                ? 'Data pendaftaran TA berhasil diambil.'
                : 'Belum ada pendaftaran TA.',
            'data' => $pendaftaran ? $this->single($request, $pendaftaran) : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        $sudahAda = PendaftaranTA::where('mahasiswa_id', $mahasiswa->id)
            ->whereIn('status', ['DRAFT', 'PENDING', 'APPROVED'])
            ->exists();

        if ($sudahAda) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu sudah memiliki pendaftaran TA yang sedang diisi, diproses, atau sudah disetujui.',
            ], 409);
        }

        $validated = $this->validateForm($request);

        $pendaftaran = PendaftaranTA::create($validated + [
            'mahasiswa_id' => $mahasiswa->id,
            'status' => 'DRAFT',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran TA berhasil dibuat. Lengkapi lampiran lalu kirim.',
            'data' => $this->single($request, $pendaftaran),
        ], 201);
    }

    /**
     * Mengubah data pendaftaran. Hanya boleh saat DRAFT atau REJECTED.
     * Jika konsentrasi berubah, lampiran yang tidak lagi berlaku dihapus.
     */
    public function update(Request $request, PendaftaranTA $pendaftaran): JsonResponse
    {
        if ($denied = $this->denyUnlessEditableOwner($request, $pendaftaran)) {
            return $denied;
        }

        $pendaftaran->update($this->validateForm($request));

        $boleh = LampiranTA::jenisUntuk($pendaftaran->konsentrasi);

        foreach ($pendaftaran->dokumen()->whereNotIn('jenis', $boleh)->get() as $dokumen) {
            Storage::disk('local')->delete($dokumen->path);
            $dokumen->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran TA berhasil diperbarui.',
            'data' => $this->single($request, $pendaftaran),
        ]);
    }

    /**
     * Membatalkan pendaftaran. Hanya boleh selama masih DRAFT.
     */
    public function destroy(Request $request, PendaftaranTA $pendaftaran): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        if (!$this->ownedBy($pendaftaran, $mahasiswa->id)) {
            return $this->forbidden();
        }

        if ($pendaftaran->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya pendaftaran yang masih berstatus DRAFT yang dapat dibatalkan.',
            ], 409);
        }

        foreach ($pendaftaran->dokumen as $dokumen) {
            Storage::disk('local')->delete($dokumen->path);
            $dokumen->delete();
        }

        $pendaftaran->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran TA berhasil dibatalkan.',
        ]);
    }

    /**
     * Unggah (atau ganti) satu lampiran. Hanya jenis yang berlaku untuk
     * konsentrasi pendaftaran ini yang diterima.
     */
    public function uploadDokumen(Request $request, PendaftaranTA $pendaftaran): JsonResponse
    {
        if ($denied = $this->denyUnlessEditableOwner($request, $pendaftaran)) {
            return $denied;
        }

        $request->validate([
            'jenis' => [
                'required',
                Rule::in(LampiranTA::jenisUntuk($pendaftaran->konsentrasi)),
            ],
            'file' => ['required', 'file', 'mimes:pdf', 'max:5120'],
        ]);

        $jenis = $request->input('jenis');
        $file = $request->file('file');

        $lama = $pendaftaran->dokumen()->where('jenis', $jenis)->get();

        $path = $file->store(
            'dokumen-kp/ta/pendaftaran/' . $pendaftaran->id,
            'local'
        );

        $dokumen = $pendaftaran->dokumen()->create([
            'jenis' => $jenis,
            'nama_file' => $file->getClientOriginalName(),
            'path' => $path,
            'ukuran' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        foreach ($lama as $item) {
            Storage::disk('local')->delete($item->path);
            $item->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Lampiran berhasil diunggah.',
            'data' => [
                'dokumen' => [
                    'id' => $dokumen->id,
                    'jenis' => $dokumen->jenis,
                    'nama_file' => $dokumen->nama_file,
                    'ukuran' => $dokumen->ukuran,
                    'mime_type' => $dokumen->mime_type,
                ],
                'lampiran' => LampiranTA::checklist(
                    $pendaftaran->konsentrasi,
                    $pendaftaran->dokumen()->pluck('jenis')->all()
                ),
            ],
        ], 201);
    }

    /**
     * Kirim pendaftaran untuk diverifikasi staff (DRAFT/REJECTED -> PENDING).
     */
    public function submit(Request $request, PendaftaranTA $pendaftaran): JsonResponse
    {
        if ($denied = $this->denyUnlessEditableOwner($request, $pendaftaran)) {
            return $denied;
        }

        $kurang = LampiranTA::kurang(
            $pendaftaran->konsentrasi,
            $pendaftaran->dokumen()->pluck('jenis')->all()
        );

        if ($kurang !== []) {
            return response()->json([
                'success' => false,
                'message' => 'Lampiran wajib belum lengkap.',
                'data' => ['lampiran_kurang' => $kurang],
            ], 422);
        }

        $pendaftaran->update([
            'status' => 'PENDING',
            'catatan' => null,
            'submitted_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran TA berhasil dikirim. Menunggu verifikasi staff.',
            'data' => $this->single($request, $pendaftaran),
        ]);
    }

    /*
     * =========================================================
     * DOSEN PEMBIMBING (utama maupun co)
     * =========================================================
     */

    public function indexForDosen(Request $request): JsonResponse
    {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return $this->dosenNotFound();
        }

        $items = PendaftaranTA::with(self::RELASI_LENGKAP)
            ->whereHas('pembimbing', function ($query) use ($dosen) {
                $query->where('dosen_id', $dosen->id);
            })
            ->latest('id')
            ->get();

        $data = $items->map(function (PendaftaranTA $item) use ($request, $dosen) {
            $row = (new PendaftaranTAResource($item))->resolve($request);
            $row['peran_saya'] = $item->pembimbing
                ->firstWhere('dosen_id', $dosen->id)?->peran;

            return $row;
        })->values()->all();

        return response()->json([
            'success' => true,
            'message' => 'Data mahasiswa bimbingan TA berhasil diambil.',
            'data' => $data,
        ]);
    }

    public function showForDosen(Request $request, PendaftaranTA $pendaftaran): JsonResponse
    {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return $this->dosenNotFound();
        }

        $pembimbing = $pendaftaran->pembimbing()
            ->where('dosen_id', $dosen->id)
            ->first();

        if (!$pembimbing) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu tidak memiliki akses ke pendaftaran TA ini.',
            ], 403);
        }

        $pendaftaran->load(self::RELASI_LENGKAP);

        $row = (new PendaftaranTAResource($pendaftaran))->resolve($request);
        $row['peran_saya'] = $pembimbing->peran;

        return response()->json([
            'success' => true,
            'message' => 'Data pendaftaran TA berhasil diambil.',
            'data' => $row,
        ]);
    }

    /*
     * =========================================================
     * STAFF / SEKPRODI / KAPRODI
     * =========================================================
     */

    /**
     * Daftar pendaftaran yang sudah dikirim (DRAFT tidak ditampilkan).
     * Query opsional: ?status=PENDING|APPROVED|REJECTED
     */
    public function indexForStaff(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:PENDING,APPROVED,REJECTED'],
        ]);

        $query = PendaftaranTA::with(self::RELASI_LENGKAP)
            ->where('status', '!=', 'DRAFT')
            ->latest('id');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data pendaftaran TA berhasil diambil.',
            'data' => PendaftaranTAResource::collection($query->get())
                ->resolve($request),
        ]);
    }

    public function showForStaff(Request $request, PendaftaranTA $pendaftaran): JsonResponse
    {
        if ($pendaftaran->status === 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Pendaftaran TA ini belum dikirim oleh mahasiswa.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data pendaftaran TA berhasil diambil.',
            'data' => $this->single($request, $pendaftaran),
        ]);
    }

    public function approve(Request $request, PendaftaranTA $pendaftaran): JsonResponse
    {
        if ($pendaftaran->status !== 'PENDING') {
            return $this->notPending();
        }

        $pendaftaran->update([
            'status' => 'APPROVED',
            'catatan' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran TA berhasil disetujui.',
            'data' => $this->single($request, $pendaftaran),
        ]);
    }

    public function reject(Request $request, PendaftaranTA $pendaftaran): JsonResponse
    {
        if ($pendaftaran->status !== 'PENDING') {
            return $this->notPending();
        }

        $validated = $request->validate([
            'catatan' => ['required', 'string', 'max:1000'],
        ]);

        $pendaftaran->update([
            'status' => 'REJECTED',
            'catatan' => $validated['catatan'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran TA berhasil ditolak.',
            'data' => $this->single($request, $pendaftaran),
        ]);
    }

    /**
     * Menetapkan pembimbing utama dan co-pembimbing (sekaligus).
     */
    public function assignPembimbing(Request $request, PendaftaranTA $pendaftaran): JsonResponse
    {
        $validated = $request->validate([
            'dosen_utama_id' => ['required', 'integer', 'exists:dosens,id'],
            'dosen_co_id' => [
                'required',
                'integer',
                'exists:dosens,id',
                'different:dosen_utama_id',
            ],
        ]);

        if ($pendaftaran->status !== 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => 'Dosen pembimbing hanya dapat ditentukan untuk pendaftaran yang sudah disetujui.',
            ], 409);
        }

        if ($pendaftaran->pembimbing()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Pendaftaran TA ini sudah memiliki dosen pembimbing.',
            ], 409);
        }

        DB::transaction(function () use ($pendaftaran, $validated) {
            $pendaftaran->pembimbing()->create([
                'dosen_id' => $validated['dosen_utama_id'],
                'peran' => PembimbingTA::PERAN_UTAMA,
            ]);

            $pendaftaran->pembimbing()->create([
                'dosen_id' => $validated['dosen_co_id'],
                'peran' => PembimbingTA::PERAN_CO,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Dosen pembimbing TA berhasil ditentukan.',
            'data' => $this->single($request, $pendaftaran),
        ]);
    }

    /*
     * =========================================================
     * HELPER
     * =========================================================
     */

    private function single(Request $request, PendaftaranTA $pendaftaran): array
    {
        $pendaftaran->load(self::RELASI_LENGKAP);

        return (new PendaftaranTAResource($pendaftaran))->resolve($request);
    }

    private function validateForm(Request $request): array
    {
        return $request->validate([
            'jalur' => ['required', Rule::in(PendaftaranTA::JALUR)],
            'konsentrasi' => ['required', Rule::in(PendaftaranTA::KONSENTRASI)],

            'alamat' => ['required', 'string'],
            'tempat_lahir' => ['required', 'string', 'max:255'],
            'tanggal_lahir' => ['required', 'date', 'before:today'],
            'email_widyatama' => ['required', 'email', 'max:255'],
            'nomor_telepon' => ['required', 'string', 'max:20'],
            'ipk' => ['required', 'numeric', 'min:0', 'max:4'],
            'skor_toefl' => ['required', 'integer', 'min:0', 'max:700'],
            'judul_ta' => ['required', 'string'],

            'dosen_usulan_1_id' => ['required', 'integer', 'exists:dosens,id'],
            'dosen_usulan_2_id' => [
                'required',
                'integer',
                'exists:dosens,id',
                'different:dosen_usulan_1_id',
            ],
        ]);
    }

    /**
     * Pastikan pendaftaran milik mahasiswa yang login dan masih bisa diedit
     * (DRAFT atau REJECTED). Mengembalikan response error, atau null jika boleh.
     */
    private function denyUnlessEditableOwner(
        Request $request,
        PendaftaranTA $pendaftaran
    ): ?JsonResponse {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        if (!$this->ownedBy($pendaftaran, $mahasiswa->id)) {
            return $this->forbidden();
        }

        if (!in_array($pendaftaran->status, ['DRAFT', 'REJECTED'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Pendaftaran yang sedang diproses atau sudah disetujui tidak dapat diubah.',
            ], 409);
        }

        return null;
    }

    private function ownedBy(PendaftaranTA $pendaftaran, int $mahasiswaId): bool
    {
        return (int) $pendaftaran->mahasiswa_id === $mahasiswaId;
    }

    private function forbidden(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Kamu tidak memiliki akses ke pendaftaran TA ini.',
        ], 403);
    }

    private function mahasiswaNotFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Data mahasiswa tidak ditemukan.',
        ], 404);
    }

    private function dosenNotFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Data dosen tidak ditemukan.',
        ], 404);
    }

    private function notPending(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Pendaftaran TA ini tidak sedang menunggu verifikasi.',
        ], 409);
    }
}
