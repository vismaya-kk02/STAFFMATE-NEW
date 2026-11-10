<?php

namespace App\Modules\Identity\Console;

use App\Models\User;
use App\Modules\Identity\Support\RoleName;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ResetSuperAdminMfaCommand extends Command
{
    protected $signature = 'staffmate:mfa-reset';

    protected $description = 'Clear Super Admin authenticator enrollment so the next sign-in must enroll again';

    public function handle(): int
    {
        $email = Str::lower(trim((string) $this->ask('Email')));
        $user = User::query()->where('email', $email)->first();

        if (! $user instanceof User || ! $user->hasRole(RoleName::SuperAdmin->value)) {
            $this->error('No Super Admin account matches that email.');

            return self::FAILURE;
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        $this->info('MFA enrollment was cleared. Protected access requires enrollment again.');

        return self::SUCCESS;
    }
}
