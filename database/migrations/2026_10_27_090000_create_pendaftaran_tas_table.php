<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pendaftaran_tas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('mahasiswa_id')
                ->constrained('mahasiswas')
                ->cascadeOnDelete();

            // skripsi | jurnal
            $table->string('jalur', 20);

            // reg_a | reg_b (menentukan lampiran PKM atau kegiatan ilmiah)
            $table->string('konsentrasi', 20);

            $table->foreignId('dosen_usulan_1_id')->constrained('dosens');
            $table->foreignId('dosen_usulan_2_id')->constrained('dosens');

            $table->text('alamat');
            $table->string('tempat_lahir');
            $table->date('tanggal_lahir');
            $table->string('email_widyatama');
            $table->string('nomor_telepon', 20);
            $table->decimal('ipk', 3, 2);
            $table->unsignedSmallInteger('skor_toefl');
            $table->text('judul_ta');

            // DRAFT -> PENDING -> APPROVED / REJECTED
            $table->string('status')->default('DRAFT');
            $table->text('catatan')->nullable();
            $table->timestamp('submitted_at')->nullable();

            $table->timestamps();

            $table->index(['mahasiswa_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pendaftaran_tas');
    }
};
