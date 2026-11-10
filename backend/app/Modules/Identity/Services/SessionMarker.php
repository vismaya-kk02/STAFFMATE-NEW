<?php

namespace App\Modules\Identity\Services;

use App\Models\User;
use App\Modules\Identity\Support\SessionKey;
use Illuminate\Http\Request;

class SessionMarker
{
    public function markPasswordLogin(Request $request): void
    {
        $this->mark($request, mfaConfirmed: false, passwordConfirmed: true);
    }

    public function markMfaConfirmed(Request $request): void
    {
        $this->mark($request, mfaConfirmed: true, passwordConfirmed: false);
    }

    public function mark(Request $request, bool $mfaConfirmed, bool $passwordConfirmed): void
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return;
        }

        $request->session()->put(SessionKey::AuthRevision, (int) $user->auth_revision);
        $request->session()->put(SessionKey::PasswordHash, $user->getAuthPassword());

        if (! $request->session()->has(SessionKey::StartedAt)) {
            $request->session()->put(SessionKey::StartedAt, now()->getTimestamp());
        }

        // Unified SPA: one same-origin session. Section access is permission-based.
        $request->session()->put(SessionKey::Portal, 'app');

        if ($passwordConfirmed) {
            $request->session()->put('auth.password_confirmed_at', time());
        }

        if ($mfaConfirmed) {
            $request->session()->put(SessionKey::MfaConfirmedAt, now()->getTimestamp());
        }
    }
}
