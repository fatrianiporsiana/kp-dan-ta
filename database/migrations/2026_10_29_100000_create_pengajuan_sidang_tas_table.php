<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengajuan_sidang_tas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pendaftaran_ta_id')
                ->constrained('pendaftaran_tas')
                ->cascadeOnDelete();

            // Data tambahan (diisi otomatis dari pendaftaran TA, boleh diubah)
            $table->text('alamat');
            $table->string('tempat_lahir');
            $table->date('tanggal_lahir');
            $table->string('email_widyatama');
            $table->string('nomor_telepon', 20);
            $table->decimal('ipk', 3, 2);
            $table->unsignedSmallInteger('skor_toefl');
            $table->text('judul_ta');

            // Hanya berlaku untuk jalur Jurnal: bukti bayar jurnal wajib jika true.
            $table->boolean('jurnal_berbayar')->default(false);

            // DRAFT -> PENDING (menunggu dosen, lalu staff) -> APPROVED / REJECTED
            $table->string('status')->default('DRAFT');
            $table->text('catatan')->nullable();

            // Diisi saat pembimbing utama mengonfirmasi kesiapan sidang.
            $table->timestamp('dosen_confirmed_at')->nullable();
            $table->timestamp('submitted_at')->nullable();

            $table->timestamps();

            $table->index(['pendaftaran_ta_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengajuan_sidang_tas');
    }
};
