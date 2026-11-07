<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PengajuanSidangTAResource;
use App\Models\Dosen;
use App\Models\JadwalSidangTA;
use App\Models\PengajuanSidangTA;
use App\Support\BentrokJadwalSidang;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Plot dosen penguji dan jadwal sidang TA.
 *
 * Staff menetapkan jadwal (tanggal, jam mulai/selesai, ruang) dan 1-3 dosen penguji
 * untuk pengajuan sidang yang sudah APPROVED (siap diuji), dengan pengecekan bentrok.
 * Dosen penguji melihat jadwal menguji miliknya; mahasiswa dan pembimbing melihat
 * jadwal lewat endpoint pengajuan sidang.
 */
class JadwalSidangTAController extends Controller
{
    public const MIN_PENGUJI = 1;

    public const MAKS_PENGUJI = 3;

    /** Lampiran yang boleh dibaca dosen penguji untuk menilai. */
    public const LAMPIRAN_UNTUK_PENGUJI = ['draf_laporan', 'jurnal'];

    private const RELASI = [
        'pendaftaranTA.mahasiswa.user',
        'pendaftaranTA.pembimbing.dosen.user',
        'dokumen',
        'jadwal.penguji.dosen.user',
    ];

    /*
     * =========================================================
     * STAFF / SEKPRODI / KAPRODI
     * =========================================================
     */

