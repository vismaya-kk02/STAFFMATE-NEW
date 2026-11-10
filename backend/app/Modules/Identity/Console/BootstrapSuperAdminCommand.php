<?php

namespace App\Modules\Identity\Console;

use App\Modules\Identity\Actions\BootstrapSuperAdmin;
use App\Modules\Identity\Exceptions\IdentityAccessException;
use App\Modules\Identity\Services\SuperAdminGuard;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class BootstrapSuperAdminCommand extends Command
{
    protected $signature = 'staffmate:admin-bootstrap';

    protected $description = 'Create the initial Super Admin account';

    public function handle(SuperAdminGuard $guard, BootstrapSuperAdmin $bootstrap): int
    {
        try {
            $guard->assertBootstrapAvailable();
        } catch (IdentityAccessException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $name = trim((string) $this->ask('Name'));
        $email = Str::lower(trim((string) $this->ask('Email')));
        $password = (string) $this->secret('Password');
        $confirmation = (string) $this->secret('Confirm password');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $confirmation,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $passwordHash = Hash::make($password);
        unset($validator, $password, $confirmation);

        try {
            $bootstrap->create($name, $email, $passwordHash);
        } catch (IdentityAccessException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Super Admin account created. Protected application access requires MFA enrollment.');

        return self::SUCCESS;
    }
}
