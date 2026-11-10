<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Exceptions\IdentityAccessException;
use App\Modules\Identity\Services\AuditRecorder;
use App\Modules\Identity\Support\PermissionName;
use App\Modules\Identity\Support\RoleName;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class CreateCustomRole
{
    public function __construct(protected readonly AuditRecorder $audit) {}

    /**
     * @param  list<string>  $permissions
     */
    public function create(User $actor, string $name, array $permissions): Role
    {
        Gate::forUser($actor)->authorize('create', Role::class);

        $name = $this->name($name);
        $permissions = $this->permissions($permissions);

        return DB::transaction(function () use ($actor, $name, $permissions): Role {
            if ($this->taken($name)) {
                throw new IdentityAccessException('A role with that name already exists.');
            }

            $role = Role::query()->create([
                'name' => $name,
                'guard_name' => 'web',
                'is_system' => false,
            ]);
            $role->syncPermissions($permissions);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            $this->audit->record($actor, null, 'role.created', [
                'role' => $role->name,
                'permissions' => $permissions,
            ]);

            return $role->fresh() ?? $role;
        });
    }

    /**
     * @param  list<string>  $permissions
     * @return list<string>
     */
    protected function permissions(array $permissions): array
    {
        $allowed = PermissionName::values();
        $unique = array_values(array_unique($permissions));

        foreach ($unique as $permission) {
            if (! in_array($permission, $allowed, true)) {
                throw new IdentityAccessException('One or more permissions are outside the approved catalog.');
            }
        }

        return $unique;
    }

    protected function name(string $name): string
    {
        $name = trim($name);

        if (! preg_match('/^[A-Za-z0-9][A-Za-z0-9 \-]{1,59}$/', $name)) {
            throw new IdentityAccessException('Role names must be 2 to 60 letters, numbers, spaces, or hyphens.');
        }

        foreach (RoleName::cases() as $role) {
            if (strcasecmp($name, $role->value) === 0) {
                throw new IdentityAccessException('System roles cannot be created here.');
            }
        }

        return $name;
    }

    protected function taken(string $name, ?int $ignoreId = null): bool
    {
        return Role::query()
            ->where('guard_name', 'web')
            ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->when($ignoreId !== null, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists();
    }
}
