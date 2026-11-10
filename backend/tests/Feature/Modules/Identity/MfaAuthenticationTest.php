<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use App\Modules\Identity\Support\RoleName;
use App\Modules\Identity\Support\SessionKey;
use Database\Seeders\IdentityPermissionSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class MfaAuthenticationTest extends TestCase
{
    use DatabaseTransactions;

    private Google2FA $google2fa;

    private ?string $lastEnrollmentOtp = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->google2fa = new Google2FA();
        $this->lastEnrollmentOtp = null;
        $this->asAdminPortal();
    }

    public function test_password_login_starts_enrollment_and_confirmation_opens_admin_home(): void
    {
        $user = User::factory()->create([
            'email' => 'enroll@example.com',
        ]);
        // Section flags come from Spatie permissions, not from being signed in.
        $this->seed(IdentityPermissionSeeder::class);
        $user->assignRole(RoleName::SuperAdmin->value);

        $this->postJson('/login', [
            'email' => 'enroll@example.com',
            'password' => 'password',
            'remember' => true,
        ])->assertOk()->assertJsonPath('status', 'authenticated');

        $this->assertAuthenticatedAs($user);
        $this->getJson('/api/v1/me')->assertOk()->assertJsonPath('email', 'enroll@example.com');
        $this->getJson('/api/v1/identity/state')
            ->assertOk()
            ->assertJsonPath('mfa_enrolled', false)
            ->assertJsonPath('mfa_confirmed', false)
            ->assertJsonPath('sections.admin', true)
            ->assertJsonPath('sections.crm', true);
        $this->getJson('/api/v1/admin/home')
            ->assertForbidden()
            ->assertJsonPath('reason', 'enrollment');

        $this->postJson('/user/two-factor-authentication')->assertSuccessful();

        $secret = decrypt((string) $user->fresh()->two_factor_secret);
        $this->assertNotSame($secret, $user->fresh()->two_factor_secret);
        $this->assertIsString($secret);
        $this->assertNotSame('', $secret);

        $this->postJson('/user/confirmed-two-factor-authentication', [
            'code' => $this->google2fa->getCurrentOtp($secret),
        ])->assertOk()->assertJsonPath('status', 'enrolled');

        $this->assertNotNull($user->fresh()->two_factor_confirmed_at);
        $this->getJson('/api/v1/identity/state')
            ->assertOk()
            ->assertJsonPath('mfa_enrolled', true)
            ->assertJsonPath('mfa_confirmed', true);
        $this->getJson('/api/v1/admin/home')
            ->assertOk()
            ->assertJsonPath('email', 'enroll@example.com');

        foreach ($this->app['cookie']->getQueuedCookies() as $cookie) {
            $this->assertStringNotContainsString('remember', $cookie->getName());
        }
    }

    public function test_later_login_requires_a_challenge_and_recovery_codes_are_single_use(): void
    {
        $user = User::factory()->create([
            'email' => 'challenge@example.com',
        ]);
        $secret = $this->enroll($user);
        $this->seed(IdentityPermissionSeeder::class);
        $user->assignRole(RoleName::SuperAdmin->value);
        $codes = $this->getJson('/user/two-factor-recovery-codes')->assertOk()->json();
        $this->assertIsArray($codes);
        $this->assertNotEmpty($codes);

        $storedCodes = $user->fresh()->two_factor_recovery_codes;
        $this->assertNotSame(json_encode($codes), $storedCodes);

        $this->postJson('/logout')->assertNoContent();
        $this->assertGuest();

        $this->postJson('/login', [
            'email' => 'challenge@example.com',
            'password' => 'password',
        ])->assertOk()->assertJsonPath('two_factor', true);

        $this->assertGuest();
        $this->getJson('/api/v1/me')->assertUnauthorized();
        $this->getJson('/api/v1/admin/home')->assertUnauthorized();

        $this->postJson('/two-factor-challenge', [
            'code' => $this->unusedTotp($secret),
        ])->assertOk()->assertJsonPath('status', 'authenticated');

        $this->assertAuthenticatedAs($user);
        $this->getJson('/api/v1/admin/home')->assertOk();

        $this->postJson('/logout')->assertNoContent();
        $this->postJson('/login', [
            'email' => 'challenge@example.com',
            'password' => 'password',
        ])->assertJsonPath('two_factor', true);

        $this->postJson('/two-factor-challenge', [
            'recovery_code' => $codes[0],
        ])->assertOk()->assertJsonPath('status', 'authenticated');

        $this->postJson('/logout')->assertNoContent();
        $this->postJson('/login', [
            'email' => 'challenge@example.com',
            'password' => 'password',
        ])->assertJsonPath('two_factor', true);

        $this->postJson('/two-factor-challenge', [
            'recovery_code' => $codes[0],
        ])->assertUnprocessable();
        $this->assertGuest();
    }

    public function test_reusing_an_enrollment_otp_on_challenge_is_rejected(): void
    {
        $user = User::factory()->create([
            'email' => 'otp-replay@example.com',
        ]);

        $this->postJson('/login', [
            'email' => 'otp-replay@example.com',
            'password' => 'password',
        ])->assertJsonPath('status', 'authenticated');

        $this->postJson('/user/two-factor-authentication')->assertSuccessful();
        $secret = decrypt((string) $user->fresh()->two_factor_secret);
        $enrollmentCode = $this->google2fa->getCurrentOtp($secret);

        $this->postJson('/user/confirmed-two-factor-authentication', [
            'code' => $enrollmentCode,
        ])->assertJsonPath('status', 'enrolled');

        $this->seed(IdentityPermissionSeeder::class);
        $user->assignRole(RoleName::SuperAdmin->value);

        $this->postJson('/logout')->assertNoContent();
        $this->postJson('/login', [
            'email' => 'otp-replay@example.com',
            'password' => 'password',
        ])->assertJsonPath('two_factor', true);

        $this->postJson('/two-factor-challenge', [
            'code' => $enrollmentCode,
        ])->assertUnprocessable();

        $this->postJson('/two-factor-challenge', [
            'code' => $this->unusedTotp($secret, $enrollmentCode),
        ])->assertOk()->assertJsonPath('status', 'authenticated');
    }

    public function test_mfa_challenge_is_rate_limited(): void
    {
        $user = User::factory()->create([
            'email' => 'mfa-limit@example.com',
        ]);
        $secret = $this->enroll($user);
        $this->postJson('/logout')->assertNoContent();
        $this->postJson('/login', [
            'email' => 'mfa-limit@example.com',
            'password' => 'password',
        ])->assertJsonPath('two_factor', true);

        $invalid = $this->invalidCode($secret);

        // Enrollment confirmation already consumed one attempt against the same
        // attempt|{user id}|{ip} bucket shared with two-factor-challenge.
        for ($attempt = 0; $attempt < 4; $attempt++) {
            $this->postJson('/two-factor-challenge', [
                'code' => $invalid,
            ])->assertUnprocessable();
        }

        $this->postJson('/two-factor-challenge', [
            'code' => $invalid,
        ])->assertTooManyRequests();
    }

    public function test_replacing_mfa_requires_a_recent_password_and_blocks_admin_until_reenrolled(): void
    {
        $user = User::factory()->create([
            'email' => 'replace@example.com',
        ]);
        $this->enroll($user);

        $this->withSession([
            'auth.password_confirmed_at' => time() - 901,
        ])->deleteJson('/user/two-factor-authentication')->assertStatus(423);

        $this->assertNotNull($user->fresh()->two_factor_confirmed_at);

        $this->postJson('/user/confirm-password', [
            'password' => 'password',
        ])->assertSuccessful();

        $this->deleteJson('/user/two-factor-authentication')
            ->assertOk()
            ->assertJsonPath('status', 'disabled');

        $this->assertNull($user->fresh()->two_factor_confirmed_at);
        $this->getJson('/api/v1/admin/home')
            ->assertForbidden()
            ->assertJsonPath('reason', 'enrollment');
    }

    public function test_password_reset_links_point_at_the_unified_app_origin(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'reset-link@example.com',
        ]);

        $this->postJson('/forgot-password', [
            'email' => 'reset-link@example.com',
        ])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $url = $notification->toMail($user)->actionUrl;

            return str_starts_with($url, 'http://app.localhost:5173/reset-password/');
        });

        $admin = User::factory()->create([
            'email' => 'reset-admin@example.com',
        ]);
        $this->seed(IdentityPermissionSeeder::class);
        $admin->assignRole(RoleName::SuperAdmin->value);

        $this->postJson('/forgot-password', [
            'email' => 'reset-admin@example.com',
        ])->assertOk();

        Notification::assertSentTo($admin, ResetPassword::class, function (ResetPassword $notification) use ($admin): bool {
            $url = $notification->toMail($admin)->actionUrl;

            return str_starts_with($url, 'http://app.localhost:5173/reset-password/');
        });
    }

    public function test_a_row_without_an_explicit_status_cannot_sign_in(): void
    {
        $email = 'default-'.uniqid().'@example.com';

        DB::table('users')->insert([
            'name' => 'Unactivated',
            'email' => $email,
            'password' => Hash::make('Staffmate-Owner-1!'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertSame('invited', DB::table('users')->where('email', $email)->value('status'));

        $this->postJson('/login', [
            'email' => $email,
            'password' => 'Staffmate-Owner-1!',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.email.0', __('auth.failed'));

        $this->assertGuest();
    }

    public function test_authorization_header_cannot_open_admin_home(): void
    {
        $user = User::factory()->create([
            'email' => 'bearer@example.com',
        ]);
        $this->enroll($user);

        $this->withHeader('Authorization', 'Bearer example-token')
            ->getJson('/api/v1/admin/home')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    private function enroll(User $user): string
    {
        $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertJsonPath('status', 'authenticated');

        $this->postJson('/user/two-factor-authentication')->assertSuccessful();

        $secret = decrypt((string) $user->fresh()->two_factor_secret);
        $enrollmentCode = $this->google2fa->getCurrentOtp($secret);

        $this->postJson('/user/confirmed-two-factor-authentication', [
            'code' => $enrollmentCode,
        ])->assertJsonPath('status', 'enrolled');

        $this->lastEnrollmentOtp = $enrollmentCode;

        return $secret;
    }

    /**
     * Return a TOTP that Fortify has not already accepted for this secret.
     * Fortify caches used codes; reusing the enrollment OTP fails by design.
     */
    private function unusedTotp(string $secret, ?string $avoid = null): string
    {
        $avoid ??= $this->lastEnrollmentOtp;
        $period = intdiv(time(), 30);

        foreach ([$period + 1, $period - 1, $period + 2, $period - 2, $period] as $counter) {
            $code = $this->google2fa->oathTotp($secret, $counter);

            if ($avoid === null || $code !== $avoid) {
                return $code;
            }
        }

        return $this->google2fa->oathTotp($secret, $period + 3);
    }

    private function invalidCode(string $secret): string
    {
        $valid = $this->google2fa->getCurrentOtp($secret);

        return $valid === '000000' ? '111111' : '000000';
    }
}
