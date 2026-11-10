<?php

namespace App\Providers;

use App\Models\User;
use App\Modules\Identity\Actions\ResetUserPassword;
use App\Modules\Identity\Actions\UpdateUserPassword;
use App\Modules\Identity\Actions\UpdateUserProfileInformation;
use App\Modules\Identity\Http\Middleware\DiscardRememberMe;
use App\Modules\Identity\Http\Responses\AuthenticatedSessionResponse;
use App\Modules\Identity\Http\Responses\GenericPasswordResetLinkResponse;
use App\Modules\Identity\Http\Responses\TwoFactorChallengeResponse;
use App\Modules\Identity\Http\Responses\TwoFactorConfirmedResponse;
use App\Modules\Identity\Http\Responses\TwoFactorDisabledResponse;
use App\Modules\Identity\Support\AccountStatus;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\TwoFactorConfirmedResponse as TwoFactorConfirmedResponseContract;
use Laravel\Fortify\Contracts\TwoFactorDisabledResponse as TwoFactorDisabledResponseContract;
use Laravel\Fortify\Contracts\TwoFactorLoginResponse;
use Laravel\Fortify\Fortify;
use RuntimeException;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * A valid bcrypt hash used only to keep missing-account checks similar in cost.
     * It does not authenticate any account.
     */
    private const DUMMY_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    public function register(): void
    {
        $this->app->singleton(SuccessfulPasswordResetLinkRequestResponse::class, GenericPasswordResetLinkResponse::class);
        $this->app->singleton(FailedPasswordResetLinkRequestResponse::class, GenericPasswordResetLinkResponse::class);
        $this->app->singleton(LoginResponse::class, AuthenticatedSessionResponse::class);
        $this->app->singleton(TwoFactorLoginResponse::class, TwoFactorChallengeResponse::class);
        $this->app->singleton(TwoFactorConfirmedResponseContract::class, TwoFactorConfirmedResponse::class);
        $this->app->singleton(TwoFactorDisabledResponseContract::class, TwoFactorDisabledResponse::class);
    }

    public function boot(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);

        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $base = rtrim((string) config($this->passwordResetBase($user)), '/');

            return $base.'/reset-password/'.$token.'?email='.urlencode($user->getEmailForPasswordReset());
        });

        Fortify::authenticateUsing(function (Request $request): ?User {
            $email = Str::lower($request->string(Fortify::username())->trim()->toString());
            $user = User::query()->where('email', $email)->first();
            $password = $request->string('password')->toString();

            $matches = Hash::check($password, $user?->getAuthPassword() ?? self::DUMMY_PASSWORD_HASH);

            if ($user === null || ! $matches || $user->status !== AccountStatus::Active || ! $user->hasVerifiedEmail()) {
                return null;
            }

            return $user;
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(
                Str::lower($request->string(Fortify::username())->trim()->toString()).'|'.$request->ip(),
            );

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('two-factor', function (Request $request) {
            $actor = (string) ($request->user()?->getAuthIdentifier()
                ?? $request->session()->get('login.id')
                ?? 'guest');
            $attempt = $request->is('two-factor-challenge', 'user/confirmed-two-factor-authentication')
                || ($request->is('user/two-factor-authentication') && $request->isMethod('DELETE'))
                || ($request->is('user/two-factor-recovery-codes') && $request->isMethod('POST'));
            $bucket = $attempt ? 'attempt' : 'setup';

            return Limit::perMinute($attempt ? 5 : 20)->by($bucket.'|'.$actor.'|'.$request->ip());
        });

        $this->app->booted(function (): void {
            $this->prepareFortifyRoutes();
        });
    }

    private function prepareFortifyRoutes(): void
    {
        foreach (['user-profile-information.update', 'user-password.update'] as $name) {
            $this->route($name)->middleware('verified');
        }

        foreach (['login.store', 'two-factor.login.store'] as $name) {
            $this->route($name)->middleware(DiscardRememberMe::class);
        }

        foreach ([
            'two-factor.enable',
            'two-factor.confirm',
            'two-factor.disable',
            'two-factor.qr-code',
            'two-factor.secret-key',
            'two-factor.recovery-codes',
            'two-factor.regenerate-recovery-codes',
        ] as $name) {
            $this->route($name)->middleware(['verified', 'throttle:two-factor']);
        }
    }

    /**
     * Fortify names these routes while they are registered. The collection's
     * name index can still be stale at this point, so match the route action
     * name instead of RouteCollection::getByName().
     */
    private function route(string $name): \Illuminate\Routing\Route
    {
        foreach (Route::getRoutes() as $route) {
            if ($route->getName() === $name) {
                return $route;
            }
        }

        throw new RuntimeException("Fortify route [{$name}] is not registered.");
    }

    private function passwordResetBase(User $_user): string
    {
        return 'staffmate.app_url';
    }
}
