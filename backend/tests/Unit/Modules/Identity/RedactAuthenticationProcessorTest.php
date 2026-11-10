<?php

namespace Tests\Unit\Modules\Identity;

use App\Modules\Identity\Logging\RedactAuthenticationProcessor;
use DateTimeImmutable;
use Monolog\Level;
use Monolog\LogRecord;
use PHPUnit\Framework\TestCase;

class RedactAuthenticationProcessorTest extends TestCase
{
    public function test_passwords_tokens_and_mfa_values_are_removed_from_log_context(): void
    {
        $processor = new RedactAuthenticationProcessor();
        $record = new LogRecord(
            datetime: new DateTimeImmutable(),
            channel: 'testing',
            level: Level::Info,
            message: 'authentication',
            context: [
                'password' => 'Secret-Password-Value',
                'token' => 'Invite-Token-Value',
                'recovery_code' => 'recovery-value',
                'email' => 'ada@example.com',
            ],
        );

        $processed = $processor($record);

        $this->assertSame('[redacted]', $processed->context['password']);
        $this->assertSame('[redacted]', $processed->context['token']);
        $this->assertSame('[redacted]', $processed->context['recovery_code']);
        $this->assertSame('ada@example.com', $processed->context['email']);
    }
}
