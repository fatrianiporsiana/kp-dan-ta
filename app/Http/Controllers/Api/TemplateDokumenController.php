<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TemplateDokumenResource;
use App\Models\TemplateDokumen;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * Template dokumen yang diunduh pengguna (kuesioner KP, logbook TA, BAP sidang, dll).
 *
 * - Semua pengguna login bisa melihat dan mengunduh template yang
 *   `terlihat_mahasiswa = true`.
 * - Template internal (`terlihat_mahasiswa = false`, misalnya BAP sidang) hanya
 *   untuk dosen, staff, sekprodi, dan kaprodi. Mahasiswa mendapat 403.
 * - Hanya staff/sekprodi/kaprodi yang boleh mengelola template.
 *
 * Kode yang dipakai frontend (disarankan):
 *   kuesioner-kp  (kp, terlihat mahasiswa)
 *   logbook-ta    (ta, terlihat mahasiswa)
 *   bap-sidang-ta (ta, internal)
 */
class TemplateDokumenController extends Controller
{
    private const MAKS_UKURAN_KB = 10240;

    private const FORMAT_FILE = 'pdf,doc,docx,xls,xlsx';

    /*
     * =========================================================
     * SEMUA PENGGUNA LOGIN
     * =========================================================
     */

    /**
     * Daftar template yang boleh dilihat pengguna.
     * Query opsional: ?modul=kp|ta|umum
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'modul' => ['nullable', Rule::in(TemplateDokumen::MODUL)],
        ]);

        $query = TemplateDokumen::query()->orderBy('modul')->orderBy('nama');

        if (!$this->canViewInternal($request->user())) {
            $query->where('terlihat_mahasiswa', true);
        }

        if (!empty($validated['modul'])) {
            $query->where('modul', $validated['modul']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data template berhasil diambil.',
            'data' => TemplateDokumenResource::collection($query->get())
                ->resolve($request),
        ]);
    }

    /**
     * Unduh file template. Frontend harus memanggil dengan header Authorization
     * (fetch/axios lalu simpan sebagai blob).
     */
    public function download(Request $request, TemplateDokumen $template): Response
    {
        if (
            !$template->terlihat_mahasiswa
            && !$this->canViewInternal($request->user())
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu tidak memiliki akses ke template ini.',
            ], 403);
        }

        if (!Storage::disk('local')->exists($template->path)) {
            return response()->json([
                'success' => false,
                'message' => 'File template tidak ditemukan.',
            ], 404);
        }

        return Storage::disk('local')->download(
            $template->path,
            $template->nama_file
        );
    }

    /*
     * =========================================================
     * STAFF / SEKPRODI / KAPRODI (kelola template)
     * =========================================================
     */

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kode' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                'unique:template_dokumens,kode',
            ],
            'nama' => ['required', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string', 'max:1000'],
            'modul' => ['required', Rule::in(TemplateDokumen::MODUL)],
            'terlihat_mahasiswa' => ['nullable', 'boolean'],
            'file' => $this->aturanFile(),
        ]);

        $file = $request->file('file');

        $template = TemplateDokumen::create([
            'kode' => $validated['kode'],
            'nama' => $validated['nama'],
            'deskripsi' => $validated['deskripsi'] ?? null,
            'modul' => $validated['modul'],
            'terlihat_mahasiswa' => $request->boolean('terlihat_mahasiswa', true),
            'nama_file' => $file->getClientOriginalName(),
            'path' => $file->store('templates/' . $validated['kode'], 'local'),
            'ukuran' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil ditambahkan.',
            'data' => (new TemplateDokumenResource($template))->resolve($request),
        ], 201);
    }

    /**
     * Mengubah informasi template (tanpa file). Body JSON.
     */
    public function update(Request $request, TemplateDokumen $template): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['sometimes', 'required', 'string', 'max:255'],
            'deskripsi' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'modul' => ['sometimes', 'required', Rule::in(TemplateDokumen::MODUL)],
            'terlihat_mahasiswa' => ['sometimes', 'required', 'boolean'],
        ]);

        $template->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil diperbarui.',
            'data' => (new TemplateDokumenResource($template))->resolve($request),
        ]);
    }

    /**
     * Mengganti file template. Body form-data dengan field `file`.
     */
    public function replaceFile(Request $request, TemplateDokumen $template): JsonResponse
    {
        $request->validate([
            'file' => $this->aturanFile(),
        ]);

        $file = $request->file('file');
        $pathLama = $template->path;

        $template->update([
            'nama_file' => $file->getClientOriginalName(),
            'path' => $file->store('templates/' . $template->kode, 'local'),
            'ukuran' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        Storage::disk('local')->delete($pathLama);

        return response()->json([
            'success' => true,
            'message' => 'File template berhasil diganti.',
            'data' => (new TemplateDokumenResource($template))->resolve($request),
        ]);
    }

    public function destroy(TemplateDokumen $template): JsonResponse
    {
        Storage::disk('local')->delete($template->path);
        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil dihapus.',
        ]);
    }

    /*
     * =========================================================
     * HELPER
     * =========================================================
     */

    /**
     * Template internal boleh dilihat dosen, staff, sekprodi, dan kaprodi.
     */
    private function canViewInternal(User $user): bool
    {
        return $user->hasFullAccess()
            || in_array('dosen', $user->roleNames(), true);
    }

    private function aturanFile(): array
    {
        return [
            'required',
            'file',
            'mimes:' . self::FORMAT_FILE,
            'max:' . self::MAKS_UKURAN_KB,
        ];
    }
}
