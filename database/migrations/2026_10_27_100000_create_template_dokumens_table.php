<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('template_dokumens', function (Blueprint $table) {
            $table->id();

            // Pengenal tetap yang dipakai frontend, contoh: kuesioner-kp, logbook-ta, bap-sidang-ta
            $table->string('kode', 100)->unique();

            $table->string('nama');
            $table->text('deskripsi')->nullable();

            // kp | ta | umum
            $table->string('modul', 10);

            // false = khusus internal (dosen, staff, sekprodi, kaprodi); mahasiswa ditolak (403)
            $table->boolean('terlihat_mahasiswa')->default(true);

            $table->string('nama_file');
            $table->string('path');
            $table->unsignedBigInteger('ukuran');
            $table->string('mime_type');

            $table->timestamps();

            $table->index('modul');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('template_dokumens');
    }
};
