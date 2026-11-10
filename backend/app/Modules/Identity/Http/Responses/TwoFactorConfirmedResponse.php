<?php

namespace App\Modules\Identity\Http\Responses;

use App\Modules\Identity\Services\SessionMarker;
use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\TwoFactorConfirmedResponse as TwoFactorConfirmedResponseContract;
use Symfony\Component\HttpFoundation\Response;

class TwoFactorConfirmedResponse implements TwoFactorConfirmedResponseContract
{
    public function __construct(private readonly SessionMarker $sessions) {}

    public function toResponse($request): Response
    {
        $this->sessions->markMfaConfirmed($request);

        return new JsonResponse([
            'status' => 'enrolled',
        ]);
    }
}
