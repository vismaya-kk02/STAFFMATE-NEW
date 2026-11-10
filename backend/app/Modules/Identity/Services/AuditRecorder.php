<?php

namespace App\Modules\Identity\Services;

use App\Models\User;
use App\Modules\Identity\Models\IdentityAuditEvent;
use Illuminate\Http\Request;

class AuditRecorder
{
    /**
     * @var list<string>
     */
    private array $secretKeys = [
        'password',
        'password_confirmation',
        'current_password',
        'code',
        'recovery_code',
        'recovery_codes',
        'secret',
        'secretKey',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'token',
        'token_hash',
        'invitation_token',
    ];

    /**
     * @param  array<string, mixed>  $properties
     */
    public function record(?User $actor, ?User $subject, string $event, array $properties = []): void
    {
        $request = request();

        IdentityAuditEvent::query()->forceCreate([
            'actor_id' => $actor?->getKey(),
            'subject_id' => $subject?->getKey(),
            'event' => $event,
            'properties' => $this->strip($properties),
            'ip_address' => $request instanceof Request ? $request->ip() : null,
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>
     */
    private function strip(array $properties): array
    {
        foreach ($properties as $key => $value) {
            if (in_array($key, $this->secretKeys, true)) {
                unset($properties[$key]);

                continue;
            }

            if (is_array($value)) {
                $properties[$key] = $this->strip($value);
            }
        }

        return $properties;
    }
}
