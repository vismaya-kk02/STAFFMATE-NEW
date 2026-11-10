<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use App\Modules\Identity\Actions\ChangeAccountStatus;
use App\Modules\Identity\Models\IdentityAuditEvent;
use App\Modules\Identity\Notifications\EmployeeInvited;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\PermissionName;
use App\Modules\Identity\Support\RoleName;
use App\Modules\Identity\Support\SessionKey;
use Database\Seeders\IdentityPermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use PragmaRX\Google2FA\Google2FA;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class IdentityManagementTest extends TestCase
{
    use DatabaseTransactions;

    private Google2FA $google2fa;

    private ?string $lastEnrollmentOtp = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->google2fa = new Google2FA();
        $this->lastEnrollmentOtp = null;
        $this->seed(IdentityPermissionSeeder::class);
        $this->asAdminPortal();
    }

    public function test_super_admin_invites_an_employee_who_must_enroll_before_crm_access(): void
    {
        Notification::fake();

        $admin = $this->confirmedUser('owner@example.com', RoleName::SuperAdmin);
        $coordinator = Role::findByName(RoleName::Coordinator->value, 'web');

        $response = $this->postJson('/api/v1/admin/employees', [
            'name' => 'New Coordinator',
            'email' => 'coordinator@example.com',
            'role_id' => $coordinator->getKey(),
            'status' => 'active',
            'password' => 'Should-Not-Stick-1!',
        ])->assertCreated();

        $response->assertJsonPath('status', 'invited');
        $response->assertJsonPath('roles.0', 'Coordinator');
        $this->assertStringNotContainsString('Should-Not-Stick-1!', $response->getContent());

        $employee = User::query()->where('email', 'coordinator@example.com')->firstOrFail();
        $token = $this->invitationToken($employee);
        $this->assertSame(hash('sha256', $token), DB::table('identity_invitations')->where('user_id', $employee->getKey())->value('token_hash'));
        $this->assertAuditOmits($token);

        $this->postJson('/logout')->assertNoContent();
        $this->asCrmPortal();

        $this->postJson('/login', [
            'email' => 'coordinator@example.com',
            'password' => 'Invitation-Password-1!',
        ])->assertUnprocessable();

        $this->postJson('/api/v1/invitations/accept', [
            'token' => $token,
            'password' => 'Invitation-Password-1!',
            'password_confirmation' => 'Invitation-Password-1!',
        ])->assertOk()->assertJsonPath('status', 'accepted');

        $this->postJson('/api/v1/invitations/accept', [
            'token' => $token,
            'password' => 'Invitation-Password-1!',
            'password_confirmation' => 'Invitation-Password-1!',
        ])->assertUnprocessable();

        $this->assertSame(AccountStatus::Active, $employee->fresh()->status);
        $this->assertNotNull($employee->fresh()->email_verified_at);
        $this->getJson('/api/v1/crm/home')->assertUnauthorized();

        $this->postJson('/login', [
            'email' => 'coordinator@example.com',
            'password' => 'Invitation-Password-1!',
        ])->assertOk()->assertJsonPath('status', 'authenticated');

        $this->getJson('/api/v1/crm/home')
            ->assertForbidden()
            ->assertJsonPath('reason', 'enrollment');
        $this->getJson('/api/v1/admin/employees')->assertForbidden();

        $this->enrollCurrentUser();

        // crm.access is not yet mapped onto stock roles; grant explicitly for this flow.
        $employee->fresh()->givePermissionTo(PermissionName::CrmAccess->value);

        $this->getJson('/api/v1/crm/home')
            ->assertOk()
            ->assertJsonPath('email', 'coordinator@example.com')
            ->assertJsonPath('navigation.0.key', 'home')
            ->assertJsonCount(1, 'navigation');

        app(ChangeAccountStatus::class)->change($admin, $employee->fresh(), AccountStatus::Suspended);

        $this->getJson('/api/v1/crm/home')->assertUnauthorized();
        $this->assertAuditOmits('Invitation-Password-1!');
    }

    public function test_super_admin_can_list_and_view_employees_while_coordinator_cannot(): void
    {
        $admin = $this->confirmedUser('employees-owner@example.com', RoleName::SuperAdmin);
        $staff = User::factory()->create([
            'name' => 'Listed Staff',
            'email' => 'listed-staff@example.com',
        ]);
        $staff->assignRole(RoleName::Accountant->value);

        $this->getJson('/api/v1/admin/employees?search=listed-staff@example.com')
            ->assertOk()
            ->assertJsonPath('data.0.email', 'listed-staff@example.com')
            ->assertJsonPath('data.0.roles.0', 'Accountant');

        $this->getJson('/api/v1/admin/employees/'.$staff->getKey())
            ->assertOk()
            ->assertJsonPath('email', 'listed-staff@example.com')
            ->assertJsonPath('mfa_enrolled', false);

        $this->getJson('/api/v1/admin/roles')
            ->assertOk()
            ->assertJsonStructure(['permissions', 'roles']);

        $this->postJson('/logout')->assertNoContent();
        $this->confirmedUser('employees-denied@example.com', RoleName::Coordinator);

        $this->getJson('/api/v1/admin/employees')->assertForbidden();
        $this->getJson('/api/v1/admin/employees/'.$admin->getKey())->assertForbidden();
        $this->getJson('/api/v1/admin/employees/'.$staff->getKey())->assertForbidden();
        $this->getJson('/api/v1/admin/roles')->assertForbidden();
    }

    public function test_custom_roles_cannot_escalate_and_management_cannot_assign_super_admin(): void
    {
        $admin = $this->confirmedUser('roles@example.com', RoleName::SuperAdmin);

        $this->postJson('/api/v1/admin/roles', [
            'name' => 'Super Admin',
            'permissions' => [PermissionName::ViewUsers->value],
        ])->assertStatus(422);

        $this->postJson('/api/v1/admin/roles', [
            'name' => 'Site Lead',
            'permissions' => ['projects.view'],
        ])->assertUnprocessable();

        $created = $this->postJson('/api/v1/admin/roles', [
            'name' => 'Site Lead',
            'permissions' => [PermissionName::ViewUsers->value],
        ])->assertCreated();

        $system = Role::findByName(RoleName::Management->value, 'web');
        $this->putJson('/api/v1/admin/roles/'.$system->getKey(), [
            'name' => 'Management',
            'permissions' => [PermissionName::ManageRoles->value],
        ])->assertForbidden();

        $this->putJson('/api/v1/admin/roles/'.$created->json('id'), [
            'name' => 'Site Lead',
            'permissions' => [PermissionName::ViewUsers->value, PermissionName::ManageRoles->value],
        ])->assertOk();

        $this->postJson('/logout')->assertNoContent();
        $manager = $this->confirmedUser('manager@example.com', RoleName::Management);

        $this->postJson('/api/v1/admin/roles', [
            'name' => 'Another Role',
            'permissions' => [PermissionName::ViewUsers->value],
        ])->assertForbidden();

        $target = User::factory()->create();
        $superAdmin = Role::findByName(RoleName::SuperAdmin->value, 'web');
        $this->putJson('/api/v1/admin/employees/'.$target->getKey().'/role', [
            'role_id' => $superAdmin->getKey(),
        ])->assertForbidden();
        $this->assertFalse($target->fresh()->hasRole(RoleName::SuperAdmin->value));

        $coordinator = Role::findByName(RoleName::Coordinator->value, 'web');
        $this->putJson('/api/v1/admin/employees/'.$target->getKey().'/role', [
            'role_id' => $coordinator->getKey(),
        ])->assertOk();
        $this->assertTrue($target->fresh()->hasRole(RoleName::Coordinator->value));

        $powerful = Role::query()->where('name', 'Site Lead')->firstOrFail();
        $this->putJson('/api/v1/admin/employees/'.$target->getKey().'/role', [
            'role_id' => $powerful->getKey(),
        ])->assertForbidden();

        $this->postJson('/logout')->assertNoContent();
        $coordinatorUser = $this->confirmedUser('coord@example.com', RoleName::Coordinator);
        $this->getJson('/api/v1/admin/home')->assertForbidden()->assertJsonPath('reason', 'permission');
        $this->getJson('/api/v1/admin/employees')->assertForbidden();
        $this->getJson('/api/v1/admin/employees/'.$admin->getKey())->assertForbidden();
        $this->assertNotSame($coordinatorUser->getKey(), $admin->getKey());
    }

    public function test_role_changes_revoke_the_previous_session_and_audit_omits_secrets(): void
    {
        $admin = $this->confirmedUser('audit@example.com', RoleName::SuperAdmin);
        $employee = User::factory()->create(['email' => 'worker@example.com']);
        $employee->assignRole(RoleName::Coordinator->value);
        $this->postJson('/logout')->assertNoContent();

        $this->asCrmPortal();
        $this->confirmedExisting($employee);
        $previous = (int) session(SessionKey::AuthRevision);
        $this->postJson('/logout')->assertNoContent();

        $this->asAdminPortal();
        $this->confirmedExisting($admin);
        $management = Role::findByName(RoleName::Management->value, 'web');
        $this->putJson('/api/v1/admin/employees/'.$employee->getKey().'/role', [
            'role_id' => $management->getKey(),
        ])->assertOk();

        $this->asCrmPortal()
            ->actingAs($employee->fresh())
            ->withSession([
                SessionKey::AuthRevision => $previous,
                SessionKey::MfaConfirmedAt => now()->getTimestamp(),
                SessionKey::PasswordHash => $employee->fresh()->getAuthPassword(),
                SessionKey::StartedAt => now()->getTimestamp(),
                SessionKey::Portal => 'app',
            ])
            ->getJson('/api/v1/crm/home')
            ->assertUnauthorized();

        $this->postJson('/login', [
            'email' => 'missing@example.com',
            'password' => 'Not-The-Real-Password-99!',
        ])->assertUnprocessable();

        $failed = IdentityAuditEvent::query()->where('event', 'login.failed')->latest('id')->first();
        $this->assertNotNull($failed);
        $this->assertStringNotContainsString('Not-The-Real-Password-99!', (string) json_encode($failed->properties));
        $this->assertDatabaseHas('identity_audit_events', [
            'event' => 'role.assigned',
            'subject_id' => $employee->getKey(),
        ]);
    }

    public function test_invitation_acceptance_is_rate_limited(): void
    {
        $this->asAppPortal();
        $this->withServerVariables([
            'HTTP_HOST' => 'app.localhost',
            'REMOTE_ADDR' => '203.0.113.24',
        ]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/invitations/accept', [
                'token' => 'missing-token-'.$attempt,
                'password' => 'Invitation-Password-1!',
                'password_confirmation' => 'Invitation-Password-1!',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/v1/invitations/accept', [
            'token' => 'missing-token-last',
            'password' => 'Invitation-Password-1!',
            'password_confirmation' => 'Invitation-Password-1!',
        ])->assertStatus(429);
    }

    private function confirmedUser(string $email, RoleName $role): User
    {
        $user = User::factory()->create(['email' => $email]);
        $user->assignRole($role->value);

        return $this->confirmedExisting($user);
    }

    private function confirmedExisting(User $user): User
    {
        $response = $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        if ($response->json('two_factor') === true) {
            $secret = decrypt((string) $user->fresh()->two_factor_secret);
            $this->postJson('/two-factor-challenge', [
                'code' => $this->challengeTotp($secret),
            ])->assertOk();

            return $user->fresh() ?? $user;
        }

        $this->enrollCurrentUser();

        return $user->fresh() ?? $user;
    }

    private function enrollCurrentUser(): void
    {
        $this->postJson('/user/two-factor-authentication')->assertSuccessful();
        $user = auth()->user();
        $this->assertInstanceOf(User::class, $user);
        $secret = decrypt((string) $user->fresh()->two_factor_secret);
        $this->lastEnrollmentOtp = $this->google2fa->getCurrentOtp($secret);

        $this->postJson('/user/confirmed-two-factor-authentication', [
            'code' => $this->lastEnrollmentOtp,
        ])->assertOk();
    }

    /**
     * Avoid Fortify's used-OTP cache after a recent enrollment confirmation.
     */
    private function challengeTotp(string $secret): string
    {
        $period = intdiv(time(), 30);

        foreach ([$period + 1, $period - 1, $period + 2, $period] as $counter) {
            $code = $this->google2fa->oathTotp($secret, $counter);

            if ($this->lastEnrollmentOtp === null || $code !== $this->lastEnrollmentOtp) {
                return $code;
            }
        }

        return $this->google2fa->oathTotp($secret, $period + 3);
    }

    private function invitationToken(User $employee): string
    {
        $token = '';

        Notification::assertSentTo($employee, EmployeeInvited::class, function (EmployeeInvited $notification) use (&$token): bool {
            $token = $notification->token;

            return $token !== '';
        });

        return $token;
    }

    private function assertAuditOmits(string $secret): void
    {
        $encoded = DB::table('identity_audit_events')->get()->map(fn (object $row): string => (string) $row->properties)->implode("\n");

        $this->assertStringNotContainsString($secret, $encoded);
    }
}
