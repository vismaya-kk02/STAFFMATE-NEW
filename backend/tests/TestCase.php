<?php

namespace Tests;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    private ?string $previousRootUrl = null;

    protected function setUp(): void
    {
        $this->guardTestingConfiguration();

        parent::setUp();

        if (in_array(DatabaseTransactions::class, class_uses_recursive(static::class), true)) {
            $this->guardConnectedDatabase();
        }
    }

    protected function tearDown(): void
    {
        $this->restoreRootUrl();

        parent::tearDown();
    }

    /**
     * Simulate a first-party unified SPA browser request (app.localhost).
     */
    protected function asAppPortal(): static
    {
        $this->forcePortalRootUrl('http://app.localhost');

        return $this->withServerVariables([
            'HTTP_HOST' => 'app.localhost',
            'SERVER_NAME' => 'app.localhost',
        ])->withHeaders([
            'Origin' => 'http://app.localhost:5173',
            'Referer' => 'http://app.localhost:5173/',
        ])->withCredentials();
    }

    /**
     * @deprecated Use asAppPortal(). Kept for existing call sites during migration.
     */
    protected function asAdminPortal(): static
    {
        return $this->asAppPortal();
    }

    /**
     * @deprecated Use asAppPortal(). Kept for existing call sites during migration.
     */
    protected function asCrmPortal(): static
    {
        return $this->asAppPortal();
    }

    /**
     * Drop the cached Auth user so the next HTTP request reloads from the session/DB.
     */
    protected function flushAuthenticationState(): void
    {
        $this->app['auth']->forgetGuards();
    }

    private function forcePortalRootUrl(string $root): void
    {
        if ($this->previousRootUrl === null) {
            $this->previousRootUrl = (string) config('app.url');
        }

        URL::forceRootUrl($root);
        config(['app.url' => $root]);
    }

    private function restoreRootUrl(): void
    {
        if ($this->previousRootUrl === null) {
            return;
        }

        URL::forceRootUrl($this->previousRootUrl);
        config(['app.url' => $this->previousRootUrl]);
        $this->previousRootUrl = null;
    }

    private function guardTestingConfiguration(): void
    {
        $connection = $this->environment('DB_CONNECTION');
        $database = $this->environment('DB_DATABASE');
        $session = $this->environment('SESSION_DRIVER');

        if ($connection !== 'pgsql' || $database !== 'staffmate_testing' || $session !== 'array') {
            throw new RuntimeException(
                'Refusing to boot tests. Expected PostgreSQL database staffmate_testing and the array session driver.',
            );
        }
    }

    private function guardConnectedDatabase(): void
    {
        $name = DB::selectOne('select current_database() as name');

        if (($name->name ?? null) !== 'staffmate_testing') {
            throw new RuntimeException('Refusing to use database ['.($name->name ?? 'unknown').'].');
        }
    }

    private function environment(string $key): mixed
    {
        if (array_key_exists($key, $_ENV)) {
            return $_ENV[$key];
        }

        if (array_key_exists($key, $_SERVER)) {
            return $_SERVER[$key];
        }

        $value = getenv($key);

        return $value === false ? null : $value;
    }
}
