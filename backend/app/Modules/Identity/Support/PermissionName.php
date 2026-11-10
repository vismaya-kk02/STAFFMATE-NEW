<?php

namespace App\Modules\Identity\Support;

enum PermissionName: string
{
    case ViewUsers = 'identity.users.view';
    case InviteUsers = 'identity.users.invite';
    case UpdateStatus = 'identity.users.update-status';
    case AssignRole = 'identity.users.assign-role';
    case ViewRoles = 'identity.roles.view';
    case ManageRoles = 'identity.roles.manage';
    case CrmAccess = 'crm.access';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $permission): string => $permission->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::ViewUsers => 'View employees',
            self::InviteUsers => 'Invite employees',
            self::UpdateStatus => 'Change employee status',
            self::AssignRole => 'Assign employee roles',
            self::ViewRoles => 'View roles',
            self::ManageRoles => 'Manage custom roles',
            self::CrmAccess => 'Access CRM',
        };
    }

    /**
     * Permissions granted to Management. Super Admin receives the full catalog.
     * crm.access is intentionally omitted until role mapping is approved.
     *
     * @return list<self>
     */
    public static function management(): array
    {
        return [
            self::ViewUsers,
            self::InviteUsers,
            self::UpdateStatus,
            self::AssignRole,
            self::ViewRoles,
        ];
    }
}
