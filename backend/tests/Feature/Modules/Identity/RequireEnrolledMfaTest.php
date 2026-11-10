<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\SessionKey;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RequireEnrolledMfaTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->asAdminPortal();

        Route::middleware(['api', 'auth:web', 'mfa.enrolled'])->get('/api/v1/_test/protected-access', function () {
            return response()->json(['ok' => true]);
        });
    }

    public function test_guests_are_unauthenticated(): void
    {
        $this->getJson('/api/v1/_test/protected-access')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_password_session_without_mfa_is_forbidden(): void
    {
        $user = User::factory()->make([
            'id' => 21,
            'status' => AccountStatus::Active,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/_test/protected-access')
            ->assertForbidden()
            ->assertJsonPath('message', 'Multi-factor authentication is required.');
    }

    public function test_suspended_account_is_unauthenticated_before_the_mfa_gate(): void
    {
        // Persisted user required: logout clears remember_token via save().
        $user = User::factory()->suspended()->create([
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($user)
            ->withSession([
                SessionKey::MfaConfirmedAt => now()->getTimestamp(),
                SessionKey::AuthRevision => 0,
                SessionKey::PasswordHash => $user->getAuthPassword(),
                SessionKey::StartedAt => now()->getTimestamp(),
            ])
            ->getJson('/api/v1/_test/protected-access')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_enrolled_active_account_can_pass_the_gate_only_after_this_session_confirms_mfa(): void
    {
        $user = User::factory()->make([
            'id' => 23,
            'status' => AccountStatus::Active,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/_test/protected-access')
            ->assertForbidden()
            ->assertJsonPath('reason', 'challenge');

        $this->actingAs($user)
            ->withSession([
                SessionKey::MfaConfirmedAt => now()->getTimestamp(),
                SessionKey::AuthRevision => 0,
                SessionKey::PasswordHash => $user->getAuthPassword(),
                SessionKey::StartedAt => now()->getTimestamp(),
            ])
            ->getJson('/api/v1/_test/protected-access')
            ->assertOk()
            ->assertExactJson(['ok' => true]);
    }

    public function test_current_user_probe_stays_available_before_mfa_enrollment(): void
    {
        $user = User::factory()->make([
            'id' => 24,
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertExactJson([
                'id' => 24,
                'name' => 'Ada Lovelace',
                'email' => 'ada@example.com',
            ]);
    }
}
