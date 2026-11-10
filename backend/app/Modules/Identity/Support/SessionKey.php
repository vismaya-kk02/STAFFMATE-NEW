<?php

namespace App\Modules\Identity\Support;

final class SessionKey
{
    public const MfaConfirmedAt = 'staffmate.mfa_confirmed_at';

    public const StartedAt = 'staffmate.session_started_at';

    public const AuthRevision = 'staffmate.auth_revision';

    public const Portal = 'staffmate.portal';

    public const PasswordHash = 'staffmate.password_hash';
}
