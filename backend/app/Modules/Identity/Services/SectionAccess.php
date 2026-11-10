<?php

namespace App\Modules\Identity\Services;

use App\Models\User;
use App\Modules\Identity\Support\PermissionName;
use Spatie\Permission\Models\Permission;

class SectionAccess
{
    public function allowsAdmin(User $user): bool
    {
        $names = [
            PermissionName::ViewUsers->value,
            PermissionName::ViewRoles->value,
        ];

        $known = Permission::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $names)
            ->pluck('name')
            ->all();

        return $known !== [] && $user->hasAnyPermission($known);
    }

    public function allowsCrm(User $user): bool
    {
        $permission = Permission::query()
            ->where('guard_name', 'web')
            ->where('name', PermissionName::CrmAccess->value)
            ->first();

        if (! $permission instanceof Permission) {
            return false;
        }

        return $user->hasPermissionTo($permission);
    }

    /**
     * @return array{admin: bool, crm: bool}
     */
    public function sections(User $user): array
    {
        return [
            'admin' => $this->allowsAdmin($user),
            'crm' => $this->allowsCrm($user),
        ];
    }
}
