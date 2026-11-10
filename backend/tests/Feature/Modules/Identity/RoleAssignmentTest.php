<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use App\Modules\Identity\Actions\AssignStaffRole;
use App\Modules\Identity\Actions\BootstrapSuperAdmin;
use App\Modules\Identity\Actions\ChangeAccountStatus;
use App\Modules\Identity\Exceptions\IdentityAccessException;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\PermissionName;
use App\Modules\Identity\Support\RoleName;
use Database\Seeders\IdentityPermissionSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleAssignmentTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(IdentityPermissionSeeder::class);
    }

    public function test_permission_seeder_is_idempotent_and_limits_the_super_admin_role(): void
    {
        $roles = Role::query()->count();
        $this->seed(IdentityPermissionSeeder::class);

        $this->assertSame($roles, Role::query()->count());

        foreach (RoleName::cases() as $role) {
            $this->assertNotNull(Role::findByName($role->value, 'web'));
        }

        $superAdmin = Role::findByName(RoleName::SuperAdmin->value, 'web');

        $this->assertEqualsCanonicalizing(
            PermissionName::values(),
            $superAdmin->permissions->pluck('name')->all(),
        );

        foreach ([RoleName::Administration, RoleName::Accountant, RoleName::Coordinator] as $role) {
            $record = Role::findByName($role->value, 'web');

            foreach (PermissionName::cases() as $permission) {
                $this->assertFalse($record->hasPermissionTo($permission->value));
            }
        }

        $management = Role::findByName(RoleName::Management->value, 'web');

        foreach (PermissionName::management() as $permission) {
            $this->assertTrue($management->hasPermissionTo($permission->value));
        }

        $this->assertFalse($management->hasPermissionTo(PermissionName::ManageRoles->value));
    }

    public function test_staff_cannot_assign_roles_or_promote_themselves_to_super_admin(): void
    {
        $coordinator = $this->userWithRole(RoleName::Coordinator);
        $target = User::factory()->create();

        try {
            app(AssignStaffRole::class)->assign($coordinator, $target, RoleName::Management);
            $this->fail('A coordinator assigned a role.');
        } catch (AuthorizationException) {
            $this->assertFalse($target->fresh()->roles()->exists());
        }

        $manager = $this->userWithRole(RoleName::Management);
        $manager->givePermissionTo(PermissionName::AssignRole->value);

        try {
            app(AssignStaffRole::class)->assign($manager, $manager, RoleName::SuperAdmin);
            $this->fail('A staff account granted itself Super Admin.');
        } catch (AuthorizationException) {
            $this->assertFalse($manager->fresh()->hasRole(RoleName::SuperAdmin->value));
        }

        app(AssignStaffRole::class)->assign($manager, $target, RoleName::Coordinator);

        $this->assertTrue($target->fresh()->hasRole(RoleName::Coordinator->value));
        $this->assertFalse($target->fresh()->hasRole(RoleName::SuperAdmin->value));
    }

    public function test_super_admin_cannot_be_bypassed_into_unrelated_authorization(): void
    {
        $admin = $this->superAdmin();

        $this->assertTrue($admin->can(PermissionName::ViewUsers->value));
        $this->assertFalse($admin->can('projects.view'));
    }

    public function test_the_final_super_admin_cannot_be_demoted_suspended_or_deleted(): void
    {
        $admin = $this->superAdmin();

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
        }
    }

    public function test_a_non_super_admin_can_be_deleted(): void
    {
        $staff = $this->userWithRole(RoleName::Coordinator);

        $staff->delete();

        $this->assertModelMissing($staff);
    }

    public function test_an_extra_super_admin_can_be_deleted_while_another_remains(): void
    {
        $first = $this->superAdmin();
        $second = User::factory()->create();

        app(AssignStaffRole::class)->assign($first, $second, RoleName::SuperAdmin);

        $second->delete();

        $this->assertModelMissing($second);
        $this->assertModelExists($first);
        $this->assertTrue($first->fresh()->hasRole(RoleName::SuperAdmin->value));
    }

    public function test_a_second_super_admin_can_be_assigned_and_then_the_other_can_be_suspended(): void
    {
        $first = $this->superAdmin();
        $second = User::factory()->create();

        app(AssignStaffRole::class)->assign($first, $second, RoleName::SuperAdmin);

        $this->assertTrue($second->fresh()->hasRole(RoleName::SuperAdmin->value));
        $this->assertEqualsCanonicalizing(
            PermissionName::values(),
            $second->fresh()->getAllPermissions()->pluck('name')->all(),
        );

        app(ChangeAccountStatus::class)->change($first, $first, AccountStatus::Suspended);

        $this->assertSame(AccountStatus::Suspended, $first->fresh()->status);

        try {
            app(ChangeAccountStatus::class)->change($second, $second, AccountStatus::Suspended);
            $this->fail('The remaining Super Admin was suspended.');
        } catch (IdentityAccessException) {
            $this->assertSame(AccountStatus::Active, $second->fresh()->status);
        }
    }

    private function superAdmin(): User
    {
        return app(BootstrapSuperAdmin::class)->create(
            'Platform Owner',
            'owner-'.uniqid().'@example.com',
            'Staffmate-Owner-1!',
        );
    }

    private function userWithRole(RoleName $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role->value);

        return $user;
    }
}
