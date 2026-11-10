<?php

namespace App\Modules\Identity\Logging;

use Monolog\LogRecord;

class RedactAuthenticationProcessor
{
    /**
     * @var list<string>
     */
    private array $keys = [
        'password',
        'password_confirmation',
        'current_password',
        'code',
        'recovery_code',
        'secret',
        'secretKey',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'token',
        'token_hash',
        'invitation_token',
        'recovery_codes',
    ];

    public function __invoke(LogRecord $record): LogRecord
    {
        return $record->with(context: $this->redact($record->context));
    }

    /**
     * @param  array<array-key, mixed>  $values
     * @return array<array-key, mixed>
     */
    private function redact(array $values): array
    {
        foreach ($values as $key => $value) {
            if (is_string($key) && in_array($key, $this->keys, true)) {
                $values[$key] = '[redacted]';

                continue;
            }

            if (is_array($value)) {
                $values[$key] = $this->redact($value);
            }
        }

        return $values;
    }
}
