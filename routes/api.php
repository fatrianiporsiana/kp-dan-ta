<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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


Route::prefix('auth')->group(function () {

    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

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