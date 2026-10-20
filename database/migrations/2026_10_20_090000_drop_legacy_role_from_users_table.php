<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Kolom users.role (enum) adalah sisa sistem role lama.
 * Otorisasi sekarang memakai tabel roles + user_roles, jadi kolom ini dihapus
 * supaya tidak ada dua sumber kebenaran untuk role.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('role');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->enum('role', ['mahasiswa', 'dosen', 'admin'])
                    ->nullable()
                    ->after('password');
            });
        }
    }
};
