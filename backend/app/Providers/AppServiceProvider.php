<?php

namespace App\Providers;

use App\Models\User;
use App\Modules\Identity\Console\BootstrapSuperAdminCommand;
use App\Modules\Identity\Console\ResetSuperAdminMfaCommand;
use App\Modules\Identity\Listeners\RecordAuthenticationAudit;
use App\Modules\Identity\Logging\RedactAuthenticationProcessor;
use App\Modules\Identity\Policies\RolePolicy;
use App\Modules\Identity\Policies\UserPolicy;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Log\Logger as IlluminateLogger;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Monolog\Logger as MonologLogger;
use RuntimeException;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Role::class, RolePolicy::class);

        Event::listen(Login::class, [RecordAuthenticationAudit::class, 'login']);
        Event::listen(Failed::class, [RecordAuthenticationAudit::class, 'failed']);

        RateLimiter::for('invitation-accept', function (Request $request) {
            return Limit::perMinute(5)->by((string) $request->ip());
        });

        Password::defaults(function () {
            return Password::min(12)
                ->mixedCase()
                ->numbers()
                ->symbols();
        });

        $domain = config('session.domain');

        if (is_string($domain) && $domain !== '') {
            throw new RuntimeException('SESSION_DOMAIN must stay empty so Admin and CRM cookies stay on their own hosts.');
        }

        if (config('session.same_site') === 'none') {
            throw new RuntimeException('SESSION_SAME_SITE=none is not allowed.');
        }

        $this->redactAuthenticationLogs();

        $this->commands([
            BootstrapSuperAdminCommand::class,
            ResetSuperAdminMfaCommand::class,
        ]);
    }

    private function redactAuthenticationLogs(): void
    {
        $logger = Log::getLogger();

        if (! $logger instanceof IlluminateLogger) {
            return;
        }

        $monolog = $logger->getLogger();

        if (! $monolog instanceof MonologLogger) {
            return;
        }

        $monolog->pushProcessor(new RedactAuthenticationProcessor);
    }
}
