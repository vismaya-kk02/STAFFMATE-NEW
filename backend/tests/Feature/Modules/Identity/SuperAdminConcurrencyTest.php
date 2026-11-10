<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use App\Modules\Identity\Actions\AssignStaffRole;
use App\Modules\Identity\Actions\BootstrapSuperAdmin;
use App\Modules\Identity\Actions\ChangeAccountStatus;
use App\Modules\Identity\Exceptions\IdentityAccessException;
use App\Modules\Identity\Services\SuperAdminGuard;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\RoleName;
use Database\Seeders\IdentityPermissionSeeder;
use Illuminate\Support\Facades\DB;
use PDO;
use RuntimeException;
use Symfony\Component\Process\Process;
use Tests\Support\StaffmateTestingDatabase;
use Tests\TestCase;
use Throwable;

/**
 * Concurrency coverage for Super Admin protection.
 *
 * This class intentionally omits DatabaseTransactions so committed rows are
 * visible to independent PostgreSQL connections and child processes.
 *
 * Orphan fixtures (after an interrupted run) are identified by email domain
 * {@see StaffmateTestingDatabase::FIXTURE_EMAIL_DOMAIN}. Inspect and delete
 * those rows manually; this suite never mass-deletes unrelated users.
 */
class SuperAdminConcurrencyTest extends TestCase
{
    /** @var list<int> */
    private array $userIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        StaffmateTestingDatabase::assertNoCachedConfig(base_path());
        StaffmateTestingDatabase::assertResolvedLaravelConfiguration();
        StaffmateTestingDatabase::assertConnectedIdentity();

