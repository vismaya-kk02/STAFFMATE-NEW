<?php

namespace App\Modules\Identity\Http\Middleware;

use App\Modules\Identity\Support\SessionKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAbsoluteSessionLifetime
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasSession() || ! $request->session()->has(SessionKey::StartedAt)) {
            return $next($request);
        }

        $started = (int) $request->session()->get(SessionKey::StartedAt);
        $limit = (int) config('session.absolute_lifetime', 720) * 60;

        if (now()->getTimestamp() - $started < $limit) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Session expired.',
        ], 401);
    }
}
