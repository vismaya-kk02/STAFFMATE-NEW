<?php

namespace App\Modules\Identity\Http\Responses;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Symfony\Component\HttpFoundation\Response;

class GenericPasswordResetLinkResponse implements Responsable
{
    public const MESSAGE = 'If an account exists for that address, a reset link has been sent.';

    public function __construct(public string $status) {}

    /**
     * @param  Request  $request
     */
    public function toResponse($request): Response
    {
        if ($this->status === Password::RESET_THROTTLED) {
            $message = __($this->status);

            return $request->expectsJson()
                ? new JsonResponse(['message' => $message], 422)
                : back()->withErrors(['email' => $message]);
        }

        return $request->expectsJson()
            ? new JsonResponse(['message' => self::MESSAGE])
            : back()->with('status', self::MESSAGE);
    }
}
