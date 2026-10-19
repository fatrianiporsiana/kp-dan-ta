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
        Schema::create('dokumen_kps', function (Blueprint $table) {
            $table->id();

            $table->string('documentable_type');
            $table->unsignedBigInteger('documentable_id');

            $table->string('jenis');
            $table->string('nama_file');
            $table->string('path');
            $table->unsignedBigInteger('ukuran')->nullable();
            $table->string('mime_type')->nullable();

            $table->timestamps();

            $table->index([
                'documentable_type',
                'documentable_id',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dokumen_kps');
    }
};
