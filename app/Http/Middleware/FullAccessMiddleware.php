<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FullAccessMiddleware
{
    public function handle(
        Request $request,
        Closure $next
    ): Response {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (!$user->hasFullAccess()) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu tidak memiliki akses penuh ke sistem.',
            ], 403);
        }

        return $next($request);
    }
}