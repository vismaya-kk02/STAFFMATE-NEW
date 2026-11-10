<?php

namespace App\Modules\Identity\Policies;

use App\Models\User;
use App\Modules\Identity\Support\PermissionName;
use App\Modules\Identity\Support\RoleName;
use Spatie\Permission\Models\Role;

class UserPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->hasPermissionTo(PermissionName::ViewUsers->value);
    }

    public function view(User $actor, User $target): bool
    {
        return $actor->hasPermissionTo(PermissionName::ViewUsers->value);
    }

    public function invite(User $actor): bool
    {
        return $actor->hasPermissionTo(PermissionName::InviteUsers->value);
    }

    public function updateStatus(User $actor, User $target): bool
    {
        return $actor->hasPermissionTo(PermissionName::UpdateStatus->value);
    }

    public function assignRole(User $actor, User $target, Role $role): bool
    {
        if ($role->guard_name !== 'web' || ! $actor->hasPermissionTo(PermissionName::AssignRole->value)) {
            return false;
        }

        if ($role->name === RoleName::SuperAdmin->value) {
            return $actor->hasRole(RoleName::SuperAdmin->value);
        }

        if ($actor->hasRole(RoleName::SuperAdmin->value)) {
            return true;
        }

        foreach ($role->permissions as $permission) {
            if (! $actor->hasPermissionTo($permission->name)) {
                return false;
            }
        }

        return true;
    }
}
