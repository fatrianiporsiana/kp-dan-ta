<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('penyelesaian_kps', function (Blueprint $table) {
            // Diisi saat dosen pembimbing mengonfirmasi laporan tahap 1,
            // sebelum diteruskan ke staff.
            $table->timestamp('dosen_confirmed_at')
                ->nullable()
                ->after('catatan');
        });
    }

    public function down(): void
    {
        Schema::table('penyelesaian_kps', function (Blueprint $table) {
            $table->dropColumn('dosen_confirmed_at');
        });
    }
};