    /**
     * Daftar mahasiswa yang siap diuji (pengajuan sidang APPROVED).
     * Query opsional: ?jadwal=belum|sudah
     */
    public function siapDiuji(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'jadwal' => ['nullable', 'in:belum,sudah'],
        ]);

        $query = PengajuanSidangTA::with(self::RELASI)
            ->where('status', 'APPROVED')
            ->latest('id');

        if (($validated['jadwal'] ?? null) === 'belum') {
            $query->whereDoesntHave('jadwal');
        }

        if (($validated['jadwal'] ?? null) === 'sudah') {
            $query->whereHas('jadwal');
        }

        return response()->json([
            'success' => true,
            'message' => 'Data mahasiswa siap diuji berhasil diambil.',
            'data' => PengajuanSidangTAResource::collection($query->get())
                ->resolve($request),
        ]);
    }

    /**
     * Cek bentrok tanpa menyimpan apa pun (untuk dipakai UI sebelum menyimpan).
     */
    public function cekBentrok(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($denied = $this->denyUnlessSiapDiuji($sidang)) {
            return $denied;
        }

        $data = $this->validateJadwal($request, $sidang);

        $bentrok = $this->cariBentrok($sidang, $data);

        return response()->json([
            'success' => true,
            'message' => $bentrok === []
                ? 'Jadwal tersedia, tidak ada bentrok.'
                : 'Ditemukan jadwal yang bentrok.',
            'data' => [
                'tersedia' => $bentrok === [],
                'bentrok' => $bentrok,
            ],
        ]);
    }

    /**
     * Menetapkan (atau menjadwalkan ulang) jadwal dan dosen penguji.
     */
    public function simpan(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($denied = $this->denyUnlessSiapDiuji($sidang)) {
            return $denied;
        }

        $data = $this->validateJadwal($request, $sidang);

        $bentrok = $this->cariBentrok($sidang, $data);

        if ($bentrok !== []) {
            return response()->json([
                'success' => false,
                'message' => 'Jadwal bentrok dengan sidang lain.',
                'data' => ['bentrok' => $bentrok],
            ], 409);
        }

        $jadwal = DB::transaction(function () use ($sidang, $data) {
            $jadwal = JadwalSidangTA::updateOrCreate(
                ['pengajuan_sidang_ta_id' => $sidang->id],
                [
                    'tanggal' => $data['tanggal'],
                    'waktu_mulai' => $data['mulai'],
                    'waktu_selesai' => $data['selesai'],
                    'ruang' => $data['ruang'],
                ]
            );

            $jadwal->penguji()->delete();

            foreach ($data['dosen_penguji_ids'] as $indeks => $dosenId) {
                $jadwal->penguji()->create([
                    'dosen_id' => $dosenId,
                    'urutan' => $indeks + 1,
                ]);
            }

            return $jadwal;
        });

        return response()->json([
            'success' => true,
            'message' => $jadwal->wasRecentlyCreated
                ? 'Jadwal sidang dan dosen penguji berhasil ditetapkan.'
                : 'Jadwal sidang dan dosen penguji berhasil diperbarui.',
            'data' => $this->single($request, $sidang),
        ], $jadwal->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Membatalkan jadwal (pengajuan tetap APPROVED / siap diuji).
     */
    public function hapus(PengajuanSidangTA $sidang): JsonResponse
    {
        $jadwal = $sidang->jadwal;

        if (!$jadwal) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan sidang ini belum memiliki jadwal.',
            ], 404);
        }

        $jadwal->delete();

        return response()->json([
            'success' => true,
            'message' => 'Jadwal sidang berhasil dibatalkan.',
        ]);
    }

    /*
     * =========================================================
     * DOSEN PENGUJI
     * =========================================================
     */

    /**
     * Jadwal menguji milik dosen yang sedang login (TA-P-01).
     * Query opsional: ?dari=Y-m-d&sampai=Y-m-d
     */
    public function jadwalPenguji(Request $request): JsonResponse
    {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return $this->dosenNotFound();
        }

        $validated = $request->validate([
            'dari' => ['nullable', 'date_format:Y-m-d'],
            'sampai' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:dari'],
        ]);

        $query = JadwalSidangTA::with($this->relasiJadwal())
            ->whereHas('penguji', function ($penguji) use ($dosen) {
                $penguji->where('dosen_id', $dosen->id);
            })
            ->orderBy('tanggal')
            ->orderBy('waktu_mulai');

        if (!empty($validated['dari'])) {
            $query->whereDate('tanggal', '>=', $validated['dari']);
        }

        if (!empty($validated['sampai'])) {
            $query->whereDate('tanggal', '<=', $validated['sampai']);
        }

        $data = $query->get()
            ->map(fn (JadwalSidangTA $jadwal) => $this->formatJadwal($jadwal, $dosen->id))
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'message' => 'Jadwal menguji berhasil diambil.',
            'data' => $data,
        ]);
    }

    /**
     * Detail satu sidang yang diuji, termasuk draf laporan yang boleh dibaca penguji.
     */
    public function detailPenguji(Request $request, JadwalSidangTA $jadwal): JsonResponse
    {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return $this->dosenNotFound();
        }

        $jadwal->load($this->relasiJadwal());

        if (!$jadwal->penguji->contains('dosen_id', $dosen->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu bukan dosen penguji pada sidang ini.',
            ], 403);
        }

        $row = $this->formatJadwal($jadwal, $dosen->id);

        $row['dokumen'] = $jadwal->pengajuanSidang->dokumen
            ->whereIn('jenis', self::LAMPIRAN_UNTUK_PENGUJI)
            ->map(fn ($dokumen) => [
                'id' => $dokumen->id,
                'jenis' => $dokumen->jenis,
                'nama_file' => $dokumen->nama_file,
                'ukuran' => $dokumen->ukuran,
                'mime_type' => $dokumen->mime_type,
            ])
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'message' => 'Data sidang berhasil diambil.',
            'data' => $row,
        ]);
    }

    /*
     * =========================================================
     * HELPER
     * =========================================================
     */

    private function denyUnlessSiapDiuji(PengajuanSidangTA $sidang): ?JsonResponse
    {
        if ($sidang->status !== 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => 'Jadwal hanya dapat ditetapkan untuk pengajuan sidang yang sudah disetujui (siap diuji).',
            ], 409);
        }

        return null;
    }

    /**
     * Validasi isian jadwal. Mengembalikan data siap simpan, dengan jam
     * dinormalisasi ke H:i:s pada kunci 'mulai' dan 'selesai'.
     *
     * @return array<string, mixed>
     */
    private function validateJadwal(Request $request, PengajuanSidangTA $sidang): array
    {
        $validated = $request->validate([
            'tanggal' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'waktu_mulai' => ['required', 'date_format:H:i'],
            'waktu_selesai' => ['required', 'date_format:H:i', 'after:waktu_mulai'],
            'ruang' => ['required', 'string', 'max:100'],
            'dosen_penguji_ids' => [
                'required',
                'array',
                'min:' . self::MIN_PENGUJI,
                'max:' . self::MAKS_PENGUJI,
            ],
            'dosen_penguji_ids.*' => ['integer', 'distinct', 'exists:dosens,id'],
        ]);

        $idPenguji = array_map('intval', $validated['dosen_penguji_ids']);

        // Pembimbing (utama maupun co) tidak boleh menguji mahasiswanya sendiri.
        $idPembimbing = $sidang->pendaftaranTA->pembimbing()
            ->pluck('dosen_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (array_intersect($idPenguji, $idPembimbing) !== []) {
            throw ValidationException::withMessages([
                'dosen_penguji_ids' => [
                    'Dosen pembimbing tidak boleh menjadi dosen penguji mahasiswanya sendiri.',
                ],
            ]);
        }

        return [
            'tanggal' => $validated['tanggal'],
            'mulai' => $validated['waktu_mulai'] . ':00',
            'selesai' => $validated['waktu_selesai'] . ':00',
            'ruang' => trim($validated['ruang']),
            'dosen_penguji_ids' => $idPenguji,
        ];
    }

    /**
     * @param  array<string, mixed>  $data  hasil validateJadwal()
     * @return list<array<string, mixed>>
     */
    private function cariBentrok(PengajuanSidangTA $sidang, array $data): array
    {
        return BentrokJadwalSidang::cari(
            $data['tanggal'],
            $data['mulai'],
            $data['selesai'],
            $data['ruang'],
            $data['dosen_penguji_ids'],
            $sidang->jadwal?->id
        );
    }

    private function single(Request $request, PengajuanSidangTA $sidang): array
    {
        $sidang->load(self::RELASI);

        return (new PengajuanSidangTAResource($sidang))->resolve($request);
    }

    /**
     * @return list<string>
     */
    private function relasiJadwal(): array
    {
        return [
            'penguji.dosen.user',
            'pengajuanSidang.pendaftaranTA.mahasiswa.user',
            'pengajuanSidang.pendaftaranTA.pembimbing.dosen.user',
            'pengajuanSidang.dokumen',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatJadwal(JadwalSidangTA $jadwal, int $dosenId): array
    {
        $sidang = $jadwal->pengajuanSidang;
        $ta = $sidang->pendaftaranTA;
        $user = $ta->mahasiswa?->user;

        return [
            'id' => $jadwal->id,
            'pengajuan_sidang_id' => $sidang->id,
            'tanggal' => $jadwal->tanggal->format('Y-m-d'),
            'waktu_mulai' => substr((string) $jadwal->waktu_mulai, 0, 5),
            'waktu_selesai' => substr((string) $jadwal->waktu_selesai, 0, 5),
            'ruang' => $jadwal->ruang,
            'urutan_saya' => $jadwal->penguji->firstWhere('dosen_id', $dosenId)?->urutan,
            'mahasiswa' => $user ? [
                'id' => $ta->mahasiswa->id,
                'nomor_induk' => $user->nomor_induk,
                'name' => $user->name,
            ] : null,
            'judul_ta' => $sidang->judul_ta,
            'jalur' => $ta->jalur,
            'dosen_penguji' => $jadwal->penguji
                ->map(fn ($penguji) => [
                    'urutan' => $penguji->urutan,
                ] + (self::dosen($penguji->dosen) ?? []))
                ->values()
                ->all(),
            'dosen_pembimbing' => [
                'utama' => self::dosen($ta->pembimbing->firstWhere('peran', 'utama')?->dosen),
                'co' => self::dosen($ta->pembimbing->firstWhere('peran', 'co')?->dosen),
            ],
        ];
    }

    private static function dosen(?Dosen $dosen): ?array
    {
        $user = $dosen?->user;

        return $user ? [
            'id' => $dosen->id,
            'nomor_induk' => $user->nomor_induk,
            'name' => $user->name,
        ] : null;
    }

    private function dosenNotFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Data dosen tidak ditemukan.',
        ], 404);
    }
}
