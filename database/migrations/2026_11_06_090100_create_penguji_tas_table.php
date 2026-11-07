<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penguji_tas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('jadwal_sidang_ta_id')
                ->constrained('jadwal_sidang_tas')
                ->cascadeOnDelete();

            $table->foreignId('dosen_id')->constrained('dosens');

            // Penguji 1, 2, 3 (urutan tampil)
            $table->unsignedTinyInteger('urutan');

            $table->timestamps();

            $table->unique(['jadwal_sidang_ta_id', 'dosen_id']);
            $table->unique(['jadwal_sidang_ta_id', 'urutan']);
            $table->index('dosen_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penguji_tas');
    }
};
