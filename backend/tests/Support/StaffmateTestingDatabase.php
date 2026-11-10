<?php

namespace Tests\Support;

use Illuminate\Support\Facades\DB;
use PDO;
use RuntimeException;

/**
 * Fail-closed PostgreSQL identity checks for committed concurrency tests.
 *
 * Orphan fixture recovery (manual only — never auto-delete outside tracked IDs):
 *   SELECT id, email, status, created_at
 *   FROM users
 *   WHERE email LIKE '%@sa-concurrency.example'
 *   ORDER BY id;
 *
 * Matching role pivots:
 *   SELECT *
 *   FROM model_has_roles
 *   WHERE model_type = 'App\Models\User'
 *     AND model_id IN (...ids from the query above...);
 *
 * Delete only those rows after confirming they are leftover concurrency fixtures.
 */
final class StaffmateTestingDatabase
{
    public const DATABASE = 'staffmate_testing';

    public const USERNAME = 'staffmate_test';

    public const FIXTURE_EMAIL_DOMAIN = 'sa-concurrency.example';

    public static function assertNoCachedConfig(string $basePath): void
    {
        $cached = $basePath.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'cache'.DIRECTORY_SEPARATOR.'config.php';

        if (is_file($cached)) {
            throw new RuntimeException(
                'Refusing concurrency tests while bootstrap/cache/config.php exists. '.
                'Remove or rebuild the config cache manually before running these tests.',
            );
        }
    }

    public static function assertResolvedLaravelConfiguration(): void
    {
        if ((string) config('database.default') !== 'pgsql') {
            throw new RuntimeException('Concurrency tests require the pgsql default connection.');
        }

        $pgsql = config('database.connections.pgsql');

        if (! is_array($pgsql)) {
            throw new RuntimeException('pgsql connection configuration is missing.');
        }

        if (($pgsql['database'] ?? null) !== self::DATABASE) {
            throw new RuntimeException(
                'Resolved DB database must be '.self::DATABASE.', got ['.(string) ($pgsql['database'] ?? 'null').'].',
            );
        }

        if (($pgsql['username'] ?? null) !== self::USERNAME) {
            throw new RuntimeException(
                'Resolved DB username must be '.self::USERNAME.', got ['.(string) ($pgsql['username'] ?? 'null').'].',
            );
        }

        $url = $pgsql['url'] ?? null;

        if (is_string($url) && trim($url) !== '') {
            throw new RuntimeException('Resolved DB_URL must be empty for concurrency tests.');
        }

        if (! is_string($pgsql['password'] ?? null) || $pgsql['password'] === '') {
            throw new RuntimeException('Testing database password is not configured.');
        }

        foreach (['DB_DATABASE' => self::DATABASE, 'DB_USERNAME' => self::USERNAME] as $key => $expected) {
            $value = self::environment($key);

            if ($value !== null && $value !== $expected) {
                throw new RuntimeException($key.' must be '.$expected.', got ['.$value.'].');
            }
        }

        $dbUrl = self::environment('DB_URL');

        if (is_string($dbUrl) && trim($dbUrl) !== '') {
            throw new RuntimeException('DB_URL must be empty for concurrency tests.');
        }
    }

    public static function assertConnectedIdentity(): void
    {
        $identity = DB::selectOne(
            'select current_database() as database, current_user as current_user, session_user as session_user',
        );

        self::assertIdentity(
            $identity->database ?? null,
            $identity->current_user ?? null,
            $identity->session_user ?? null,
        );
    }

    public static function assertPdoIdentity(PDO $pdo): void
    {
        $statement = $pdo->query(
            'select current_database() as database, current_user as current_user, session_user as session_user',
        );

        $identity = $statement === false ? false : $statement->fetch(PDO::FETCH_ASSOC);

        if (! is_array($identity)) {
            throw new RuntimeException('Unable to read PostgreSQL identity from independent PDO.');
        }

        self::assertIdentity(
            isset($identity['database']) ? (string) $identity['database'] : null,
            isset($identity['current_user']) ? (string) $identity['current_user'] : null,
            isset($identity['session_user']) ? (string) $identity['session_user'] : null,
        );
    }

    public static function assertIdentity(mixed $database, mixed $currentUser, mixed $sessionUser): void
    {
        $database = is_string($database) ? $database : null;
        $currentUser = is_string($currentUser) ? $currentUser : null;
        $sessionUser = is_string($sessionUser) ? $sessionUser : null;

        if ($database !== self::DATABASE) {
            throw new RuntimeException(
                'Refusing database ['.($database ?? 'unknown').']. Expected '.self::DATABASE.'.',
            );
        }

        if ($currentUser !== self::USERNAME) {
            throw new RuntimeException(
                'Refusing current_user ['.($currentUser ?? 'unknown').']. Expected '.self::USERNAME.'.',
            );
        }

        if ($sessionUser !== self::USERNAME) {
            throw new RuntimeException(
                'Refusing session_user ['.($sessionUser ?? 'unknown').']. Expected '.self::USERNAME.'.',
            );
        }
    }

    public static function fixtureEmail(string $label): string
    {
        return strtolower($label.'-'.uniqid('', true).'@'.self::FIXTURE_EMAIL_DOMAIN);
    }

    private static function environment(string $key): mixed
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
