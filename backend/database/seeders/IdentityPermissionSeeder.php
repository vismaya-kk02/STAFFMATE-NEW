<?php

namespace Database\Seeders;

use App\Modules\Identity\Support\PermissionName;
use App\Modules\Identity\Support\RoleName;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class IdentityPermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (RoleName::cases() as $role) {
            Role::findOrCreate($role->value, 'web');
        }

        Role::query()
            ->where('guard_name', 'web')
            ->whereIn('name', RoleName::values())
            ->update(['is_system' => true]);

        $permissions = [];

        foreach (PermissionName::cases() as $permission) {
            $permissions[] = Permission::findOrCreate($permission->value, 'web');
        }

        Role::findByName(RoleName::SuperAdmin->value, 'web')->syncPermissions($permissions);

        $management = array_map(
            fn (PermissionName $permission): string => $permission->value,
            PermissionName::management(),
        );

        Role::findByName(RoleName::Management->value, 'web')->syncPermissions($management);

        foreach ([RoleName::Administration, RoleName::Accountant, RoleName::Coordinator] as $role) {
            Role::findByName($role->value, 'web')->syncPermissions([]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
