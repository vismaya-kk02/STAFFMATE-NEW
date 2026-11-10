<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use App\Modules\Identity\Http\Responses\GenericPasswordResetLinkResponse;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\RoleName;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->asAdminPortal();
    }

    public function test_active_user_can_sign_in_with_a_session_and_still_cannot_open_a_business_route(): void
    {
        Route::middleware(['auth:web', 'mfa.enrolled'])->get('/api/v1/_test/business', function () {
            return response()->json(['ok' => true]);
        });

        $user = User::factory()->create([
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
        ]);

        $this->post('/login', [
            'email' => 'ada@example.com',
            'password' => 'password',
        ])->assertRedirect('/');

        $this->assertAuthenticatedAs($user);

        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertExactJson([
                'id' => $user->id,
                'name' => 'Ada Lovelace',
                'email' => 'ada@example.com',
            ]);

        $this->getJson('/api/v1/_test/business')
            ->assertForbidden()
            ->assertJsonPath('message', 'Multi-factor authentication is required.');

        $this->assertNull($user->fresh()->two_factor_confirmed_at);
    }

    public function test_json_login_does_not_issue_an_api_token(): void
    {
        $user = User::factory()->create([
            'email' => 'token-check@example.com',
        ]);

        $response = $this->postJson('/login', [
            'email' => 'token-check@example.com',
            'password' => 'password',
        ]);

        $response->assertSuccessful();
        $this->assertAuthenticatedAs($user);
        $this->assertStringNotContainsString('access_token', (string) $response->getContent());
        $this->assertStringNotContainsString('plainTextToken', (string) $response->getContent());
    }

    public function test_suspended_and_invited_accounts_receive_the_same_failure_as_a_bad_password(): void
    {
        User::factory()->suspended()->create([
            'email' => 'suspended@example.com',
        ]);
        User::factory()->invited()->create([
            'email' => 'invited@example.com',
        ]);
        User::factory()->create([
            'email' => 'active@example.com',
        ]);
        User::factory()->unverified()->create([
            'email' => 'unverified@example.com',
        ]);

        foreach ([
            ['suspended@example.com', 'password'],
            ['invited@example.com', 'password'],
            ['unverified@example.com', 'password'],
            ['active@example.com', 'wrong-password'],
            ['missing@example.com', 'password'],
        ] as [$email, $password]) {
            $response = $this->postJson('/login', [
                'email' => $email,
                'password' => $password,
            ]);

            $response->assertUnprocessable();
            $this->assertSame(__('auth.failed'), $response->json('errors.email.0'));
            $this->assertStringNotContainsStringIgnoringCase('suspended', (string) $response->json('errors.email.0'));
            $this->assertStringNotContainsStringIgnoringCase('invited', (string) $response->json('errors.email.0'));
            $this->assertStringNotContainsStringIgnoringCase('verified', (string) $response->json('errors.email.0'));
            $this->assertGuest();
        }
    }

    public function test_login_is_rate_limited(): void
    {
        User::factory()->create([
            'email' => 'limited@example.com',
        ]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/login', [
                'email' => 'limited@example.com',
                'password' => 'wrong-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/login', [
            'email' => 'limited@example.com',
            'password' => 'wrong-password',
        ])->assertTooManyRequests();

        $this->assertGuest();
    }

    public function test_logout_ends_the_session(): void
    {
        User::factory()->create([
            'email' => 'logout@example.com',
        ]);

        $this->postJson('/login', [
            'email' => 'logout@example.com',
            'password' => 'password',
        ])->assertSuccessful();

        $this->postJson('/logout')->assertNoContent();
        $this->assertGuest();
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_password_reset_does_not_reveal_whether_the_account_exists_and_stores_a_hashed_token(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'reset@example.com',
        ]);

        $this->postJson('/forgot-password', [
            'email' => 'missing@example.com',
        ])->assertOk()->assertJsonPath('message', GenericPasswordResetLinkResponse::MESSAGE);

        Notification::assertNothingSent();

        $this->postJson('/forgot-password', [
            'email' => 'reset@example.com',
        ])->assertOk()->assertJsonPath('message', GenericPasswordResetLinkResponse::MESSAGE);

        $token = null;

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });

        $stored = DB::table('password_reset_tokens')->where('email', $user->email)->value('token');

        $this->assertNotNull($token);
        $this->assertNotNull($stored);
        $this->assertNotSame($token, $stored);

        $this->postJson('/reset-password', [
            'token' => $token,
            'email' => 'reset@example.com',
            'password' => 'Staffmate-Reset-1!',
            'password_confirmation' => 'Staffmate-Reset-1!',
        ])->assertOk();

        $this->assertTrue(Hash::check('Staffmate-Reset-1!', (string) $user->fresh()->password));

        $this->postJson('/login', [
            'email' => 'reset@example.com',
            'password' => 'password',
        ])->assertUnprocessable();

        $this->postJson('/login', [
            'email' => 'reset@example.com',
            'password' => 'Staffmate-Reset-1!',
        ])->assertSuccessful();
    }

    public function test_password_reset_requests_are_throttled_without_confirming_the_account(): void
    {
        User::factory()->create([
            'email' => 'throttled-reset@example.com',
        ]);

        $this->postJson('/forgot-password', [
            'email' => 'throttled-reset@example.com',
        ])->assertOk();

        $this->postJson('/forgot-password', [
            'email' => 'throttled-reset@example.com',
        ])->assertUnprocessable()
            ->assertJsonPath('message', __('passwords.throttled'));
    }

    public function test_profile_and_password_updates_cannot_change_status_role_or_mfa(): void
    {
        $user = User::factory()->create([
            'email' => 'profile@example.com',
            'status' => AccountStatus::Active,
        ]);

        $this->actingAs($user)->putJson('/user/profile-information', [
            'name' => 'Ada Lovelace',
            'email' => 'profile@example.com',
            'status' => AccountStatus::Suspended->value,
            'role' => RoleName::SuperAdmin->value,
            'two_factor_confirmed_at' => now()->toISOString(),
        ])->assertOk();

        $fresh = $user->fresh();

        $this->assertSame('Ada Lovelace', $fresh->name);
        $this->assertSame(AccountStatus::Active, $fresh->status);
        $this->assertNull($fresh->two_factor_confirmed_at);
        $this->assertFalse($fresh->roles()->where('name', RoleName::SuperAdmin->value)->exists());

        $this->actingAs($user)->putJson('/user/password', [
            'current_password' => 'wrong-password',
            'password' => 'Staffmate-Reset-1!',
            'password_confirmation' => 'Staffmate-Reset-1!',
        ])->assertUnprocessable();

        $this->assertTrue(Hash::check('password', (string) $user->fresh()->password));

        $this->actingAs($user)->putJson('/user/password', [
            'current_password' => 'password',
            'password' => 'Staffmate-Reset-1!',
            'password_confirmation' => 'Staffmate-Reset-1!',
        ])->assertOk();

        $this->assertTrue(Hash::check('Staffmate-Reset-1!', (string) $user->fresh()->password));
    }

    public function test_unverified_users_cannot_update_their_profile_or_password(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'unverified@example.com',
        ]);

        $this->actingAs($user)->putJson('/user/profile-information', [
            'name' => 'Ada Lovelace',
            'email' => 'unverified@example.com',
        ])->assertForbidden()
            ->assertJsonPath('message', 'Your email address is not verified.');

        $this->actingAs($user)->putJson('/user/password', [
            'current_password' => 'password',
            'password' => 'Staffmate-Reset-1!',
            'password_confirmation' => 'Staffmate-Reset-1!',
        ])->assertForbidden();

        $this->assertTrue(Hash::check('password', (string) $user->fresh()->password));
    }
}
