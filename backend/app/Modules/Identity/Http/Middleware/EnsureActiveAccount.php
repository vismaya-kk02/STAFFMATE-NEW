<?php

namespace App\Modules\Identity\Http\Middleware;

use App\Models\User;
use App\Modules\Identity\Support\AccountStatus;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return $next($request);
        }

        // Reload status from the database so long-lived workers and in-process
        // clients cannot keep a stale Active model after suspension.
        if ($user->exists) {
            $user->refresh();
        }

        if ($user->status === AccountStatus::Active) {
            return $next($request);
        }

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401);
    }
}
