<?php

namespace App\Modules\Identity\Support;

enum RoleName: string
{
    case Management = 'Management';
    case Administration = 'Administration';
    case Accountant = 'Accountant';
    case Coordinator = 'Coordinator';
    case SuperAdmin = 'Super Admin';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $role): string => $role->value, self::cases());
    }
}
