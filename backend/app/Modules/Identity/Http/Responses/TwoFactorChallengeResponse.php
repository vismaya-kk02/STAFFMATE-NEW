<?php

namespace App\Modules\Identity\Http\Responses;

use App\Models\User;
use App\Modules\Identity\Services\SessionMarker;
use App\Modules\Identity\Support\SessionKey;
use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\TwoFactorLoginResponse as TwoFactorLoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class TwoFactorChallengeResponse implements TwoFactorLoginResponseContract
{
    public function __construct(private readonly SessionMarker $sessions) {}

    public function toResponse($request): Response
    {
        if ($request->user() instanceof User) {
            $this->sessions->markMfaConfirmed($request);

            return new JsonResponse([
                'status' => 'authenticated',
            ]);
        }

        if ($request->hasSession() && ! $request->session()->has(SessionKey::StartedAt)) {
            $request->session()->put(SessionKey::StartedAt, now()->getTimestamp());
        }

        return $request->expectsJson()
            ? new JsonResponse(['two_factor' => true])
            : redirect()->to('/');
    }
}
