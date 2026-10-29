<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('perpanjangan_tas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pendaftaran_ta_id')
                ->constrained('pendaftaran_tas')
                ->cascadeOnDelete();

            $table->text('alasan');
            $table->unsignedTinyInteger('durasi_bulan');

            // DRAFT -> PENDING -> APPROVED / REJECTED
            $table->string('status')->default('DRAFT');
            $table->text('catatan')->nullable();
            $table->timestamp('submitted_at')->nullable();

            $table->timestamps();

            $table->index(['pendaftaran_ta_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perpanjangan_tas');
    }
};
