<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Exceptions\IdentityAccessException;
use App\Modules\Identity\Services\AuditRecorder;
use App\Modules\Identity\Services\SuperAdminGuard;
use App\Modules\Identity\Support\AccountStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ChangeAccountStatus
{
    public function __construct(
        private readonly SuperAdminGuard $guard,
        private readonly AuditRecorder $audit,
    ) {}

    public function change(User $actor, User $target, AccountStatus $status): void
    {
        Gate::forUser($actor)->authorize('updateStatus', $target);

        DB::transaction(function () use ($actor, $target, $status): void {
            if ($status === AccountStatus::Active && ! $target->hasVerifiedEmail()) {
                throw new IdentityAccessException('This account cannot be activated before the invitation is accepted.');
            }

            if ($status !== AccountStatus::Active) {
                $this->guard->assertCanDeactivate($target);
            }

            $from = $target->status;

            $target->forceFill([
                'status' => $status,
            ])->save();

            $this->audit->record($actor, $target, 'account.status_changed', [
                'from' => $from instanceof AccountStatus ? $from->value : (string) $from,
                'to' => $status->value,
            ]);
        });
    }
}
