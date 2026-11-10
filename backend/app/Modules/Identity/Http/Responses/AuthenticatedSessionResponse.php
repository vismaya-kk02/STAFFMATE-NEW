<?php

namespace App\Modules\Identity\Http\Responses;

use App\Modules\Identity\Services\SessionMarker;
use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Fortify;
use Symfony\Component\HttpFoundation\Response;

class AuthenticatedSessionResponse implements LoginResponseContract
{
    public function __construct(private readonly SessionMarker $sessions) {}

    public function toResponse($request): Response
    {
        if ($request->is('two-factor-challenge')) {
            $this->sessions->markMfaConfirmed($request);
        } else {
            $this->sessions->markPasswordLogin($request);
        }

        return $request->expectsJson()
            ? new JsonResponse(['status' => 'authenticated'])
            : redirect()->intended(Fortify::redirects('login', config('fortify.home')));
    }
}
