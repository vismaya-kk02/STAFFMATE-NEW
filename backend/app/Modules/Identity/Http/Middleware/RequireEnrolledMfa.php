<?php

namespace App\Modules\Identity\Http\Middleware;

use App\Models\User;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\SessionKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RequireEnrolledMfa
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || $user->status !== AccountStatus::Active) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email address is not verified.',
                'reason' => 'email',
            ], 403);
        }

        if ($user->two_factor_confirmed_at === null) {
            return response()->json([
                'message' => 'Multi-factor authentication is required.',
                'reason' => 'enrollment',
            ], 403);
        }

        if (! $request->hasSession() || $request->session()->get(SessionKey::MfaConfirmedAt) === null) {
            return response()->json([
                'message' => 'Multi-factor authentication is required.',
                'reason' => 'challenge',
            ], 403);
        }

        $revision = $request->session()->get(SessionKey::AuthRevision);
        $passwordHash = $request->session()->get(SessionKey::PasswordHash);

        if (! $request->session()->has(SessionKey::AuthRevision)
            || (int) $revision !== (int) $user->auth_revision
            || ! is_string($passwordHash)
            || ! hash_equals($passwordHash, $user->getAuthPassword())) {
            $this->endSession($request);

            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $started = $request->session()->get(SessionKey::StartedAt);
        $limit = (int) config('session.absolute_lifetime', 720) * 60;

        if (! is_numeric($started) || now()->getTimestamp() - (int) $started >= $limit) {
            $this->endSession($request);

            return response()->json([
                'message' => 'Session expired.',
            ], 401);
        }

        return $next($request);
    }

    private function endSession(Request $request): void
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
    }
}
