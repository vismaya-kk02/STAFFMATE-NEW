<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Identity\Actions\CreateCustomRole;
use App\Modules\Identity\Actions\UpdateCustomRole;
use App\Modules\Identity\Http\Requests\StoreRoleRequest;
use App\Modules\Identity\Http\Requests\UpdateRoleRequest;
use App\Modules\Identity\Support\PermissionName;
use App\Modules\Identity\Support\RoleName;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Role::class);

        $actor = $this->actor($request);

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role): array => $this->rolePayload($actor, $role))
            ->values();

        return response()->json([
            'permissions' => array_map(fn (PermissionName $permission): array => [
                'name' => $permission->value,
                'label' => $permission->label(),
            ], PermissionName::cases()),
            'roles' => $roles,
        ]);
    }

    public function store(StoreRoleRequest $request, CreateCustomRole $action): JsonResponse
    {
        $actor = $this->actor($request);
        /** @var list<string> $permissions */
        $permissions = $request->input('permissions', []);
        $role = $action->create($actor, $request->string('name')->toString(), $permissions);

        return response()->json($this->rolePayload($actor, $role->load('permissions:id,name')), 201);
    }

    public function update(UpdateRoleRequest $request, Role $role, UpdateCustomRole $action): JsonResponse
    {
        $actor = $this->actor($request);
        /** @var list<string> $permissions */
        $permissions = $request->input('permissions', []);
        $updated = $action->update($actor, $role, $request->string('name')->toString(), $permissions);

        return response()->json($this->rolePayload($actor, $updated->load('permissions:id,name')));
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function rolePayload(User $actor, Role $role): array
    {
        return [
            'id' => $role->getKey(),
            'name' => $role->name,
            'system' => (bool) $role->getAttribute('is_system') || in_array($role->name, RoleName::values(), true),
            'permissions' => $role->permissions->pluck('name')->values()->all(),
            'assignable' => $actor->can('assignRole', [$actor, $role]),
        ];
    }
}
