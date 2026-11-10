<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Models\IdentityInvitation;
use App\Modules\Identity\Notifications\EmployeeInvited;
use App\Modules\Identity\Services\AuditRecorder;
use App\Modules\Identity\Support\AccountStatus;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class InviteEmployee
{
    public function __construct(
        private readonly AssignStaffRole $roles,
        private readonly AuditRecorder $audit,
    ) {}

    public function invite(User $actor, string $name, string $email, Role $role): User
    {
        Gate::forUser($actor)->authorize('invite', User::class);

        $email = Str::lower(trim($email));

        return DB::transaction(function () use ($actor, $name, $email, $role): User {
            try {
                $user = User::query()->create([
                    'name' => trim($name),
                    'email' => $email,
                    'password' => Str::random(64),
                ]);
            } catch (UniqueConstraintViolationException) {
                throw ValidationException::withMessages([
                    'email' => 'That email is already in use.',
                ]);
            }

            $this->roles->assignExisting($actor, $user, $role);
            $token = $this->replaceInvitation($user);

            $this->audit->record($actor, $user, 'invitation.created', [
                'email' => $email,
                'role' => $role->name,
            ]);

            $user->notify(new EmployeeInvited($token));

            return $user->fresh() ?? $user;
        });
    }

    public function resend(User $actor, User $target): void
    {
        Gate::forUser($actor)->authorize('invite', User::class);

        if ($target->status !== AccountStatus::Invited) {
            abort(422, 'Only an invited employee can receive another invitation.');
        }

        DB::transaction(function () use ($actor, $target): void {
            $token = $this->replaceInvitation($target);

            $this->audit->record($actor, $target, 'invitation.resent', [
                'email' => $target->email,
            ]);

            $target->notify(new EmployeeInvited($token));
        });
    }

    private function replaceInvitation(User $user): string
    {
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');

        IdentityInvitation::query()->where('user_id', $user->getKey())->whereNull('accepted_at')->delete();

        $invitation = new IdentityInvitation;
        $invitation->forceFill([
            'user_id' => $user->getKey(),
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addHours((int) config('staffmate.invitation_ttl_hours', 72)),
        ])->save();

        return $token;
    }
}
