<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use App\Modules\Identity\Actions\ChangeAccountStatus;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\PermissionName;
use App\Modules\Identity\Support\RoleName;
use App\Modules\Identity\Support\SessionKey;
use Database\Seeders\IdentityPermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class SessionBoundaryTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(IdentityPermissionSeeder::class);
        $this->asAdminPortal();
    }

    public function test_session_cookie_is_host_only_and_login_regenerates_the_session(): void
    {
        $before = $this->get('/sanctum/csrf-cookie');
        $before->assertNoContent();

        $sessionCookie = $before->getCookie(config('session.cookie'));
        $this->assertNotNull($sessionCookie);
        $this->assertTrue($sessionCookie->isHttpOnly());
        $this->assertSame('lax', $sessionCookie->getSameSite());
        $this->assertNull($sessionCookie->getDomain());
        $this->assertFalse($sessionCookie->isSecure());

        $previous = session()->getId();

        User::factory()->create([
            'email' => 'rotate@example.com',
        ]);

        $this->postJson('/login', [
            'email' => 'rotate@example.com',
            'password' => 'password',
        ])->assertOk();

        $this->assertNotSame($previous, session()->getId());
        $started = session(SessionKey::StartedAt);

        $this->getJson('/api/v1/me')->assertOk();
        $this->assertSame($started, session(SessionKey::StartedAt));
    }

    public function test_absolute_lifetime_ends_the_session_without_extending_on_activity(): void
    {
        $user = $this->confirmedAdmin('absolute@example.com');

        $this->assertAuthenticatedAs($user);

        session([
            SessionKey::StartedAt => now()->getTimestamp() - ((int) config('session.absolute_lifetime') * 60) - 5,
        ]);

        $this->getJson('/api/v1/admin/home')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Session expired.');

        $this->assertGuest();
    }

    public function test_suspension_revokes_the_current_session(): void
    {
        $admin = $this->confirmedAdmin('suspend-admin@example.com');
        $staff = User::factory()->create([
            'email' => 'suspend-staff@example.com',
        ]);
        $staff->assignRole(RoleName::Coordinator->value);

        $this->postJson('/logout')->assertNoContent();
        $this->postJson('/login', [
            'email' => 'suspend-staff@example.com',
            'password' => 'password',
        ])->assertJsonPath('status', 'authenticated');

        app(ChangeAccountStatus::class)->change($admin, $staff, AccountStatus::Suspended);

        // Simulate a new HTTP request: drop any Auth user cached from login.
        $this->flushAuthenticationState();

        $this->getJson('/api/v1/me')->assertUnauthorized();
        $this->assertGuest();
    }

    public function test_a_stale_auth_revision_cannot_keep_admin_access(): void
    {
        $admin = $this->confirmedAdmin('revision@example.com');
        $previous = (int) session(SessionKey::AuthRevision);

        $admin->forceFill([
            'auth_revision' => $previous + 1,
        ])->save();

        $this->flushAuthenticationState();

        $this->withSession([
            SessionKey::AuthRevision => $previous,
        ])->getJson('/api/v1/admin/home')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');

        $this->assertGuest();
    }

    public function test_authenticate_session_does_not_reject_admin_home_after_mfa(): void
    {
        $user = User::factory()->create([
            'email' => 'hmac@example.com',
        ]);
        $user->assignRole(RoleName::SuperAdmin->value);

        $this->postJson('/login', [
            'email' => 'hmac@example.com',
            'password' => 'password',
        ])->assertJsonPath('status', 'authenticated');

        $this->postJson('/user/two-factor-authentication')->assertSuccessful();
        $secret = decrypt((string) $user->fresh()->two_factor_secret);
        $google2fa = new Google2FA();
        $enrollmentCode = $google2fa->getCurrentOtp($secret);

        $this->postJson('/user/confirmed-two-factor-authentication', [
            'code' => $enrollmentCode,
        ])->assertJsonPath('status', 'enrolled');

        $this->postJson('/logout')->assertNoContent();
        $this->postJson('/login', [
            'email' => 'hmac@example.com',
            'password' => 'password',
        ])->assertJsonPath('two_factor', true);

        $this->postJson('/two-factor-challenge', [
            'code' => $this->unusedTotp($google2fa, $secret, $enrollmentCode),
        ])->assertOk()->assertJsonPath('status', 'authenticated');

        $this->get('/sanctum/csrf-cookie')->assertNoContent();

        $this->assertSame($user->fresh()->getAuthPassword(), session(SessionKey::PasswordHash));
        $this->assertNotSame(session(SessionKey::PasswordHash), session('password_hash_web'));

        $this->getJson('/api/v1/identity/state')
            ->assertOk()
            ->assertJsonPath('mfa_confirmed', true)
            ->assertJsonPath('sections.admin', true)
            ->assertJsonPath('sections.crm', true);
        $this->getJson('/api/v1/admin/home')->assertOk();
        $this->getJson('/api/v1/crm/home')->assertOk();
    }

    public function test_a_replaced_password_cannot_keep_admin_access(): void
    {
        $admin = $this->confirmedAdmin('password-boundary@example.com');
        $previous = session(SessionKey::PasswordHash);
        $this->assertIsString($previous);

        $admin->forceFill([
            'password' => Hash::make('Replacement-Password-1!'),
        ])->save();

        $this->flushAuthenticationState();

        $this->withSession([
            SessionKey::PasswordHash => $previous,
        ])->getJson('/api/v1/admin/home')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');

        $this->assertGuest();
    }

    public function test_shared_session_permits_authorized_sections_and_denies_cross_section_access(): void
    {
        $admin = $this->confirmedAdmin('sections@example.com');

        $this->getJson('/api/v1/admin/home')->assertOk();
        $this->getJson('/api/v1/crm/home')->assertOk();

        $staff = User::factory()->create([
            'email' => 'crm-only@example.com',
        ]);
        $staff->givePermissionTo(PermissionName::CrmAccess->value);

        $this->postJson('/logout')->assertNoContent();
        $this->flushAuthenticationState();

        $this->postJson('/login', [
            'email' => 'crm-only@example.com',
            'password' => 'password',
        ])->assertJsonPath('status', 'authenticated');

        $this->postJson('/user/two-factor-authentication')->assertSuccessful();
        $secret = decrypt((string) $staff->fresh()->two_factor_secret);
        $this->postJson('/user/confirmed-two-factor-authentication', [
            'code' => (new Google2FA)->getCurrentOtp($secret),
        ])->assertSuccessful();

        $this->getJson('/api/v1/crm/home')->assertOk();
        $this->getJson('/api/v1/admin/home')
            ->assertForbidden()
            ->assertJsonPath('reason', 'permission');
        $this->getJson('/api/v1/admin/employees')
            ->assertForbidden();

        $this->assertNotSame($admin->getKey(), $staff->getKey());
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    private function confirmedAdmin(string $email): User
    {
        $user = User::factory()->create([
            'email' => $email,
        ]);
        $user->assignRole(RoleName::SuperAdmin->value);

        $this->postJson('/login', [
            'email' => $email,
            'password' => 'password',
        ])->assertJsonPath('status', 'authenticated');

        $this->postJson('/user/two-factor-authentication')->assertSuccessful();
        $secret = decrypt((string) $user->fresh()->two_factor_secret);
        $code = (new Google2FA())->getCurrentOtp($secret);

        $this->postJson('/user/confirmed-two-factor-authentication', [
            'code' => $code,
        ])->assertJsonPath('status', 'enrolled');

        return $user->fresh();
    }

    /**
     * Fortify rejects reused OTPs; pick an adjacent window code after enrollment.
     */
    private function unusedTotp(Google2FA $google2fa, string $secret, string $avoid): string
    {
        $period = intdiv(time(), 30);

        foreach ([$period + 1, $period - 1, $period + 2, $period - 2] as $counter) {
            $code = $google2fa->oathTotp($secret, $counter);

            if ($code !== $avoid) {
                return $code;
            }
        }

        return $google2fa->oathTotp($secret, $period + 3);
    }
}
