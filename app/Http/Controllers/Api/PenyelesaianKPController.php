<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksKpAccess;
use App\Http\Controllers\Controller;
use App\Http\Resources\PenyelesaianKPResource;
use App\Models\PenyelesaianKP;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Penyelesaian KP dua tahap.
 *
 * TAHAP 1 (Submit Awal): Laporan KP, Scan Kartu Bimbingan, Scan Kuesioner
 *   PENDING (menunggu dosen) -> dosen konfirmasi (dosen_confirmed_at terisi)
 *   -> PENDING (menunggu staff) -> staff: APPROVED atau REJECTED (revisi).
 *   Dosen juga bisa REJECTED (revisi) pada langkah pertama.
 *
 *   [OFFLINE] mahasiswa mencetak laporan, menyerahkan ke perpustakaan,
 *   lalu menerima Surat Tanda Terima.
 *
 * TAHAP 2 (Submit Akhir): Scan Surat Tanda Terima, Soft file Laporan final
 *   Hanya bisa diajukan setelah tahap 1 APPROVED.
 *   PENDING -> staff: COMPLETED (proses KP selesai) atau REJECTED (revisi).
 *
 * Revisi (REJECTED): mahasiswa mengirim ulang seluruh berkas tahap tersebut.
 */
class PenyelesaianKPController extends Controller
{
    use ChecksKpAccess;

    private const TAHAP_1_BERKAS = [
        'laporan' => 'laporan_kp',
        'kartu_bimbingan' => 'scan_kartu_bimbingan',
        'kuesioner' => 'scan_kuesioner',
    ];

    private const TAHAP_2_BERKAS = [
        'tanda_terima' => 'scan_tanda_terima',
        'laporan_final' => 'laporan_final',
    ];

    private const MAKS_UKURAN_KB = 10240;

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

        $pendaftaran = $this->activePendaftaran($mahasiswa->id);

        $rows = $pendaftaran
            ? $pendaftaran->penyelesaian()->with('dokumen')->get()->keyBy('tahap')
            : collect();

        $resolve = fn (?PenyelesaianKP $row) => $row
            ? (new PenyelesaianKPResource($row))->resolve($request)
            : null;

