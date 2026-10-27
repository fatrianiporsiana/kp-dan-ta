<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pembimbing_tas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pendaftaran_ta_id')
                ->constrained('pendaftaran_tas')
                ->cascadeOnDelete();

            $table->foreignId('dosen_id')->constrained('dosens');

            // utama | co
            $table->string('peran', 10);

            $table->timestamps();

            // satu pembimbing utama dan satu co per pendaftaran,
            // dan dosen yang sama tidak boleh memegang dua peran.
            $table->unique(['pendaftaran_ta_id', 'peran']);
            $table->unique(['pendaftaran_ta_id', 'dosen_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembimbing_tas');
    }
};
