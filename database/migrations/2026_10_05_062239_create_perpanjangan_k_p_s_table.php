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
        Schema::create('perpanjangan_kps', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pendaftaran_kp_id')
                ->constrained('pendaftaran_kps')
                ->cascadeOnDelete();

            $table->text('alasan');

            $table->unsignedTinyInteger('durasi_bulan');

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
        Schema::dropIfExists('perpanjangan_kps');
    }
};
