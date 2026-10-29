<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PengajuanSidangTAResource;
use App\Models\PendaftaranTA;
use App\Models\PengajuanSidangTA;
use App\Support\LampiranSidangTA;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Alur pengajuan sidang TA:
 *
 *  DRAFT    -> mahasiswa melengkapi data tambahan dan mengunggah lampiran
 *  PENDING  -> mahasiswa mengirim (semua lampiran wajib sudah lengkap)
 *              1) menunggu konfirmasi kesiapan dari pembimbing utama
 *              2) setelah itu menunggu verifikasi dokumen staff
 *  APPROVED -> dokumen lolos verifikasi: mahasiswa siap diuji
 *              (penguji dan jadwal ditetapkan di langkah berikutnya)
 *  REJECTED -> dikembalikan oleh dosen atau staff; mahasiswa memperbaiki
 *              lalu mengirim ulang
 */
class PengajuanSidangTAController extends Controller
{
    private const RELASI = [
        'pendaftaranTA.mahasiswa.user',
        'pendaftaranTA.pembimbing.dosen.user',
        'dokumen',
    ];

    /*
     * =========================================================
     * MAHASISWA
     * =========================================================
     */

    /**
     * Daftar lampiran untuk checklist form.
     * Query: ?jalur=skripsi|jurnal&konsentrasi=reg_a|reg_b&jurnal_berbayar=1|0
     */
    public function lampiran(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'jalur' => ['required', Rule::in(PendaftaranTA::JALUR)],
            'konsentrasi' => ['required', Rule::in(PendaftaranTA::KONSENTRASI)],
            'jurnal_berbayar' => ['nullable', 'boolean'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daftar lampiran berhasil diambil.',
            'data' => LampiranSidangTA::daftar(
                $validated['jalur'],
                $validated['konsentrasi'],
                $validated['jalur'] === 'jurnal'
                    && $request->boolean('jurnal_berbayar')
            ),
        ]);
    }

    /**
     * Pengajuan sidang terbaru milik mahasiswa yang sedang login.
     */
    public function show(Request $request): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        $sidang = PengajuanSidangTA::with(self::RELASI)
            ->whereHas('pendaftaranTA', function ($query) use ($mahasiswa) {
                $query->where('mahasiswa_id', $mahasiswa->id);
            })
            ->latest('id')
            ->first();

        return response()->json([
            'success' => true,
            'message' => $sidang
                ? 'Data pengajuan sidang berhasil diambil.'
                : 'Belum ada pengajuan sidang.',
            'data' => $sidang ? $this->single($request, $sidang) : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        $ta = PendaftaranTA::with('pembimbing')
            ->where('mahasiswa_id', $mahasiswa->id)
            ->where('status', 'APPROVED')
            ->latest('id')
            ->first();

        if (!$ta || !$ta->pembimbing->firstWhere('peran', 'utama')) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan sidang hanya bisa dibuat setelah pendaftaran TA disetujui dan dosen pembimbing ditetapkan.',
            ], 409);
        }

        $sudahAda = $ta->pengajuanSidang()
            ->whereIn('status', ['DRAFT', 'PENDING', 'APPROVED'])
            ->exists();

        if ($sudahAda) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu sudah memiliki pengajuan sidang yang sedang diisi, diproses, atau sudah disetujui.',
            ], 409);
        }

        $validated = $this->validateData($request, $ta);

        // Data tambahan terisi otomatis dari pendaftaran TA, lalu ditimpa isian mahasiswa.
        $sidang = $ta->pengajuanSidang()->create(array_merge([
            'alamat' => $ta->alamat,
            'tempat_lahir' => $ta->tempat_lahir,
            'tanggal_lahir' => $ta->tanggal_lahir,
            'email_widyatama' => $ta->email_widyatama,
            'nomor_telepon' => $ta->nomor_telepon,
            'ipk' => $ta->ipk,
            'skor_toefl' => $ta->skor_toefl,
            'judul_ta' => $ta->judul_ta,
            'jurnal_berbayar' => false,
        ], $validated, [
            'status' => 'DRAFT',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan sidang berhasil dibuat. Lengkapi data dan lampiran, lalu kirim.',
            'data' => $this->single($request, $sidang),
        ], 201);
    }

    /**
     * Mengubah data tambahan. Hanya boleh saat DRAFT atau REJECTED.
     * Jika jurnal_berbayar berubah, lampiran yang tidak lagi berlaku dihapus.
     */
    public function update(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($denied = $this->denyUnlessEditableOwner($request, $sidang)) {
            return $denied;
        }

        $sidang->update($this->validateData($request, $sidang->pendaftaranTA));

        $boleh = $this->jenisBoleh($sidang);

        foreach ($sidang->dokumen()->whereNotIn('jenis', $boleh)->get() as $dokumen) {
            Storage::disk('local')->delete($dokumen->path);
            $dokumen->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan sidang berhasil diperbarui.',
            'data' => $this->single($request, $sidang),
        ]);
    }

    /**
     * Membatalkan pengajuan. Hanya boleh selama masih DRAFT.
     */
    public function destroy(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        if (!$this->ownedBy($sidang, $mahasiswa->id)) {
            return $this->forbiddenMahasiswa();
        }

        if ($sidang->status !== 'DRAFT') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya pengajuan yang masih berstatus DRAFT yang dapat dibatalkan.',
            ], 409);
        }

        foreach ($sidang->dokumen as $dokumen) {
            Storage::disk('local')->delete($dokumen->path);
            $dokumen->delete();
        }

        $sidang->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan sidang berhasil dibatalkan.',
        ]);
    }

    /**
     * Unggah (atau ganti) satu lampiran. Pas foto berformat JPG/PNG,
     * lampiran lain berformat PDF.
     */
    public function uploadDokumen(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($denied = $this->denyUnlessEditableOwner($request, $sidang)) {
            return $denied;
        }

        $request->validate([
            'jenis' => ['required', Rule::in($this->jenisBoleh($sidang))],
        ]);

        $jenis = $request->input('jenis');

        $request->validate([
            'file' => LampiranSidangTA::aturanFile($jenis),
        ]);

        $file = $request->file('file');
        $lama = $sidang->dokumen()->where('jenis', $jenis)->get();

        $path = $file->store(
            'dokumen-kp/ta/sidang/' . $sidang->id,
            'local'
        );

        $dokumen = $sidang->dokumen()->create([
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

        $ta = $sidang->pendaftaranTA;

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
                'lampiran' => LampiranSidangTA::checklist(
                    $ta->jalur,
                    $ta->konsentrasi,
                    (bool) $sidang->jurnal_berbayar,
                    $sidang->dokumen()->pluck('jenis')->all()
                ),
            ],
        ], 201);
    }

    /**
     * Kirim pengajuan (DRAFT/REJECTED -> PENDING).
     */
    public function submit(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($denied = $this->denyUnlessEditableOwner($request, $sidang)) {
            return $denied;
        }

        $ta = $sidang->pendaftaranTA;

        $kurang = LampiranSidangTA::kurang(
            $ta->jalur,
            $ta->konsentrasi,
            (bool) $sidang->jurnal_berbayar,
            $sidang->dokumen()->pluck('jenis')->all()
        );

        if ($kurang !== []) {
            return response()->json([
                'success' => false,
                'message' => 'Lampiran wajib belum lengkap.',
                'data' => ['lampiran_kurang' => $kurang],
            ], 422);
        }

        $sidang->update([
            'status' => 'PENDING',
            'catatan' => null,
            'dosen_confirmed_at' => null,
            'submitted_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan sidang berhasil dikirim. Menunggu konfirmasi kesiapan dari dosen pembimbing.',
            'data' => $this->single($request, $sidang),
        ]);
    }

    /*
     * =========================================================
     * DOSEN PEMBIMBING (utama mengonfirmasi, co hanya melihat)
     * =========================================================
     */

    /**
     * Daftar pengajuan sidang mahasiswa bimbingan (DRAFT tidak ditampilkan).
     * Query opsional: ?status=PENDING|APPROVED|REJECTED
     */
    public function indexForDosen(Request $request): JsonResponse
    {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return $this->dosenNotFound();
        }

        $validated = $request->validate([
            'status' => ['nullable', 'in:PENDING,APPROVED,REJECTED'],
        ]);

        $query = PengajuanSidangTA::with(self::RELASI)
            ->where('status', '!=', 'DRAFT')
            ->whereHas('pendaftaranTA.pembimbing', function ($pembimbing) use ($dosen) {
                $pembimbing->where('dosen_id', $dosen->id);
            })
            ->latest('id');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $data = $query->get()
            ->map(function (PengajuanSidangTA $item) use ($request, $dosen) {
                $row = (new PengajuanSidangTAResource($item))->resolve($request);
                $row['peran_saya'] = $this->peranDosen($item, $dosen->id);

                return $row;
            })
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'message' => 'Data pengajuan sidang mahasiswa bimbingan berhasil diambil.',
            'data' => $data,
        ]);
    }

    public function showForDosen(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return $this->dosenNotFound();
        }

        $sidang->load(self::RELASI);

        $peran = $this->peranDosen($sidang, $dosen->id);

        if (!$peran) {
            return $this->forbiddenDosen();
        }

        if ($sidang->status === 'DRAFT') {
            return $this->belumDikirim();
        }

        $row = (new PengajuanSidangTAResource($sidang))->resolve($request);
        $row['peran_saya'] = $peran;

        return response()->json([
            'success' => true,
            'message' => 'Data pengajuan sidang berhasil diambil.',
            'data' => $row,
        ]);
    }

    /**
     * Pembimbing utama menyatakan mahasiswa siap sidang; pengajuan diteruskan ke staff.
     */
    public function dosenApprove(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($denied = $this->denyUnlessPembimbingUtamaMenunggu($request, $sidang)) {
            return $denied;
        }

        $sidang->update(['dosen_confirmed_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Kesiapan sidang dikonfirmasi dan diteruskan ke staff.',
            'data' => $this->single($request, $sidang),
        ]);
    }

    public function dosenReject(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($denied = $this->denyUnlessPembimbingUtamaMenunggu($request, $sidang)) {
            return $denied;
        }

        $validated = $request->validate([
            'catatan' => ['required', 'string', 'max:1000'],
        ]);

        $sidang->update([
            'status' => 'REJECTED',
            'catatan' => $validated['catatan'],
            'dosen_confirmed_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan sidang dikembalikan kepada mahasiswa.',
            'data' => $this->single($request, $sidang),
        ]);
    }

    /*
     * =========================================================
     * STAFF / SEKPRODI / KAPRODI
     * =========================================================
     */

    /**
     * Daftar pengajuan yang sudah dikirim (DRAFT tidak ditampilkan).
     * Query opsional: ?status=PENDING|APPROVED|REJECTED dan ?menunggu=dosen|staff
     */
    public function indexForStaff(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:PENDING,APPROVED,REJECTED'],
            'menunggu' => ['nullable', 'in:dosen,staff'],
        ]);

        $query = PengajuanSidangTA::with(self::RELASI)
            ->where('status', '!=', 'DRAFT')
            ->latest('id');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (!empty($validated['menunggu'])) {
            $query->where('status', 'PENDING');

            $validated['menunggu'] === 'dosen'
                ? $query->whereNull('dosen_confirmed_at')
                : $query->whereNotNull('dosen_confirmed_at');
        }

        return response()->json([
            'success' => true,
            'message' => 'Data pengajuan sidang berhasil diambil.',
            'data' => PengajuanSidangTAResource::collection($query->get())
                ->resolve($request),
        ]);
    }

    public function showForStaff(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($sidang->status === 'DRAFT') {
            return $this->belumDikirim();
        }

        return response()->json([
            'success' => true,
            'message' => 'Data pengajuan sidang berhasil diambil.',
            'data' => $this->single($request, $sidang),
        ]);
    }

    /**
     * Dokumen lolos verifikasi: mahasiswa siap diuji.
     */
    public function staffApprove(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($denied = $this->denyUnlessMenungguStaff($sidang)) {
            return $denied;
        }

        $sidang->update([
            'status' => 'APPROVED',
            'catatan' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Dokumen sidang disetujui. Mahasiswa siap diuji.',
            'data' => $this->single($request, $sidang),
        ]);
    }

    public function staffReject(Request $request, PengajuanSidangTA $sidang): JsonResponse
    {
        if ($denied = $this->denyUnlessMenungguStaff($sidang)) {
            return $denied;
        }

        $validated = $request->validate([
            'catatan' => ['required', 'string', 'max:1000'],
        ]);

        $sidang->update([
            'status' => 'REJECTED',
            'catatan' => $validated['catatan'],
            'dosen_confirmed_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan sidang dikembalikan kepada mahasiswa.',
            'data' => $this->single($request, $sidang),
        ]);
    }

    /*
     * =========================================================
     * HELPER
     * =========================================================
     */

    private function single(Request $request, PengajuanSidangTA $sidang): array
    {
        $sidang->load(self::RELASI);

        return (new PengajuanSidangTAResource($sidang))->resolve($request);
    }

    /**
     * Semua field bersifat opsional: yang tidak dikirim memakai data pendaftaran TA
     * (saat membuat) atau nilai yang sudah ada (saat mengubah).
     */
    private function validateData(Request $request, PendaftaranTA $ta): array
    {
        $validated = $request->validate([
            'alamat' => ['sometimes', 'required', 'string'],
            'tempat_lahir' => ['sometimes', 'required', 'string', 'max:255'],
            'tanggal_lahir' => ['sometimes', 'required', 'date', 'before:today'],
            'email_widyatama' => ['sometimes', 'required', 'email', 'max:255'],
            'nomor_telepon' => ['sometimes', 'required', 'string', 'max:20'],
            'ipk' => ['sometimes', 'required', 'numeric', 'min:0', 'max:4'],
            'skor_toefl' => ['sometimes', 'required', 'integer', 'min:0', 'max:700'],
            'judul_ta' => ['sometimes', 'required', 'string'],
            'jurnal_berbayar' => ['sometimes', 'required', 'boolean'],
        ]);

        // Bukti bayar jurnal hanya relevan untuk jalur Jurnal.
        if (array_key_exists('jurnal_berbayar', $validated)) {
            $validated['jurnal_berbayar'] = $ta->jalur === 'jurnal'
                && (bool) $validated['jurnal_berbayar'];
        }

        return $validated;
    }

    /**
     * @return list<string>
     */
    private function jenisBoleh(PengajuanSidangTA $sidang): array
    {
        $ta = $sidang->pendaftaranTA;

        return LampiranSidangTA::jenisUntuk(
            $ta->jalur,
            $ta->konsentrasi,
            (bool) $sidang->jurnal_berbayar
        );
    }

    private function peranDosen(PengajuanSidangTA $sidang, int $dosenId): ?string
    {
        return $sidang->pendaftaranTA->pembimbing
            ->firstWhere('dosen_id', $dosenId)?->peran;
    }

    /**
     * Pastikan pengajuan milik mahasiswa yang login dan masih bisa diedit
     * (DRAFT atau REJECTED). Mengembalikan response error, atau null jika boleh.
     */
    private function denyUnlessEditableOwner(
        Request $request,
        PengajuanSidangTA $sidang
    ): ?JsonResponse {
        $mahasiswa = $request->user()->mahasiswa;

        if (!$mahasiswa) {
            return $this->mahasiswaNotFound();
        }

        if (!$this->ownedBy($sidang, $mahasiswa->id)) {
            return $this->forbiddenMahasiswa();
        }

        if (!in_array($sidang->status, ['DRAFT', 'REJECTED'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan yang sedang diproses atau sudah disetujui tidak dapat diubah.',
            ], 409);
        }

        return null;
    }

    private function ownedBy(PengajuanSidangTA $sidang, int $mahasiswaId): bool
    {
        return (int) $sidang->pendaftaranTA->mahasiswa_id === $mahasiswaId;
    }

    /**
     * Hanya pembimbing utama yang boleh mengonfirmasi, dan hanya saat
     * pengajuan menunggu konfirmasi dosen.
     */
    private function denyUnlessPembimbingUtamaMenunggu(
        Request $request,
        PengajuanSidangTA $sidang
    ): ?JsonResponse {
        $dosen = $request->user()->dosen;

        if (!$dosen) {
            return $this->dosenNotFound();
        }

        $sidang->load('pendaftaranTA.pembimbing');

        $peran = $this->peranDosen($sidang, $dosen->id);

        if (!$peran) {
            return $this->forbiddenDosen();
        }

        if ($peran !== 'utama') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya pembimbing utama yang dapat mengonfirmasi kesiapan sidang.',
            ], 403);
        }

        if ($sidang->status !== 'PENDING' || $sidang->dosen_confirmed_at !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan ini tidak sedang menunggu konfirmasi dosen pembimbing.',
            ], 409);
        }

        return null;
    }

    private function denyUnlessMenungguStaff(PengajuanSidangTA $sidang): ?JsonResponse
    {
        if ($sidang->status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan sidang ini tidak sedang menunggu verifikasi.',
            ], 409);
        }

        if ($sidang->dosen_confirmed_at === null) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan ini masih menunggu konfirmasi kesiapan dari dosen pembimbing.',
            ], 409);
        }

        return null;
    }

    private function belumDikirim(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Pengajuan sidang ini belum dikirim oleh mahasiswa.',
        ], 404);
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

    private function forbiddenMahasiswa(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Kamu tidak memiliki akses ke pengajuan sidang ini.',
        ], 403);
    }

    private function forbiddenDosen(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Kamu tidak memiliki akses ke pengajuan sidang ini.',
        ], 403);
    }
}
