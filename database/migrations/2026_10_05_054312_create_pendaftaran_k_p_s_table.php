<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pendaftaran_kps', function (Blueprint $table) {
            $table->id();

            // Relasi ke mahasiswa
            $table->foreignId('mahasiswa_id')
                ->constrained('mahasiswas')
                ->cascadeOnDelete();

            // Dua dosen yang diusulkan mahasiswa
            $table->foreignId('dosen_usulan_1_id')
                ->constrained('dosens')
                ->restrictOnDelete();

            $table->foreignId('dosen_usulan_2_id')
                ->nullable()
                ->constrained('dosens')
                ->nullOnDelete();

            // Data pribadi saat pendaftaran KP
            $table->text('alamat');
            $table->string('tempat_lahir');
            $table->date('tanggal_lahir');
            $table->string('email_widyatama');
            $table->string('nomor_telepon', 20);
            $table->decimal('ipk', 3, 2);
            $table->text('judul_kp');

            // Data perusahaan / instansi
            $table->string('nama_perusahaan');
            $table->string('bidang_usaha');
            $table->text('alamat_perusahaan');
            $table->string('kota');
            $table->string('kontak_perusahaan');
            $table->string('pembimbing_lapangan');

            // Status pendaftaran
            $table->string('status')->default('PENDING');
            $table->text('catatan')->nullable();
            $table->timestamp('submitted_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pendaftaran_kps');
    }
};
