<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use App\Modules\Identity\Actions\BootstrapSuperAdmin;
use Database\Seeders\IdentityPermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ResetSuperAdminMfaCommandTest extends TestCase
{
    use DatabaseTransactions;

    public function test_command_clears_super_admin_enrollment_without_granting_access(): void
    {
        $this->seed(IdentityPermissionSeeder::class);

        $admin = app(BootstrapSuperAdmin::class)->create(
            'Platform Owner',
            'owner-'.uniqid().'@example.com',
            'Staffmate-Owner-1!',
        );

        $admin->forceFill([
            'two_factor_secret' => encrypt('SECRETVALUE'),
            'two_factor_recovery_codes' => encrypt(json_encode(['code-one'])),
            'two_factor_confirmed_at' => now(),
        ])->save();

        $this->artisan('staffmate:mfa-reset')
            ->expectsQuestion('Email', strtoupper($admin->email))
            ->expectsOutputToContain('enrollment again')
            ->doesntExpectOutputToContain('SECRETVALUE')
            ->doesntExpectOutputToContain('code-one')
            ->assertSuccessful();

        $fresh = $admin->fresh();
        $this->assertNull($fresh->two_factor_secret);
        $this->assertNull($fresh->two_factor_recovery_codes);
        $this->assertNull($fresh->two_factor_confirmed_at);
        $this->assertGreaterThan(0, (int) $fresh->auth_revision);

        $this->asAdminPortal()->postJson('/login', [
            'email' => $admin->email,
            'password' => 'Staffmate-Owner-1!',
        ])->assertJsonPath('status', 'authenticated');

        $this->getJson('/api/v1/admin/home')
            ->assertForbidden()
            ->assertJsonPath('reason', 'enrollment');
    }

    public function test_command_rejects_a_staff_account(): void
    {
        $this->seed(IdentityPermissionSeeder::class);

        $staff = User::factory()->create([
            'email' => 'staff-'.uniqid().'@example.com',
        ]);

        $this->artisan('staffmate:mfa-reset')
            ->expectsQuestion('Email', $staff->email)
            ->expectsOutputToContain('No Super Admin account matches')
            ->assertFailed();
    }
}