        return response()->json([
            'success' => true,
            'message' => $pendaftaran
                ? 'Data penyelesaian KP berhasil diambil.'
                : 'Belum ada pendaftaran KP yang disetujui.',
            'data' => [
                'tahap_1' => $resolve($rows->get(1)),
                'tahap_2' => $resolve($rows->get(2)),
                'kp_selesai' => $rows->get(2)?->status === 'COMPLETED',
            ],
        ]);
    }

    public function submitTahap1(Request $request): JsonResponse
    {
        return $this->submit($request, 1, self::TAHAP_1_BERKAS);
    }

    public function submitTahap2(Request $request): JsonResponse
    {
        return $this->submit($request, 2, self::TAHAP_2_BERKAS);
    }

    /*
     * =========================================================
     * DOSEN PEMBIMBING (konfirmasi laporan tahap 1)
     * =========================================================
     */

    /**
     * Daftar penyelesaian tahap 1 milik mahasiswa bimbingan.
     * Query opsional: ?status=PENDING|APPROVED|REJECTED
     */
    public function indexForDosen(Request $request): JsonResponse
    {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return response()->json([
                'success' => false,
                'message' => 'Data dosen tidak ditemukan.',
            ], 404);
        }

        $validated = $request->validate([
            'status' => ['nullable', 'in:PENDING,APPROVED,REJECTED'],
        ]);

        $query = PenyelesaianKP::with([
            'dokumen',
            'pendaftaranKP.mahasiswa.user',
        ])
            ->where('tahap', 1)
            ->whereHas('pendaftaranKP.pembimbing', function ($pembimbing) use ($dosen) {
                $pembimbing->where('dosen_id', $dosen->id);
            })
            ->latest('id');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        return $this->collectionResponse($request, $query->get());
    }

    public function dosenApprove(Request $request, PenyelesaianKP $penyelesaian): JsonResponse
    {
        $penyelesaian->load('pendaftaranKP.pembimbing');

        if ($denied = $this->denyUnlessPembimbing($request, $penyelesaian->pendaftaranKP)) {
            return $denied;
        }

        if ($denied = $this->denyUnlessWaitingForDosen($penyelesaian)) {
            return $denied;
        }

        $penyelesaian->update(['dosen_confirmed_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan KP dikonfirmasi dan diteruskan ke staff.',
            'data' => $this->single($request, $penyelesaian),
        ]);
    }

    public function dosenReject(Request $request, PenyelesaianKP $penyelesaian): JsonResponse
    {
        $penyelesaian->load('pendaftaranKP.pembimbing');

        if ($denied = $this->denyUnlessPembimbing($request, $penyelesaian->pendaftaranKP)) {
            return $denied;
        }

        if ($denied = $this->denyUnlessWaitingForDosen($penyelesaian)) {
            return $denied;
        }

        $validated = $request->validate([
            'catatan' => ['required', 'string', 'max:1000'],
        ]);

        $penyelesaian->update([
            'status' => 'REJECTED',
            'catatan' => $validated['catatan'],
            'dosen_confirmed_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan KP dikembalikan untuk direvisi.',
            'data' => $this->single($request, $penyelesaian),
        ]);
    }

    /*
     * =========================================================
     * STAFF / SEKPRODI / KAPRODI
     * =========================================================
     */

    /**
     * Daftar penyelesaian yang sudah dikirim mahasiswa.
     * Query opsional: ?tahap=1|2 dan ?status=PENDING|APPROVED|REJECTED|COMPLETED
     */
    public function indexForStaff(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tahap' => ['nullable', 'in:1,2'],
            'status' => ['nullable', 'in:PENDING,APPROVED,REJECTED,COMPLETED'],
        ]);

        $query = PenyelesaianKP::with([
            'dokumen',
            'pendaftaranKP.mahasiswa.user',
        ])->latest('id');

        if (!empty($validated['tahap'])) {
            $query->where('tahap', (int) $validated['tahap']);
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        return $this->collectionResponse($request, $query->get());
    }

    /**
     * Tahap 1: APPROVED. Tahap 2: COMPLETED (proses KP selesai).
     */
    public function staffApprove(Request $request, PenyelesaianKP $penyelesaian): JsonResponse
    {
        if ($denied = $this->denyUnlessWaitingForStaff($penyelesaian)) {
            return $denied;
        }

        $penyelesaian->update([
            'status' => $penyelesaian->tahap === 1 ? 'APPROVED' : 'COMPLETED',
            'catatan' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => $penyelesaian->tahap === 1
                ? 'Penyelesaian tahap 1 disetujui. Mahasiswa dapat mencetak laporan dan menyerahkannya ke perpustakaan.'
                : 'Proses KP dinyatakan selesai.',
            'data' => $this->single($request, $penyelesaian),
        ]);
    }

    public function staffReject(Request $request, PenyelesaianKP $penyelesaian): JsonResponse
    {
        if ($denied = $this->denyUnlessWaitingForStaff($penyelesaian)) {
            return $denied;
        }

        $validated = $request->validate([
            'catatan' => ['required', 'string', 'max:1000'],
        ]);

        $penyelesaian->update([
            'status' => 'REJECTED',
            'catatan' => $validated['catatan'],
            'dosen_confirmed_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Penyelesaian dikembalikan untuk direvisi.',
            'data' => $this->single($request, $penyelesaian),
        ]);
    }

    /*
     * =========================================================
     * HELPER
     * =========================================================
     */

    /**
     * Kirim (atau kirim ulang setelah revisi) berkas satu tahap.
     *
     * @param  array<string, string>  $berkas  nama field => jenis dokumen
     */
    private function submit(Request $request, int $tahap, array $berkas): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        $pendaftaran = $this->activePendaftaran($mahasiswa->id);

        if (!$pendaftaran || !$pendaftaran->pembimbing) {
            return response()->json([
                'success' => false,
                'message' => 'Penyelesaian KP hanya bisa diajukan setelah pendaftaran KP disetujui dan dosen pembimbing ditetapkan.',
            ], 409);
        }

        $rows = $pendaftaran->penyelesaian()->get()->keyBy('tahap');

        if ($tahap === 2 && $rows->get(1)?->status !== 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => 'Tahap 2 baru bisa diajukan setelah tahap 1 disetujui.',
            ], 409);
        }

        $existing = $rows->get($tahap);

        if ($existing && $existing->status !== 'REJECTED') {
            return response()->json([
                'success' => false,
                'message' => $existing->status === 'PENDING'
                    ? "Tahap {$tahap} sedang menunggu verifikasi."
                    : "Tahap {$tahap} sudah selesai diproses.",
            ], 409);
        }

        $rules = [];

        foreach (array_keys($berkas) as $field) {
            $rules[$field] = [
                'required',
                'file',
                'mimes:pdf',
                'max:' . self::MAKS_UKURAN_KB,
            ];
        }

        $request->validate($rules);

        // Simpan file baru dulu; berkas lama (jika revisi) dihapus setelah berhasil.
        $direktori = "dokumen-kp/penyelesaian/{$pendaftaran->id}/tahap-{$tahap}";
        $tersimpan = [];

        foreach ($berkas as $field => $jenis) {
            $file = $request->file($field);

            $tersimpan[] = [
                'jenis' => $jenis,
                'nama_file' => $file->getClientOriginalName(),
                'path' => $file->store($direktori, 'local'),
                'ukuran' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ];
        }

        $berkasLama = $existing ? $existing->dokumen()->get() : collect();

        $penyelesaian = DB::transaction(function () use ($pendaftaran, $tahap, $tersimpan, $berkasLama) {
            $penyelesaian = $pendaftaran->penyelesaian()->updateOrCreate(
                ['tahap' => $tahap],
                [
                    'status' => 'PENDING',
                    'catatan' => null,
                    'dosen_confirmed_at' => null,
                    'submitted_at' => now(),
                ]
            );

            foreach ($tersimpan as $dokumen) {
                $penyelesaian->dokumen()->create($dokumen);
            }

            foreach ($berkasLama as $lama) {
                $lama->delete();
            }

            return $penyelesaian;
        });

        foreach ($berkasLama as $lama) {
            Storage::disk('local')->delete($lama->path);
        }

        return response()->json([
            'success' => true,
            'message' => $tahap === 1
                ? 'Penyelesaian tahap 1 berhasil dikirim. Menunggu konfirmasi dosen pembimbing dan verifikasi staff.'
                : 'Penyelesaian tahap 2 berhasil dikirim. Menunggu verifikasi staff.',
            'data' => $this->single($request, $penyelesaian),
        ], $existing ? 200 : 201);
    }

    /**
     * Konfirmasi dosen hanya berlaku untuk tahap 1 yang PENDING
     * dan belum dikonfirmasi.
     */
    private function denyUnlessWaitingForDosen(PenyelesaianKP $penyelesaian): ?JsonResponse
    {
        if (
            $penyelesaian->tahap !== 1
            || $penyelesaian->status !== 'PENDING'
            || $penyelesaian->dosen_confirmed_at !== null
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Penyelesaian ini tidak sedang menunggu konfirmasi dosen pembimbing.',
            ], 409);
        }

        return null;
    }

    private function denyUnlessWaitingForStaff(PenyelesaianKP $penyelesaian): ?JsonResponse
    {
        if ($penyelesaian->status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'Penyelesaian ini tidak sedang menunggu verifikasi.',
            ], 409);
        }

        if ($penyelesaian->tahap === 1 && $penyelesaian->dosen_confirmed_at === null) {
            return response()->json([
                'success' => false,
                'message' => 'Penyelesaian tahap 1 masih menunggu konfirmasi dosen pembimbing.',
            ], 409);
        }

        return null;
    }

    private function collectionResponse(Request $request, $items): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Data penyelesaian KP berhasil diambil.',
            'data' => PenyelesaianKPResource::collection($items)->resolve($request),
        ]);
    }

    private function single(Request $request, PenyelesaianKP $penyelesaian): array
    {
        $penyelesaian->load('dokumen');

        return (new PenyelesaianKPResource($penyelesaian))->resolve($request);
    }
}
