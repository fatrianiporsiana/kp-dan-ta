<?php

namespace App\Http\Controllers;


use App\Models\PendaftaranKP;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DokumenKPController extends Controller
{
    public function store(
        Request $request,
        PendaftaranKP $pendaftaran
    ): JsonResponse {
        $user = $request->user();

        $mahasiswa = $user->mahasiswa;

        if (!$mahasiswa) {
            return response()->json([
                'success' => false,
                'message' => 'Data mahasiswa tidak ditemukan.',
            ], 404);
        }

        if ($pendaftaran->mahasiswa_id !== $mahasiswa->id) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu tidak memiliki akses ke pendaftaran KP ini.',
            ], 403);
        }

        $validated = $request->validate([
            'jenis' => [
                'required',
                'in:transkrip,krs,bayar',
            ],

            'file' => [
                'required',
                'file',
                'mimes:pdf',
                'max:5120',
            ],
        ]);

        $file = $request->file('file');

        // Cari dokumen dengan jenis yang sama
        $dokumenLama = $pendaftaran->dokumen()
            ->where('jenis', $validated['jenis'])
            ->first();

        // Hapus file lama dari storage jika ada
        if ($dokumenLama) {
            if (Storage::disk('public')->exists($dokumenLama->path)) {
                Storage::disk('public')->delete($dokumenLama->path);
            }

            $dokumenLama->delete();
        }

        // Simpan file baru
        $path = $file->store(
            'dokumen-kp/pendaftaran/' . $pendaftaran->id,
            'public'
        );

        $dokumen = $pendaftaran->dokumen()->create([
            'jenis' => $validated['jenis'],
            'nama_file' => $file->getClientOriginalName(),
            'path' => $path,
            'ukuran' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Dokumen berhasil diupload.',
            'data' => [
                'id' => $dokumen->id,
                'jenis' => $dokumen->jenis,
                'nama_file' => $dokumen->nama_file,
                'ukuran' => $dokumen->ukuran,
                'mime_type' => $dokumen->mime_type,
            ],
        ], 201);
    }
}