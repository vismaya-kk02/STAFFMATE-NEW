<?php

namespace App\Modules\Identity\Support;

enum Portal: string
{
    case Admin = 'admin';
    case Crm = 'crm';

    public static function fromHost(string $host): ?self
    {
        $host = strtolower($host);
        $adminHosts = array_map('strtolower', config('staffmate.admin_hosts', []));
        $crmHosts = array_map('strtolower', config('staffmate.crm_hosts', []));

        if (in_array($host, $adminHosts, true)) {
            return self::Admin;
        }

        if (in_array($host, $crmHosts, true)) {
            return self::Crm;
        }

        return null;
    }
}
