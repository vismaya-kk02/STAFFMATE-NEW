<?php

namespace App\Modules\Identity\Actions;

use App\Models\User;
use App\Modules\Identity\Services\SuperAdminGuard;
use App\Modules\Identity\Support\AccountStatus;
use App\Modules\Identity\Support\RoleName;
use Database\Seeders\IdentityPermissionSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BootstrapSuperAdmin
{
    public function __construct(private readonly SuperAdminGuard $guard) {}

    public function create(string $name, string $email, string $password): User
    {
        $email = Str::lower(trim($email));

        return DB::transaction(function () use ($name, $email, $password): User {
            $this->guard->acquireTransactionLock();

            $this->guard->assertBootstrapAvailable();

            (new IdentityPermissionSeeder)->run();

            $this->guard->assertBootstrapAvailable();

            $user = new User;
            $user->forceFill([
                'name' => trim($name),
                'email' => $email,
                'password' => $password,
                'email_verified_at' => now(),
                'status' => AccountStatus::Active,
            ])->save();

            $user->assignRole(RoleName::SuperAdmin->value);

            return $user;
        });
    }
}
