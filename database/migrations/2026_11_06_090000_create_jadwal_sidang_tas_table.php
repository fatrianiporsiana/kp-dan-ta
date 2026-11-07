<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jadwal_sidang_tas', function (Blueprint $table) {
            $table->id();

            // Satu jadwal per pengajuan sidang yang sudah disetujui (siap diuji).
            $table->foreignId('pengajuan_sidang_ta_id')
                ->unique()
                ->constrained('pengajuan_sidang_tas')
                ->cascadeOnDelete();

            $table->date('tanggal');
            $table->time('waktu_mulai');
            $table->time('waktu_selesai');
            $table->string('ruang', 100);

            $table->timestamps();

            $table->index(['tanggal', 'waktu_mulai']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jadwal_sidang_tas');
    }
};
