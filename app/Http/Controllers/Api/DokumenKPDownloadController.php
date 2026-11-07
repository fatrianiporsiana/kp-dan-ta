<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DokumenKP;
use App\Models\PendaftaranKP;
use App\Models\PendaftaranTA;
use App\Models\PengajuanSidangTA;
use App\Models\PengujiTA;
use App\Models\PenyelesaianKP;
use App\Models\PerpanjanganKP;
use App\Models\PerpanjanganTA;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Unduh dokumen KP/TA dengan pengecekan akses.
 *
 * Boleh diakses oleh: staff/sekprodi/kaprodi, mahasiswa pemilik pendaftaran,
 * dan dosen pembimbing pendaftaran tersebut (untuk TA: pembimbing utama
 * maupun co-pembimbing).
 *
 * Frontend harus memanggil endpoint ini dengan header Authorization (fetch/axios
 * lalu simpan sebagai blob); tautan <a href> biasa tidak membawa token.
 */
class DokumenKPDownloadController extends Controller
{
    public function __invoke(Request $request, DokumenKP $dokumen): Response
    {
        $pendaftaran = $this->pendaftaranOf($dokumen);
        $user = $request->user();

        $diizinkan = ($pendaftaran && $this->canAccess($user, $pendaftaran))
            || $this->pengujiBolehMembaca($user, $dokumen);

        if (!$diizinkan) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu tidak memiliki akses ke dokumen ini.',
            ], 403);
        }

        // 'local' = disk privat; 'public' = dokumen lama yang belum dipindahkan.
        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($dokumen->path)) {
                return Storage::disk($disk)->download(
                    $dokumen->path,
                    $dokumen->nama_file
                );
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'File dokumen tidak ditemukan.',
        ], 404);
    }

    /**
     * Dosen penguji hanya boleh membaca draf laporan (atau jurnal) mahasiswa
     * yang diujinya, bukan seluruh lampiran (akte, histori pembayaran, dll).
     */
    private function pengujiBolehMembaca(User $user, DokumenKP $dokumen): bool
    {
        $dosen = $user->dosen;
        $owner = $dokumen->documentable;

        if (
            !$dosen
            || !$owner instanceof PengajuanSidangTA
            || !in_array($dokumen->jenis, JadwalSidangTAController::LAMPIRAN_UNTUK_PENGUJI, true)
        ) {
            return false;
        }

        return PengujiTA::query()
            ->where('dosen_id', $dosen->id)
            ->whereHas('jadwal', function ($jadwal) use ($owner) {
                $jadwal->where('pengajuan_sidang_ta_id', $owner->id);
            })
            ->exists();
    }

    private function pendaftaranOf(DokumenKP $dokumen): PendaftaranKP|PendaftaranTA|null
    {
        $owner = $dokumen->documentable;

        if ($owner instanceof PendaftaranKP || $owner instanceof PendaftaranTA) {
            return $owner;
        }

        if ($owner instanceof PerpanjanganKP || $owner instanceof PenyelesaianKP) {
            return $owner->pendaftaranKP;
        }

        if ($owner instanceof PerpanjanganTA || $owner instanceof PengajuanSidangTA) {
            return $owner->pendaftaranTA;
        }

        return null;
    }

    private function canAccess(User $user, PendaftaranKP|PendaftaranTA $pendaftaran): bool
    {
        if ($user->hasFullAccess()) {
            return true;
        }

        $mahasiswa = $user->mahasiswa;

        if ($mahasiswa && (int) $pendaftaran->mahasiswa_id === (int) $mahasiswa->id) {
            return true;
        }

        $dosen = $user->dosen;

        if (!$dosen) {
            return false;
        }

        if ($pendaftaran instanceof PendaftaranTA) {
            return $pendaftaran->pembimbing()
                ->where('dosen_id', $dosen->id)
                ->exists();
        }

        $pembimbing = $pendaftaran->pembimbing;

        return $pembimbing && (int) $pembimbing->dosen_id === (int) $dosen->id;
    }
}
