<?php

namespace App\Modules\Identity\Services;

use App\Models\User;
use App\Modules\Identity\Exceptions\IdentityAccessException;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\RoleName;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use LogicException;

class SuperAdminGuard
{
    /**
     * Shared PostgreSQL transaction-level advisory lock for Super Admin
     * bootstrap and every mutation that can remove an Active Super Admin.
     */
    public const ADVISORY_LOCK_KEY = 87021001;

    public function acquireTransactionLock(): void
    {
        if (DB::transactionLevel() < 1) {
            throw new LogicException(
                'Super Admin protection requires an open database transaction before acquiring the advisory lock.',
            );
        }

        DB::statement('SELECT pg_advisory_xact_lock('.self::ADVISORY_LOCK_KEY.')');
    }

    public function assertBootstrapAvailable(): void
    {
        if (! Schema::hasTable('roles')
            || ! Schema::hasTable('model_has_roles')
            || ! Schema::hasColumn('users', 'status')
            || ! Schema::hasColumn('users', 'two_factor_confirmed_at')) {
            throw new IdentityAccessException(
                'Run the identity migrations before bootstrapping the Super Admin account.',
            );
        }

        if ($this->superAdminExists()) {
            throw new IdentityAccessException('A Super Admin account already exists.');
        }
    }

    public function assertCanDeactivate(User $user): void
    {
        if (! $this->holdsSuperAdmin($user)) {
            return;
        }

        $this->acquireTransactionLock();
        $user->refresh();

        if ($this->isLastActive($user)) {
            throw new IdentityAccessException('The final Super Admin account cannot be removed.');
        }
    }

    public function assertCanRelinquishRole(User $user): void
    {
        if (! $this->holdsSuperAdmin($user)) {
            return;
        }

        $this->acquireTransactionLock();
        $user->refresh();

        if ($this->isLastRemaining($user) || $this->isLastActive($user)) {
            throw new IdentityAccessException('The final Super Admin account cannot be removed.');
        }
    }

    public function superAdminExists(): bool
    {
        if (! Schema::hasTable('roles') || ! Schema::hasTable('model_has_roles')) {
            return false;
        }

        return User::query()
            ->whereHas('roles', function ($query): void {
                $query->where('name', RoleName::SuperAdmin->value)
                    ->where('guard_name', 'web');
            })
            ->exists();
    }

    public function isLastActive(User $user): bool
    {
        if ($user->status !== AccountStatus::Active || ! $this->holdsSuperAdmin($user)) {
            return false;
        }

        return $this->countActive() === 1;
    }

    public function isLastRemaining(User $user): bool
    {
        if (! $this->holdsSuperAdmin($user)) {
            return false;
        }

        return $this->countHolders() === 1;
    }

    private function holdsSuperAdmin(User $user): bool
    {
        if (! $user->exists) {
            return false;
        }

        return $user->roles()
            ->where('name', RoleName::SuperAdmin->value)
            ->where('guard_name', 'web')
            ->exists();
    }

    private function countActive(): int
    {
        return User::query()
            ->where('status', AccountStatus::Active->value)
            ->whereHas('roles', function ($query): void {
                $query->where('name', RoleName::SuperAdmin->value)
                    ->where('guard_name', 'web');
            })
            ->count();
    }

    private function countHolders(): int
    {
        return User::query()
            ->whereHas('roles', function ($query): void {
                $query->where('name', RoleName::SuperAdmin->value)
                    ->where('guard_name', 'web');
            })
            ->count();
    }
}
