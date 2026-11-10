<?php

namespace App\Modules\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmployeeInvited extends Notification
{
    public function __construct(public readonly string $token) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $base = rtrim((string) config('staffmate.app_url'), '/');
        $url = $base.'/accept-invitation/'.$this->token;

        return (new MailMessage)
            ->subject('You are invited to Staffmate')
            ->line('A Staffmate administrator invited you to create your employee account.')
            ->action('Accept invitation', $url)
            ->line('This link expires and can be used once. After you choose a password, sign in and enroll an authenticator before the CRM opens.');
    }
}
