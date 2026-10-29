<?php

namespace App\Support;

/**
 * Daftar lampiran pengajuan sidang TA.
 *
 * - Lampiran umum berlaku untuk semua mahasiswa.
 * - Sertifikat PKM hanya untuk Reg A; sertifikat kegiatan ilmiah hanya untuk Reg B.
 * - Lampiran tambahan (jurnal, LoA, dst.) hanya untuk jalur Jurnal.
 *   Bukti bayar jurnal hanya wajib jika jurnalnya berbayar.
 * - Pas foto berformat gambar (JPG/PNG); lainnya PDF.
 */
final class LampiranSidangTA
{
    private const LABEL = [
        'pas_foto' => 'Pas Foto formal (latar biru)',
        'verifikasi_nilai_akhir' => 'Verifikasi nilai akhir sidang (ttd Akademik + Kaprodi)',
        'histori_pembayaran' => 'History pembayaran (ttd & cap PUPd)',
        'akte_kelahiran' => 'Scan Akte Kelahiran',
        'sertifikat_toefl' => 'Scan Sertifikat TOEFL min. 450',
        'kartu_bimbingan' => 'Scan Kartu Bimbingan bolak-balik (ttd Pembimbing + Sekprodi)',
        'sertifikat_lsp' => 'Sertifikat LSP / bukti pendaftaran',
        'sertifikat_pkm' => 'Sertifikat PKM',
        'sertifikat_kegiatan_ilmiah' => 'Sertifikat Kegiatan Ilmiah',
        'jurnal' => 'Jurnal',
        'loa' => 'LoA (Letter of Acceptance)',
        'bukti_non_plagiarisme' => 'Bukti Non-Plagiarisme (<20%)',
        'bukti_bayar_jurnal' => 'Bukti bayar jurnal',
        'bukti_korespondensi_publisher' => 'Bukti korespondensi dengan publisher',
        'bukti_index_publisher' => 'Bukti index publisher / Sinta',
    ];

    private const KHUSUS_KONSENTRASI = [
        'reg_a' => 'sertifikat_pkm',
        'reg_b' => 'sertifikat_kegiatan_ilmiah',
    ];

    /**
     * Jenis lampiran yang berlaku, berurutan seperti di sitemap.
     *
     * @return list<string>
     */
    public static function jenisUntuk(
        string $jalur,
        string $konsentrasi,
        bool $jurnalBerbayar = false
    ): array {
        $jenis = [
            'pas_foto',
            'verifikasi_nilai_akhir',
            'histori_pembayaran',
            'akte_kelahiran',
            'sertifikat_toefl',
            'draf_laporan',
            'kartu_bimbingan',
            'sertifikat_lsp',
        ];

        if (isset(self::KHUSUS_KONSENTRASI[$konsentrasi])) {
            $jenis[] = self::KHUSUS_KONSENTRASI[$konsentrasi];
        }

        if ($jalur === 'jurnal') {
            $jenis[] = 'jurnal';
            $jenis[] = 'loa';
            $jenis[] = 'bukti_non_plagiarisme';

            if ($jurnalBerbayar) {
                $jenis[] = 'bukti_bayar_jurnal';
            }

            $jenis[] = 'bukti_korespondensi_publisher';
            $jenis[] = 'bukti_index_publisher';
        }

        return $jenis;
    }

    /**
     * @return list<array{jenis: string, label: string, format: list<string>}>
     */
    public static function daftar(
        string $jalur,
        string $konsentrasi,
        bool $jurnalBerbayar = false
    ): array {
        return array_map(
            fn (string $jenis) => [
                'jenis' => $jenis,
                'label' => self::label($jenis, $jalur),
                'format' => self::formatUntuk($jenis),
            ],
            self::jenisUntuk($jalur, $konsentrasi, $jurnalBerbayar)
        );
    }

    /**
     * Daftar lampiran beserta penanda apakah sudah diunggah.
     *
     * @param  list<string>  $terunggah
     * @return list<array{jenis: string, label: string, format: list<string>, terunggah: bool}>
     */
    public static function checklist(
        string $jalur,
        string $konsentrasi,
        bool $jurnalBerbayar,
        array $terunggah
    ): array {
        return array_map(
            fn (array $item) => $item + [
                'terunggah' => in_array($item['jenis'], $terunggah, true),
            ],
            self::daftar($jalur, $konsentrasi, $jurnalBerbayar)
        );
    }

    /**
     * Lampiran wajib yang belum diunggah.
     *
     * @param  list<string>  $terunggah
     * @return list<array{jenis: string, label: string, format: list<string>}>
     */
    public static function kurang(
        string $jalur,
        string $konsentrasi,
        bool $jurnalBerbayar,
        array $terunggah
    ): array {
        return array_values(array_filter(
            self::daftar($jalur, $konsentrasi, $jurnalBerbayar),
            fn (array $item) => !in_array($item['jenis'], $terunggah, true)
        ));
    }

    /**
     * @return list<string>
     */
    public static function formatUntuk(string $jenis): array
    {
        return $jenis === 'pas_foto' ? ['jpg', 'jpeg', 'png'] : ['pdf'];
    }

    /**
     * Aturan validasi file untuk satu jenis lampiran.
     *
     * @return list<string>
     */
    public static function aturanFile(string $jenis): array
    {
        return $jenis === 'pas_foto'
            ? ['required', 'file', 'mimes:jpg,jpeg,png', 'max:2048']
            : ['required', 'file', 'mimes:pdf', 'max:5120'];
    }

    private static function label(string $jenis, string $jalur): string
    {
        if ($jenis === 'draf_laporan') {
            return $jalur === 'jurnal'
                ? 'Draf Laporan Penelitian'
                : 'Draf Laporan Skripsi';
        }

        return self::LABEL[$jenis];
    }
}
