<?php

namespace App\Modules\Identity\Support;

enum AccountStatus: string
{
    case Invited = 'invited';
    case Active = 'active';
    case Suspended = 'suspended';
}
