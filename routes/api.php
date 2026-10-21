<?php

use App\Http\Controllers\DokumenKPController;
use App\Http\Controllers\Api\PendaftaranKPController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DosenController;
use App\Http\Controllers\Api\LogbookKPController;
use App\Http\Controllers\Api\Staff\UserRoleController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


Route::prefix('auth')->group(function () {

    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

});


// Daftar dosen: mahasiswa (memilih usulan pembimbing) dan staff/sekprodi/kaprodi (menetapkan pembimbing).
Route::middleware(['auth:sanctum', 'role:mahasiswa,staff,sekprodi,kaprodi'])
    ->get('/dosen', [DosenController::class, 'index']);


Route::prefix('kp')
    ->middleware(['auth:sanctum', 'role:mahasiswa'])
    ->group(function () {
        Route::post('/pendaftaran', [PendaftaranKPController::class, 'store']);
        Route::get('/pendaftaran', [PendaftaranKPController::class, 'show']);
        Route::post(
            '/pendaftaran/{pendaftaran}/dokumen',
            [DokumenKPController::class, 'store']);

        Route::get('/logbook', [LogbookKPController::class, 'index']);
        Route::post('/logbook', [LogbookKPController::class, 'store']);
        Route::put('/logbook/{logbook}', [LogbookKPController::class, 'update']);
        Route::delete('/logbook/{logbook}', [LogbookKPController::class, 'destroy']);
    });


Route::prefix('kp')
    ->middleware(['auth:sanctum', 'role:dosen'])
    ->group(function () {
        Route::get(
            '/dosen/mahasiswa',
            [PendaftaranKPController::class, 'indexForDosen']
        );

        Route::get(
            '/dosen/mahasiswa/{pendaftaran}',
            [PendaftaranKPController::class, 'showForDosen']
        );

        Route::get(
            '/dosen/mahasiswa/{pendaftaran}/logbook',
            [LogbookKPController::class, 'indexForDosen']
        );

        Route::patch(
            '/dosen/logbook/{logbook}/approve',
            [LogbookKPController::class, 'approve']
        );

        Route::patch(
            '/dosen/logbook/{logbook}/reject',
            [LogbookKPController::class, 'reject']
        );
    });


Route::prefix('kp')
    ->middleware(['auth:sanctum', 'full-access'])
    ->group(function () {
        Route::get('/staff/pendaftaran', [PendaftaranKPController::class, 'indexForStaff']);

        Route::patch(
            '/staff/pendaftaran/{pendaftaran}/approve',
            [PendaftaranKPController::class, 'approve']
        );

        Route::patch(
            '/staff/pendaftaran/{pendaftaran}/reject',
            [PendaftaranKPController::class, 'reject']
        );

        Route::post(
            '/staff/pendaftaran/{pendaftaran}/pembimbing',
            [PendaftaranKPController::class, 'assignPembimbing']
        );

        Route::get(
            '/staff/pendaftaran/{pendaftaran}',
            [PendaftaranKPController::class, 'showForStaff']
        );

        Route::get(
            '/staff/pendaftaran/{pendaftaran}/logbook',
            [LogbookKPController::class, 'indexForStaff']
        );
    });


Route::middleware(['auth:sanctum', 'full-access'])
->prefix('staff')
->group(function () {
    Route::post(
        '/users/{user}/roles',
        [UserRoleController::class, 'assign']
    );
});











Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'Laravel API connected successfully',
        'application' => 'Pendaftaran KP dan TA',
    ]);
});


Route::middleware('auth:sanctum')->group(function () {

    Route::get('/test/staff', function (Request $request) {
        return response()->json([
            'success' => true,
            'message' => 'Kamu berhasil masuk ke area staff.',
            'user' => $request->user()->name,
        ]);
    })->middleware('role:staff');

});

Route::middleware(['auth:sanctum', 'full-access'])->group(function () {

    Route::get('/test/full-access', function (Request $request) {
        return response()->json([
            'success' => true,
            'message' => 'Kamu berhasil masuk ke area full access.',
            'user' => $request->user()->name,
            'roles' => $request->user()
                ->roles
                ->pluck('name')
                ->values(),
        ]);
    });

});