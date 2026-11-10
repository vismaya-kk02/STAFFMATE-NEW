<?php

namespace App\Modules\Identity\Http\Responses;

use App\Modules\Identity\Support\SessionKey;
use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\TwoFactorDisabledResponse as TwoFactorDisabledResponseContract;
use Symfony\Component\HttpFoundation\Response;

class TwoFactorDisabledResponse implements TwoFactorDisabledResponseContract
{
    public function toResponse($request): Response
    {
        if ($request->hasSession()) {
            $request->session()->forget(SessionKey::MfaConfirmedAt);
        }

        return new JsonResponse([
            'status' => 'disabled',
        ]);
    }
}
