<?php

use App\Http\Controllers\DokumenKPController;
use App\Http\Controllers\Api\PendaftaranKPController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DosenController;
use App\Http\Controllers\Api\LogbookKPController;
use App\Http\Controllers\Api\PerpanjanganKPController;
use App\Http\Controllers\Api\PenyelesaianKPController;
use App\Http\Controllers\Api\DokumenKPDownloadController;
use App\Http\Controllers\Api\PendaftaranTAController;
use App\Http\Controllers\Api\TemplateDokumenController;
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

        Route::get('/perpanjangan', [PerpanjanganKPController::class, 'index']);
        Route::post('/perpanjangan', [PerpanjanganKPController::class, 'store']);
        Route::put('/perpanjangan/{perpanjangan}', [PerpanjanganKPController::class, 'update']);
        Route::delete('/perpanjangan/{perpanjangan}', [PerpanjanganKPController::class, 'destroy']);
        Route::post('/perpanjangan/{perpanjangan}/dokumen', [PerpanjanganKPController::class, 'uploadScan']);

        Route::get('/penyelesaian', [PenyelesaianKPController::class, 'index']);
        Route::post('/penyelesaian/tahap-1', [PenyelesaianKPController::class, 'submitTahap1']);
        Route::post('/penyelesaian/tahap-2', [PenyelesaianKPController::class, 'submitTahap2']);
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

        Route::get(
            '/dosen/mahasiswa/{pendaftaran}/perpanjangan',
            [PerpanjanganKPController::class, 'indexForDosen']
        );

        Route::get(
            '/dosen/penyelesaian',
            [PenyelesaianKPController::class, 'indexForDosen']
        );

        Route::patch(
            '/dosen/penyelesaian/{penyelesaian}/approve',
            [PenyelesaianKPController::class, 'dosenApprove']
        );

        Route::patch(
            '/dosen/penyelesaian/{penyelesaian}/reject',
            [PenyelesaianKPController::class, 'dosenReject']
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

        Route::get(
            '/staff/perpanjangan',
            [PerpanjanganKPController::class, 'indexForStaff']
        );

        Route::patch(
            '/staff/perpanjangan/{perpanjangan}/approve',
            [PerpanjanganKPController::class, 'approve']
        );

        Route::patch(
            '/staff/perpanjangan/{perpanjangan}/reject',
            [PerpanjanganKPController::class, 'reject']
        );

        Route::get(
            '/staff/penyelesaian',
            [PenyelesaianKPController::class, 'indexForStaff']
        );

        Route::patch(
            '/staff/penyelesaian/{penyelesaian}/approve',
            [PenyelesaianKPController::class, 'staffApprove']
        );

        Route::patch(
            '/staff/penyelesaian/{penyelesaian}/reject',
            [PenyelesaianKPController::class, 'staffReject']
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











// Unduh dokumen KP (akses dicek di controller: pemilik, pembimbing, atau full-access).
Route::middleware('auth:sanctum')
    ->get('/kp/dokumen/{dokumen}/download', DokumenKPDownloadController::class);


/*
|--------------------------------------------------------------------------
| MODUL TA
|--------------------------------------------------------------------------
*/

Route::prefix('ta')
    ->middleware(['auth:sanctum', 'role:mahasiswa'])
    ->group(function () {
        Route::get('/lampiran', [PendaftaranTAController::class, 'lampiran']);

        Route::get('/pendaftaran', [PendaftaranTAController::class, 'show']);
        Route::post('/pendaftaran', [PendaftaranTAController::class, 'store']);
        Route::put('/pendaftaran/{pendaftaran}', [PendaftaranTAController::class, 'update']);
        Route::delete('/pendaftaran/{pendaftaran}', [PendaftaranTAController::class, 'destroy']);
        Route::post('/pendaftaran/{pendaftaran}/dokumen', [PendaftaranTAController::class, 'uploadDokumen']);
        Route::post('/pendaftaran/{pendaftaran}/submit', [PendaftaranTAController::class, 'submit']);
    });

Route::prefix('ta')
    ->middleware(['auth:sanctum', 'role:dosen'])
    ->group(function () {
        Route::get('/dosen/mahasiswa', [PendaftaranTAController::class, 'indexForDosen']);
        Route::get('/dosen/mahasiswa/{pendaftaran}', [PendaftaranTAController::class, 'showForDosen']);
    });

Route::prefix('ta')
    ->middleware(['auth:sanctum', 'full-access'])
    ->group(function () {
        Route::get('/staff/pendaftaran', [PendaftaranTAController::class, 'indexForStaff']);
        Route::get('/staff/pendaftaran/{pendaftaran}', [PendaftaranTAController::class, 'showForStaff']);
        Route::patch('/staff/pendaftaran/{pendaftaran}/approve', [PendaftaranTAController::class, 'approve']);
        Route::patch('/staff/pendaftaran/{pendaftaran}/reject', [PendaftaranTAController::class, 'reject']);
        Route::post('/staff/pendaftaran/{pendaftaran}/pembimbing', [PendaftaranTAController::class, 'assignPembimbing']);
    });


/*
|--------------------------------------------------------------------------
| TEMPLATE DOKUMEN (kuesioner KP, logbook TA, BAP sidang, dll)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/templates', [TemplateDokumenController::class, 'index']);
    Route::get('/templates/{template}/download', [TemplateDokumenController::class, 'download']);
});

Route::prefix('staff')
    ->middleware(['auth:sanctum', 'full-access'])
    ->group(function () {
        Route::post('/templates', [TemplateDokumenController::class, 'store']);
        Route::patch('/templates/{template}', [TemplateDokumenController::class, 'update']);
        Route::post('/templates/{template}/file', [TemplateDokumenController::class, 'replaceFile']);
        Route::delete('/templates/{template}', [TemplateDokumenController::class, 'destroy']);
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