<?php

namespace App\Console\Commands;

use App\Models\DokumenKP;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PindahkanDokumenKpKePrivat extends Command
{
    protected $signature = 'kp:pindahkan-dokumen-privat
                            {--dry-run : Hanya tampilkan apa yang akan dipindahkan, tanpa mengubah apa pun}';

    protected $description = 'Memindahkan dokumen KP lama dari disk public ke disk privat (local).';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $public = Storage::disk('public');
        $local = Storage::disk('local');

        $dipindahkan = 0;
        $sudahPrivat = 0;
        $hilang = 0;
        $gagal = 0;

        if ($dryRun) {
            $this->warn('Mode dry-run: tidak ada file yang diubah.');
        }

        foreach (DokumenKP::lazyById() as $dokumen) {
            $path = $dokumen->path;
            $adaDiPublic = $public->exists($path);
            $adaDiLocal = $local->exists($path);

            if ($adaDiLocal && !$adaDiPublic) {
                $sudahPrivat++;
                continue;
            }

            if (!$adaDiLocal && !$adaDiPublic) {
                $hilang++;
                $this->warn("Hilang   #{$dokumen->id} {$path}");
                continue;
            }

            if ($dryRun) {
                $dipindahkan++;
                $this->line("Dipindah #{$dokumen->id} {$path}");
                continue;
            }

            // Salin ke disk privat lebih dulu bila belum ada.
            if (!$adaDiLocal) {
                $stream = $public->readStream($path);

                if (!is_resource($stream) || !$local->writeStream($path, $stream)) {
                    if (is_resource($stream)) {
                        fclose($stream);
                    }

                    $gagal++;
                    $this->error("Gagal    #{$dokumen->id} {$path} (tidak bisa disalin)");
                    continue;
                }

                if (is_resource($stream)) {
                    fclose($stream);
                }
            }

            // Salinan publik baru dihapus setelah ukuran file privat dipastikan sama.
            if ($local->size($path) !== $public->size($path)) {
                $gagal++;
                $this->error("Gagal    #{$dokumen->id} {$path} (ukuran salinan berbeda, file publik dibiarkan)");
                continue;
            }

            $public->delete($path);
            $dipindahkan++;
            $this->line("Dipindah #{$dokumen->id} {$path}");
        }

        $this->newLine();
        $this->table(
            ['Dipindahkan', 'Sudah privat', 'File hilang', 'Gagal'],
            [[$dipindahkan, $sudahPrivat, $hilang, $gagal]]
        );

        return $gagal > 0 ? self::FAILURE : self::SUCCESS;
    }
}
