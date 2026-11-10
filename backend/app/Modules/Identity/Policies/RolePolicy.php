<?php

namespace App\Modules\Identity\Policies;

use App\Models\User;
use App\Modules\Identity\Support\PermissionName;
use Spatie\Permission\Models\Role;

class RolePolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->hasPermissionTo(PermissionName::ViewRoles->value);
    }

    public function create(User $actor): bool
    {
        return $actor->hasPermissionTo(PermissionName::ManageRoles->value);
    }

    public function update(User $actor, Role $role): bool
    {
        return $actor->hasPermissionTo(PermissionName::ManageRoles->value)
            && ! $this->system($role);
    }

    private function system(Role $role): bool
    {
        return (bool) $role->getAttribute('is_system');
    }
}
