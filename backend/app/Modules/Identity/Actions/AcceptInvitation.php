<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Models\IdentityInvitation;
use App\Modules\Identity\Services\AuditRecorder;
use App\Modules\Identity\Support\AccountStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AcceptInvitation
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function accept(string $token, string $password): void
    {
        DB::transaction(function () use ($token, $password): void {
            $invitation = IdentityInvitation::query()
                ->where('token_hash', hash('sha256', $token))
                ->lockForUpdate()
                ->first();

            if (! $invitation instanceof IdentityInvitation || ! $invitation->isOpen()) {
                throw ValidationException::withMessages([
                    'token' => 'This invitation is invalid or has expired.',
                ]);
            }

            $user = User::query()->whereKey($invitation->user_id)->lockForUpdate()->first();

            if (! $user instanceof User || $user->status !== AccountStatus::Invited) {
                throw ValidationException::withMessages([
                    'token' => 'This invitation is invalid or has expired.',
                ]);
            }

            $user->forceFill([
                'password' => $password,
                'email_verified_at' => now(),
                'status' => AccountStatus::Active,
            ])->save();

            $invitation->forceFill([
                'accepted_at' => now(),
            ])->save();

            $this->audit->record($user, $user, 'invitation.accepted', []);
        });
    }
}
