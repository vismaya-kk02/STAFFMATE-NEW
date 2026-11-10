<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Identity\Actions\AssignStaffRole;
use App\Modules\Identity\Actions\ChangeAccountStatus;
use App\Modules\Identity\Actions\InviteEmployee;
use App\Modules\Identity\Http\Requests\StoreEmployeeRequest;
use App\Modules\Identity\Http\Requests\UpdateEmployeeRoleRequest;
use App\Modules\Identity\Http\Requests\UpdateEmployeeStatusRequest;
use App\Modules\Identity\Models\IdentityInvitation;
use App\Modules\Identity\Support\AccountStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Role;

class EmployeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', User::class);

        $search = mb_substr(trim($request->string('search')->toString()), 0, 100);
        $like = '%'.addcslashes($search, '%_\\').'%';

        $employees = User::query()
            ->with('roles:id,name')
            ->when($search !== '', function (Builder $query) use ($like): void {
                $query->where(function (Builder $query) use ($like): void {
                    $query->where('name', 'ilike', $like)
                        ->orWhere('email', 'ilike', $like);
                });
            })
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString();

        return response()->json([
            'data' => collect($employees->items())->map(fn (User $user): array => $this->summary($user))->values(),
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total(),
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        Gate::authorize('view', $user);
        $user->load('roles:id,name');

        return response()->json($this->detail($user));
    }

    public function store(StoreEmployeeRequest $request, InviteEmployee $action): JsonResponse
    {
        $actor = $this->actor($request);
        $role = $this->role((int) $request->integer('role_id'));
        $employee = $action->invite(
            $actor,
            $request->string('name')->toString(),
            $request->string('email')->toString(),
            $role,
        );

        return response()->json($this->detail($employee->load('roles:id,name')), 201);
    }

    public function updateStatus(UpdateEmployeeStatusRequest $request, User $user, ChangeAccountStatus $action): JsonResponse
    {
        $status = AccountStatus::from($request->string('status')->toString());
        $action->change($this->actor($request), $user, $status);

        return response()->json($this->detail($user->fresh()?->load('roles:id,name') ?? $user));
    }

    public function updateRole(UpdateEmployeeRoleRequest $request, User $user, AssignStaffRole $action): JsonResponse
    {
        $role = $this->role((int) $request->integer('role_id'));
        $action->assignExisting($this->actor($request), $user, $role);

        return response()->json($this->detail($user->fresh()?->load('roles:id,name') ?? $user));
    }

    public function resendInvitation(Request $request, User $user, InviteEmployee $action): JsonResponse
    {
        $action->resend($this->actor($request), $user);

        return response()->json($this->detail($user->fresh()?->load('roles:id,name') ?? $user));
    }

    private function actor(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        return $user;
    }

    private function role(int $id): Role
    {
        $role = Role::query()->whereKey($id)->where('guard_name', 'web')->first();

        if (! $role instanceof Role) {
            abort(422, 'That role is not available.');
        }

        return $role;
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(User $user): array
    {
        return [
            'id' => $user->getKey(),
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status instanceof AccountStatus ? $user->status->value : (string) $user->status,
            'roles' => $user->roles->pluck('name')->values()->all(),
            'email_verified' => $user->hasVerifiedEmail(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(User $user): array
    {
        $invitation = IdentityInvitation::query()
            ->where('user_id', $user->getKey())
            ->whereNull('accepted_at')
            ->latest('id')
            ->first();

        return [
            ...$this->summary($user),
            'mfa_enrolled' => $user->two_factor_confirmed_at !== null,
            'invitation_pending' => $invitation instanceof IdentityInvitation && $invitation->isOpen(),
            'invitation_expires_at' => $invitation instanceof IdentityInvitation
                ? $invitation->expires_at->toIso8601String()
                : null,
        ];
    }
}
