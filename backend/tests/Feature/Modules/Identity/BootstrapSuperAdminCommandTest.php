<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use App\Modules\Identity\Actions\BootstrapSuperAdmin;
use App\Modules\Identity\Support\PermissionName;
use App\Modules\Identity\Support\RoleName;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class BootstrapSuperAdminCommandTest extends TestCase
{
    use DatabaseTransactions;

    public function test_command_creates_one_super_admin_without_printing_or_storing_the_password(): void
    {
        $password = 'Staffmate-Owner-1!';
        $email = 'Owner-'.uniqid().'@Example.com';
        $before = User::query()->count();

        $this->artisan('staffmate:admin-bootstrap')
            ->expectsQuestion('Name', 'Platform Owner')
            ->expectsQuestion('Email', $email)
            ->expectsQuestion('Password', $password)
            ->expectsQuestion('Confirm password', $password)
            ->expectsOutputToContain('Protected application access requires MFA enrollment.')
            ->doesntExpectOutputToContain($password)
            ->assertSuccessful();

        $this->assertSame($before + 1, User::query()->count());

        $user = User::query()->where('email', Str::lower($email))->firstOrFail();

        $this->assertSame('Platform Owner', $user->name);
        $this->assertNotSame($password, $user->password);
        $this->assertTrue(Hash::check($password, $user->password));
        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->two_factor_confirmed_at);
        $this->assertTrue($user->hasRole(RoleName::SuperAdmin->value));
        $this->assertCount(0, $user->getDirectPermissions());
        $this->assertEqualsCanonicalizing(
            PermissionName::values(),
            $user->getAllPermissions()->pluck('name')->all(),
        );
        $this->assertFalse(Gate::forUser($user)->allows('projects.view'));

        $this->artisan('staffmate:admin-bootstrap')
            ->expectsOutputToContain('A Super Admin account already exists.')
            ->assertFailed();

        $this->assertSame($before + 1, User::query()->count());
    }

    public function test_command_rejects_a_weak_or_unconfirmed_password_without_creating_an_account(): void
    {
        $before = User::query()->count();
        $password = 'zzzz-secret-value';
        $email = 'weak-'.uniqid().'@example.com';

        $this->artisan('staffmate:admin-bootstrap')
            ->expectsQuestion('Name', 'Platform Owner')
            ->expectsQuestion('Email', $email)
            ->expectsQuestion('Password', $password)
            ->expectsQuestion('Confirm password', $password)
            ->doesntExpectOutputToContain($password)
            ->assertFailed();

        $this->assertSame($before, User::query()->count());
    }

    public function test_command_refuses_to_run_again_after_the_action_has_created_the_account(): void
    {
        $email = 'owner-'.uniqid().'@example.com';

        app(BootstrapSuperAdmin::class)->create(
            'Platform Owner',
            $email,
            'Staffmate-Owner-1!',
        );

        $this->artisan('staffmate:admin-bootstrap')
            ->expectsOutputToContain('A Super Admin account already exists.')
            ->assertFailed();

        $this->assertSame(1, User::query()->where('email', $email)->count());
    }
}
