<?php

namespace App\Modules\Identity\Listeners;

use App\Models\User;
use App\Modules\Identity\Services\AuditRecorder;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;

class RecordAuthenticationAudit
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function login(Login $event): void
    {
        if (! $event->user instanceof User) {
            return;
        }

        $this->audit->record($event->user, $event->user, 'login.succeeded', [
            'guard' => $event->guard,
        ]);
    }

    public function failed(Failed $event): void
    {
        $email = $event->credentials['email'] ?? null;
        $actor = $event->user instanceof User ? $event->user : null;

        $this->audit->record($actor, $actor, 'login.failed', [
            'email' => is_string($email) ? $email : null,
        ]);
    }
}
