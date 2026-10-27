<?php

namespace App\Support;

/**
 * Daftar lampiran wajib pendaftaran TA.
 *
 * Sertifikat PKM hanya untuk konsentrasi Reg A, sedangkan sertifikat
 * kegiatan ilmiah/seminar hanya untuk Reg B (saling eksklusif).
 */
final class LampiranTA
{
    private const LABEL = [
        'proposal' => 'Soft file Proposal TA/Kapsel yang sudah ACC',
        'verifikasi_nilai' => 'Verifikasi nilai untuk bimbingan (dari Akademik)',
        'histori_pembayaran' => 'Histori Pembayaran',
        'frs' => 'FRS semester berjalan (Registrasi TA)',
        'sertifikat_toefl' => 'Sertifikat TOEFL min. 450 (atau bukti bayar pendaftaran test)',
        'form_ta' => 'Form TA Skripsi/Jurnal',
        'sertifikat_lsp' => 'Sertifikat LSP (atau surat keterangan pendaftaran)',
        'sertifikat_pkm' => 'Sertifikat PKM',
        'sertifikat_kegiatan_ilmiah' => 'Sertifikat Kegiatan Ilmiah/Seminar',
    ];

    private const UMUM = [
        'proposal',
        'verifikasi_nilai',
        'histori_pembayaran',
        'frs',
        'sertifikat_toefl',
        'form_ta',
        'sertifikat_lsp',
    ];

    private const KHUSUS = [
        'reg_a' => 'sertifikat_pkm',
        'reg_b' => 'sertifikat_kegiatan_ilmiah',
    ];

    /**
     * Jenis lampiran yang berlaku untuk sebuah konsentrasi.
     *
     * @return list<string>
     */
    public static function jenisUntuk(string $konsentrasi): array
    {
        $jenis = self::UMUM;

        if (isset(self::KHUSUS[$konsentrasi])) {
            $jenis[] = self::KHUSUS[$konsentrasi];
        }

        return $jenis;
    }

    /**
     * @return list<array{jenis: string, label: string}>
     */
    public static function daftar(string $konsentrasi): array
    {
        return array_map(
            fn (string $jenis) => [
                'jenis' => $jenis,
                'label' => self::LABEL[$jenis],
            ],
            self::jenisUntuk($konsentrasi)
        );
    }

    /**
     * Daftar lampiran beserta penanda apakah sudah diunggah.
     *
     * @param  list<string>  $terunggah
     * @return list<array{jenis: string, label: string, terunggah: bool}>
     */
    public static function checklist(string $konsentrasi, array $terunggah): array
    {
        return array_map(
            fn (array $item) => $item + [
                'terunggah' => in_array($item['jenis'], $terunggah, true),
            ],
            self::daftar($konsentrasi)
        );
    }

    /**
     * Lampiran wajib yang belum diunggah.
     *
     * @param  list<string>  $terunggah
     * @return list<array{jenis: string, label: string}>
     */
    public static function kurang(string $konsentrasi, array $terunggah): array
    {
        return array_values(array_filter(
            self::daftar($konsentrasi),
            fn (array $item) => !in_array($item['jenis'], $terunggah, true)
        ));
    }
}
