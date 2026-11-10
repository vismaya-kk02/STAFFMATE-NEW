<?php

use App\Modules\Identity\Exceptions\IdentityAccessException;
use App\Modules\Identity\Http\Middleware\EnsureAbsoluteSessionLifetime;
use App\Modules\Identity\Http\Middleware\EnsureActiveAccount;
use App\Modules\Identity\Http\Middleware\EnsurePortal;
use App\Modules\Identity\Http\Middleware\RequireEnrolledMfa;
use App\Modules\Identity\Services\AuditRecorder;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();

        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->is('api/*')) {
                return null;
            }

            return route('login');
        });

        $middleware->alias([
            'mfa.enrolled' => RequireEnrolledMfa::class,
            'portal' => EnsurePortal::class,
        ]);

        $middleware->web(append: [
            AuthenticateSession::class,
            EnsureActiveAccount::class,
            EnsureAbsoluteSessionLifetime::class,
        ]);

        $middleware->api(append: [
            EnsureActiveAccount::class,
            EnsureAbsoluteSessionLifetime::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (IdentityAccessException $exception, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => $exception->getMessage(),
                ], 422);
            }

            return null;
        });

        $exceptions->report(function (ValidationException $exception): void {
            if (! request()->is('two-factor-challenge')) {
                return;
            }

            app(AuditRecorder::class)->record(null, null, 'mfa.failed', []);
        });
    })->create();
