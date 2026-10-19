<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembimbing_kps', function (Blueprint $table) {
            $table->unique('pendaftaran_kp_id');
        });
    }

    public function down(): void
    {
        Schema::table('pembimbing_kps', function (Blueprint $table) {
            $table->dropUnique([
                'pendaftaran_kp_id',
            ]);
        });
    }
};