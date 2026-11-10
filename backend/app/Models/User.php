<?php

namespace App\Models;

use App\Modules\Identity\Services\SuperAdminGuard;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\RoleName;
use App\Modules\Identity\Support\SessionKey;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;
    use HasRoles {
        syncRoles as private spatieSyncRoles;
        removeRole as private spatieRemoveRole;
    }
    use Notifiable;
    use TwoFactorAuthenticatable;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'invited',
        'auth_revision' => 0,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => AccountStatus::class,
            'two_factor_confirmed_at' => 'datetime',
            'auth_revision' => 'integer',
        ];
    }

    /**
     * Register the Super Admin delete guard before trait boot listeners.
     * Spatie HasRoles detaches roles on deleting; that must not run first.
     */
    protected static function boot(): void
    {
        static::deleting(function (User $user): void {
            app(SuperAdminGuard::class)->assertCanRelinquishRole($user);
        });

        parent::boot();
    }

    protected static function booted(): void
    {
        static::updating(function (User $user): void {
            $sensitive = [
                'password',
                'email',
                'status',
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
            ];

            if (! $user->isDirty($sensitive) || $user->isDirty('auth_revision')) {
                return;
            }

            $user->auth_revision = ((int) $user->auth_revision) + 1;
        });

        static::updated(function (User $user): void {
            if (! $user->wasChanged('auth_revision')) {
                return;
            }

            $request = request();

            if (! $request instanceof Request || ! $request->hasSession()) {
                return;
            }

            $current = $request->user();

            if (! $current instanceof User || $current->getKey() !== $user->getKey()) {
                return;
            }

            if ($user->status !== AccountStatus::Active) {
                $request->session()->forget(SessionKey::MfaConfirmedAt);

                return;
            }

            $request->session()->put(SessionKey::AuthRevision, (int) $user->auth_revision);
            $request->session()->put(SessionKey::PasswordHash, $user->getAuthPassword());

            if ($user->two_factor_confirmed_at === null) {
                $request->session()->forget(SessionKey::MfaConfirmedAt);
            }
        });
    }

    /**
     * Keep Super Admin delete checks inside one transaction so the advisory
     * lock acquired during the deleting event is held until commit/rollback.
     */
    public function delete()
    {
        if (! $this->exists) {
            return true;
        }

        return DB::transaction(fn () => parent::delete());
    }

    public function syncRoles(...$roles)
    {
        if (! $this->dropsSuperAdminRole($roles)) {
            return $this->spatieSyncRoles(...$roles);
        }

        return DB::transaction(function () use ($roles) {
            app(SuperAdminGuard::class)->assertCanRelinquishRole($this);

            return $this->spatieSyncRoles(...$roles);
        });
    }

    public function removeRole($role)
    {
        if ($this->roleName($role) !== RoleName::SuperAdmin->value) {
            return $this->spatieRemoveRole($role);
        }

        return DB::transaction(function () use ($role) {
            app(SuperAdminGuard::class)->assertCanRelinquishRole($this);

            return $this->spatieRemoveRole($role);
        });
    }

    /**
     * @param  array<int, mixed>  $roles
     */
    private function dropsSuperAdminRole(array $roles): bool
    {
        if (! $this->exists || ! $this->roles()
            ->where('name', RoleName::SuperAdmin->value)
            ->where('guard_name', 'web')
            ->exists()) {
            return false;
        }

        foreach ($roles as $role) {
            foreach (is_array($role) ? $role : [$role] as $candidate) {
                if ($this->roleName($candidate) === RoleName::SuperAdmin->value) {
                    return false;
                }
            }
        }

        return true;
    }

    private function roleName(mixed $role): ?string
    {
        if ($role instanceof RoleName) {
            return $role->value;
        }

        if ($role instanceof Role) {
            return $role->name;
        }

        if (is_string($role)) {
            return $role;
        }

        return null;
    }
}
