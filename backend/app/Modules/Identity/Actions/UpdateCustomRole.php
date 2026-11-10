<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Exceptions\IdentityAccessException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class UpdateCustomRole extends CreateCustomRole
{
    /**
     * @param  list<string>  $permissions
     */
    public function update(User $actor, Role $role, string $name, array $permissions): Role
    {
        Gate::forUser($actor)->authorize('update', $role);

        if ((bool) $role->getAttribute('is_system')) {
            throw new IdentityAccessException('System roles cannot be changed.');
        }

        $name = $this->name($name);
        $permissions = $this->permissions($permissions);

        return DB::transaction(function () use ($actor, $role, $name, $permissions): Role {
            if ($this->taken($name, (int) $role->getKey())) {
                throw new IdentityAccessException('A role with that name already exists.');
            }

            $role->forceFill([
                'name' => $name,
                'is_system' => false,
            ])->save();
            $role->syncPermissions($permissions);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            User::query()
                ->whereHas('roles', fn ($query) => $query->where('roles.id', $role->getKey()))
                ->orderBy('id')
                ->each(function (User $user): void {
                    $user->forceFill([
                        'auth_revision' => ((int) $user->auth_revision) + 1,
                    ])->save();
                });

            $this->audit->record($actor, null, 'role.updated', [
                'role' => $role->name,
                'permissions' => $permissions,
            ]);

            return $role->fresh() ?? $role;
        });
    }
}
