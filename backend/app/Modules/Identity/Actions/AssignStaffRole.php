<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Services\AuditRecorder;
use App\Modules\Identity\Services\SuperAdminGuard;
use App\Modules\Identity\Support\RoleName;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Role;

class AssignStaffRole
{
    public function __construct(
        private readonly SuperAdminGuard $guard,
        private readonly AuditRecorder $audit,
    ) {}

    public function assign(User $actor, User $target, RoleName $role): void
    {
        $this->assignExisting($actor, $target, $this->find($role->value));
    }

    public function assignExisting(User $actor, User $target, Role $role): void
    {
        Gate::forUser($actor)->authorize('assignRole', [$target, $role]);

        DB::transaction(function () use ($actor, $target, $role): void {
            if ($target->hasRole(RoleName::SuperAdmin->value) && $role->name !== RoleName::SuperAdmin->value) {
                $this->guard->assertCanRelinquishRole($target);
            }

            $target->syncRoles([$role->name]);
            $target->forceFill([
                'auth_revision' => ((int) $target->auth_revision) + 1,
            ])->save();

            $this->audit->record($actor, $target, 'role.assigned', [
                'role' => $role->name,
            ]);
        });
    }

    private function find(string $name): Role
    {
        $role = Role::query()->where('name', $name)->where('guard_name', 'web')->first();

        if (! $role instanceof Role) {
            abort(422, 'That role is not available.');
        }

        return $role;
    }
}
