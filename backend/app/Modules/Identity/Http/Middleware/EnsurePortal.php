<?php

namespace App\Modules\Identity\Http\Middleware;

use App\Modules\Identity\Support\Portal;
use App\Modules\Identity\Support\SessionKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePortal
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $expected): Response
    {
        $portal = Portal::tryFrom($expected);
        $hostPortal = Portal::fromHost($request->getHost());
        $sessionPortal = $request->hasSession()
            ? $request->session()->get(SessionKey::Portal)
            : null;

        if (! $portal instanceof Portal || $hostPortal !== $portal || $sessionPortal !== $portal->value) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        return $next($request);
    }
}
