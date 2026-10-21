<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logbook_kps', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pendaftaran_kp_id')
                ->constrained('pendaftaran_kps')
                ->cascadeOnDelete();

            $table->date('tanggal');
            $table->string('bidang_kerja');
            $table->text('deskripsi_kegiatan');
            $table->text('proses_penyelesaian')->nullable();
            $table->text('luaran_hasil');
            $table->string('nama_pic');

            // PENDING -> menunggu verifikasi dosen pembimbing
            // APPROVED / REJECTED -> hasil verifikasi
            $table->string('status')->default('PENDING');
            $table->text('catatan')->nullable();
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();

            $table->index(['pendaftaran_kp_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logbook_kps');
    }
};