        $this->seed(IdentityPermissionSeeder::class);
    }

    protected function tearDown(): void
    {
        $this->cleanupTrackedFixtures();

        parent::tearDown();
    }

    public function test_isolation_rejects_incorrect_database_name(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Refusing database [staffmate_local]');

        StaffmateTestingDatabase::assertIdentity(
            'staffmate_local',
            StaffmateTestingDatabase::USERNAME,
            StaffmateTestingDatabase::USERNAME,
        );
    }

    public function test_isolation_rejects_incorrect_database_user(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Refusing current_user [staffmate_app]');

        StaffmateTestingDatabase::assertIdentity(
            StaffmateTestingDatabase::DATABASE,
            'staffmate_app',
            'staffmate_app',
        );
    }

    public function test_isolation_rejects_session_user_mismatch(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Refusing session_user [staffmate_app]');

        StaffmateTestingDatabase::assertIdentity(
            StaffmateTestingDatabase::DATABASE,
            StaffmateTestingDatabase::USERNAME,
            'staffmate_app',
        );
    }

    public function test_isolation_rejects_cached_configuration_file(): void
    {
        $root = sys_get_temp_dir().DIRECTORY_SEPARATOR.'staffmate-config-cache-'.uniqid('', true);
        $cacheDir = $root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'cache';
        mkdir($cacheDir, 0777, true);
        $cached = $cacheDir.DIRECTORY_SEPARATOR.'config.php';
        file_put_contents($cached, "<?php\nreturn [];\n");

        try {
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('bootstrap/cache/config.php');

            StaffmateTestingDatabase::assertNoCachedConfig($root);
        } finally {
            @unlink($cached);
            @rmdir($cacheDir);
            @rmdir($root.DIRECTORY_SEPARATOR.'bootstrap');
            @rmdir($root);
        }
    }

    public function test_parent_process_uses_staffmate_testing_identity(): void
    {
        $identity = DB::selectOne(
            'select current_database() as database, current_user as current_user, session_user as session_user',
        );

        $this->assertSame(StaffmateTestingDatabase::DATABASE, $identity->database);
        $this->assertSame(StaffmateTestingDatabase::USERNAME, $identity->current_user);
        $this->assertSame(StaffmateTestingDatabase::USERNAME, $identity->session_user);
        $this->assertSame(StaffmateTestingDatabase::DATABASE, config('database.connections.pgsql.database'));
        $this->assertSame(StaffmateTestingDatabase::USERNAME, config('database.connections.pgsql.username'));
        $this->assertTrue(blank(config('database.connections.pgsql.url')));
    }

    public function test_sequential_last_super_admin_operations_remain_blocked_and_preserve_state(): void
    {
        $admin = $this->createSuperAdmin('sequential-owner');

        try {
            app(AssignStaffRole::class)->assign($admin, $admin, RoleName::Management);
            $this->fail('The final Super Admin was demoted.');
        } catch (IdentityAccessException) {
            $this->assertTrue($admin->fresh()->hasRole(RoleName::SuperAdmin->value));
        }

        try {
            app(ChangeAccountStatus::class)->change($admin, $admin, AccountStatus::Suspended);
            $this->fail('The final Super Admin was suspended.');
        } catch (IdentityAccessException) {
            $this->assertSame(AccountStatus::Active, $admin->fresh()->status);
        }

        try {
            $admin->removeRole(RoleName::SuperAdmin->value);
            $this->fail('The final Super Admin role was removed.');
        } catch (IdentityAccessException) {
            $this->assertTrue($admin->fresh()->hasRole(RoleName::SuperAdmin->value));
        }

        try {
            $admin->delete();
            $this->fail('The final Super Admin was deleted.');
        } catch (IdentityAccessException) {
            $this->assertModelExists($admin);
            $this->assertTrue($admin->fresh()->hasRole(RoleName::SuperAdmin->value));
            $this->assertSame(AccountStatus::Active, $admin->fresh()->status);
        }
    }

    public function test_authorized_operations_still_succeed_when_another_active_super_admin_remains(): void
    {
        $first = $this->createSuperAdmin('primary-owner');
        $second = $this->createActiveUser('secondary-owner');
        app(AssignStaffRole::class)->assign($first, $second, RoleName::SuperAdmin);

        app(ChangeAccountStatus::class)->change($first, $first, AccountStatus::Suspended);

        $this->assertSame(AccountStatus::Suspended, $first->fresh()->status);
        $this->assertSame(AccountStatus::Active, $second->fresh()->status);
        $this->assertTrue($second->fresh()->hasRole(RoleName::SuperAdmin->value));

        $staff = $this->createActiveUser('regular-staff');
        $staff->assignRole(RoleName::Coordinator->value);

        app(ChangeAccountStatus::class)->change($second, $staff, AccountStatus::Suspended);

        $this->assertSame(AccountStatus::Suspended, $staff->fresh()->status);
        $this->assertSame(1, $this->countActiveSuperAdmins());
    }

    public function test_advisory_lock_is_released_after_transaction_rollback(): void
    {
        $pdo = $this->independentPdo();

        DB::beginTransaction();
        app(SuperAdminGuard::class)->acquireTransactionLock();

        $blocked = $pdo->query(
            'SELECT pg_try_advisory_xact_lock('.SuperAdminGuard::ADVISORY_LOCK_KEY.')',
        )->fetchColumn();
        $this->assertFalse((bool) $blocked);

        DB::rollBack();

        $pdo->beginTransaction();
        $available = $pdo->query(
            'SELECT pg_try_advisory_xact_lock('.SuperAdminGuard::ADVISORY_LOCK_KEY.')',
        )->fetchColumn();
        $this->assertTrue((bool) $available);
        $pdo->rollBack();
    }

    public function test_independent_connections_serialize_on_the_shared_super_admin_lock(): void
    {
        $pdoA = $this->independentPdo();
        $pdoB = $this->independentPdo();

        $pdoA->beginTransaction();
        $pdoA->query('SELECT pg_advisory_xact_lock('.SuperAdminGuard::ADVISORY_LOCK_KEY.')')->fetchColumn();

        $pdoB->beginTransaction();
        $pdoB->exec('SET LOCAL lock_timeout = \'100ms\'');

        $blocked = false;

        try {
            $pdoB->query('SELECT pg_advisory_xact_lock('.SuperAdminGuard::ADVISORY_LOCK_KEY.')')->fetchColumn();
        } catch (Throwable) {
            $blocked = true;
        }

        $this->assertTrue($blocked, 'A second PostgreSQL session must wait for the Super Admin advisory lock.');

        $pdoA->rollBack();
        $pdoB->rollBack();

        $pdoB->beginTransaction();
        $acquired = $pdoB->query(
            'SELECT pg_try_advisory_xact_lock('.SuperAdminGuard::ADVISORY_LOCK_KEY.')',
        )->fetchColumn();
        $this->assertTrue((bool) $acquired);
        $pdoB->rollBack();
    }

    public function test_concurrent_suspensions_cannot_leave_zero_active_super_admins(): void
    {
        [$first, $second] = $this->createTwoActiveSuperAdmins();

        $results = $this->raceWorker('suspend', [
            [(int) $first->getKey(), (int) $first->getKey()],
            [(int) $second->getKey(), (int) $second->getKey()],
        ]);

        $this->assertContains('OK', $results);
        $this->assertContains('FAIL', $results);
        $this->assertSame(1, $this->countActiveSuperAdmins());
        $this->assertTrue(
            $first->fresh()->hasRole(RoleName::SuperAdmin->value)
            && $second->fresh()->hasRole(RoleName::SuperAdmin->value),
        );
    }

    public function test_concurrent_demotions_cannot_leave_zero_active_super_admins(): void
    {
        [$first, $second] = $this->createTwoActiveSuperAdmins();

        $results = $this->raceWorker('demote', [
            [(int) $first->getKey(), (int) $first->getKey()],
            [(int) $second->getKey(), (int) $second->getKey()],
        ]);

        $this->assertContains('OK', $results);
        $this->assertContains('FAIL', $results);
        $this->assertSame(1, $this->countActiveSuperAdmins());
        $this->assertGreaterThanOrEqual(1, $this->countSuperAdminHolders());
    }

    public function test_concurrent_deletions_cannot_leave_zero_active_super_admins(): void
    {
        [$first, $second] = $this->createTwoActiveSuperAdmins();

        $results = $this->raceWorker('delete', [
            [(int) $first->getKey(), (int) $first->getKey()],
            [(int) $second->getKey(), (int) $second->getKey()],
        ]);

        $this->assertContains('OK', $results);
        $this->assertContains('FAIL', $results);
        $this->assertSame(1, $this->countActiveSuperAdmins());
        $this->assertSame(1, $this->countSuperAdminHolders());
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function createTwoActiveSuperAdmins(): array
    {
        $first = $this->createSuperAdmin('race-owner-a');
        $second = $this->createActiveUser('race-owner-b');
        app(AssignStaffRole::class)->assign($first, $second, RoleName::SuperAdmin);

        $this->assertSame(2, $this->countActiveSuperAdmins());

        return [$first->fresh(), $second->fresh()];
    }

    private function createSuperAdmin(string $label): User
    {
        StaffmateTestingDatabase::assertConnectedIdentity();

        $user = app(BootstrapSuperAdmin::class)->create(
            $label,
            StaffmateTestingDatabase::fixtureEmail($label),
            'Staffmate-Owner-1!',
        );

        $this->trackFixture($user);

        return $user;
    }

    private function createActiveUser(string $label): User
    {
        StaffmateTestingDatabase::assertConnectedIdentity();

        $user = User::factory()->create([
            'name' => $label,
            'email' => StaffmateTestingDatabase::fixtureEmail($label),
            'status' => AccountStatus::Active,
            'email_verified_at' => now(),
        ]);

        $this->trackFixture($user);

        return $user;
    }

    private function trackFixture(User $user): void
    {
        $email = (string) $user->email;

        if (! str_ends_with($email, '@'.StaffmateTestingDatabase::FIXTURE_EMAIL_DOMAIN)) {
            throw new RuntimeException('Refusing to track a non-concurrency fixture email for cleanup.');
        }

        $this->userIds[] = (int) $user->getKey();
    }

    private function cleanupTrackedFixtures(): void
    {
        if ($this->userIds === []) {
            return;
        }

        StaffmateTestingDatabase::assertConnectedIdentity();

        $ids = array_values(array_unique($this->userIds));
        $domain = '%@'.StaffmateTestingDatabase::FIXTURE_EMAIL_DOMAIN;

        $safeIds = DB::table('users')
            ->whereIn('id', $ids)
            ->where('email', 'like', $domain)
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        if ($safeIds === []) {
            $this->userIds = [];

            return;
        }

        DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->whereIn('model_id', $safeIds)
            ->delete();

        DB::table('users')
            ->whereIn('id', $safeIds)
            ->where('email', 'like', $domain)
            ->delete();

        $this->userIds = [];
    }

    private function countActiveSuperAdmins(): int
    {
        return User::query()
            ->where('status', AccountStatus::Active->value)
            ->whereHas('roles', function ($query): void {
                $query->where('name', RoleName::SuperAdmin->value)
                    ->where('guard_name', 'web');
            })
            ->count();
    }

    private function countSuperAdminHolders(): int
    {
        return User::query()
            ->whereHas('roles', function ($query): void {
                $query->where('name', RoleName::SuperAdmin->value)
                    ->where('guard_name', 'web');
            })
            ->count();
    }

    private function independentPdo(): PDO
    {
        StaffmateTestingDatabase::assertResolvedLaravelConfiguration();

        $config = config('database.connections.pgsql');

        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s',
            $config['host'],
            $config['port'] ?? 5432,
            StaffmateTestingDatabase::DATABASE,
        );

        $pdo = new PDO($dsn, StaffmateTestingDatabase::USERNAME, (string) $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);

        StaffmateTestingDatabase::assertPdoIdentity($pdo);

        return $pdo;
    }

    /**
     * @param  list<array{0: int, 1: int}>  $jobs  actor id, target id
     * @return list<string>
     */
    private function raceWorker(string $operation, array $jobs): array
    {
        StaffmateTestingDatabase::assertConnectedIdentity();
        StaffmateTestingDatabase::assertResolvedLaravelConfiguration();

        $autoload = base_path('vendor/autoload.php');
        $bootstrap = base_path('bootstrap/app.php');
        $tmpdir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'staffmate-sa-race-'.uniqid('', true);
        mkdir($tmpdir);

        $readyFiles = [];
        $goFile = $tmpdir.DIRECTORY_SEPARATOR.'go';
        $processes = [];

        try {
            foreach ($jobs as $index => [$actorId, $targetId]) {
                $ready = $tmpdir.DIRECTORY_SEPARATOR.'ready-'.$index;
                $readyFiles[] = $ready;

                $script = $this->workerScript(
                    $autoload,
                    $bootstrap,
                    $operation,
                    $actorId,
                    $targetId,
                    $ready,
                    $goFile,
                );

                $scriptPath = $tmpdir.DIRECTORY_SEPARATOR.'worker-'.$index.'.php';
                file_put_contents($scriptPath, $script);

                $process = new Process(
                    [PHP_BINARY, $scriptPath],
                    base_path(),
                    $this->workerEnvironment(),
                );
                $process->setTimeout(30);
                $process->start();
                $processes[] = $process;
            }

            $deadline = microtime(true) + 10;

            while (microtime(true) < $deadline) {
                $readyCount = 0;

                foreach ($readyFiles as $ready) {
                    if (is_file($ready)) {
                        $readyCount++;
                    }
                }

                if ($readyCount === count($readyFiles)) {
                    break;
                }

                usleep(20_000);
            }

            $this->assertSame(
                count($readyFiles),
                count(array_filter($readyFiles, 'is_file')),
                'Worker processes did not become ready in time.',
            );

            file_put_contents($goFile, '1');

            $results = [];

            foreach ($processes as $process) {
                $process->wait();
                $output = trim($process->getOutput()."\n".$process->getErrorOutput());
                $this->assertSame(0, $process->getExitCode(), $output);

                if (str_contains($output, 'OK')) {
                    $results[] = 'OK';
                } elseif (str_contains($output, 'FAIL')) {
                    $results[] = 'FAIL';
                } else {
                    $this->fail('Unexpected worker output: '.$output);
                }
            }

            return $results;
        } finally {
            foreach (glob($tmpdir.DIRECTORY_SEPARATOR.'*') ?: [] as $file) {
                @unlink($file);
            }
            @rmdir($tmpdir);
        }
    }

    /**
     * @return array<string, string>
     */
    private function workerEnvironment(): array
    {
        StaffmateTestingDatabase::assertResolvedLaravelConfiguration();

        $pgsql = config('database.connections.pgsql');
        $env = $this->inheritedProcessEnvironment();

        $env['APP_ENV'] = 'testing';
        $env['APP_KEY'] = (string) (config('app.key') ?: ($env['APP_KEY'] ?? ''));
        $env['DB_CONNECTION'] = 'pgsql';
        $env['DB_HOST'] = (string) $pgsql['host'];
        $env['DB_PORT'] = (string) ($pgsql['port'] ?? 5432);
        $env['DB_DATABASE'] = StaffmateTestingDatabase::DATABASE;
        $env['DB_USERNAME'] = StaffmateTestingDatabase::USERNAME;
        $env['DB_PASSWORD'] = (string) $pgsql['password'];
        $env['DB_URL'] = '';
        $env['SESSION_DRIVER'] = 'array';
        $env['CACHE_STORE'] = 'array';

        unset($env['DATABASE_URL']);

        return $env;
    }

    /**
     * @return array<string, string>
     */
    private function inheritedProcessEnvironment(): array
    {
        $env = [];
        $allowed = [
            'PATH', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'WINDIR',
            'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH',
            'LANG', 'LC_ALL', 'TERM', 'ComSpec', 'APP_KEY',
        ];

        foreach (array_merge($_ENV, $_SERVER) as $key => $value) {
            if (! is_string($key) || ! is_scalar($value)) {
                continue;
            }

            if (str_starts_with($key, 'DB_') || $key === 'DATABASE_URL') {
                continue;
            }

            if (in_array($key, $allowed, true) || str_starts_with($key, 'STAFFMATE_')) {
                $env[$key] = (string) $value;
            }
        }

        return $env;
    }

    private function workerScript(
        string $autoload,
        string $bootstrap,
        string $operation,
        int $actorId,
        int $targetId,
        string $readyFile,
        string $goFile,
    ): string {
        $operationExport = var_export($operation, true);
        $autoloadExport = var_export($autoload, true);
        $bootstrapExport = var_export($bootstrap, true);
        $readyExport = var_export($readyFile, true);
        $goExport = var_export($goFile, true);
        $databaseExport = var_export(StaffmateTestingDatabase::DATABASE, true);
        $usernameExport = var_export(StaffmateTestingDatabase::USERNAME, true);
        $supportExport = var_export(base_path('tests/Support/StaffmateTestingDatabase.php'), true);

        return <<<PHP
<?php

require {$autoloadExport};
require {$supportExport};

\$app = require {$bootstrapExport};
\$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Modules\Identity\Actions\AssignStaffRole;
use App\Modules\Identity\Actions\ChangeAccountStatus;
use App\Modules\Identity\Exceptions\IdentityAccessException;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\RoleName;
use Tests\Support\StaffmateTestingDatabase;

try {
    StaffmateTestingDatabase::assertNoCachedConfig(base_path());
    StaffmateTestingDatabase::assertResolvedLaravelConfiguration();
    StaffmateTestingDatabase::assertConnectedIdentity();

    if (config('database.connections.pgsql.database') !== {$databaseExport}
        || config('database.connections.pgsql.username') !== {$usernameExport}
        || ! blank(config('database.connections.pgsql.url'))) {
        throw new RuntimeException('Worker resolved unexpected database configuration.');
    }
} catch (Throwable \$exception) {
    fwrite(STDERR, \$exception->getMessage()."\\n");
    exit(1);
}

\$operation = {$operationExport};
\$actorId = {$actorId};
\$targetId = {$targetId};
\$readyFile = {$readyExport};
\$goFile = {$goExport};

file_put_contents(\$readyFile, '1');

for (\$i = 0; \$i < 500; \$i++) {
    if (is_file(\$goFile)) {
        break;
    }

    usleep(10_000);
}

if (! is_file(\$goFile)) {
    fwrite(STDERR, "TIMEOUT waiting for go signal\\n");
    exit(1);
}

try {
    StaffmateTestingDatabase::assertConnectedIdentity();

    \$actor = User::query()->findOrFail(\$actorId);
    \$target = User::query()->findOrFail(\$targetId);

    match (\$operation) {
        'suspend' => app(ChangeAccountStatus::class)->change(\$actor, \$target, AccountStatus::Suspended),
        'demote' => app(AssignStaffRole::class)->assign(\$actor, \$target, RoleName::Management),
        'delete' => \$target->delete(),
        default => throw new RuntimeException('Unknown operation'),
    };

    echo "OK\\n";
    exit(0);
} catch (IdentityAccessException \$exception) {
    echo "FAIL\\n";
    exit(0);
} catch (Throwable \$exception) {
    fwrite(STDERR, \$exception::class.': '.\$exception->getMessage()."\\n");
    exit(1);
}
PHP;
    }
}
