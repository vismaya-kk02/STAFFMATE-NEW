<?php

namespace Tests\Feature\Modules\Identity;

use App\Models\User;
use Tests\TestCase;

class CurrentUserTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->asAdminPortal();
    }

    public function test_guests_receive_json_unauthorized_without_an_accept_header(): void
    {
        $response = $this->get('/api/v1/me');

        $response->assertUnauthorized();
        $this->assertStringStartsWith(
            'application/json',
            (string) $response->headers->get('Content-Type'),
        );
        $response->assertJson([
            'message' => 'Unauthenticated.',
        ]);
    }

    public function test_authorization_header_is_rejected(): void
    {
        $user = $this->sessionUser();

        $response = $this->actingAs($user, 'web')
            ->withHeader('Authorization', 'Bearer example-token')
            ->getJson('/api/v1/me');

        $response->assertUnauthorized();
        $response->assertExactJson([
            'message' => 'Unauthenticated.',
        ]);
    }

    public function test_authenticated_session_returns_only_id_name_and_email(): void
    {
        $user = $this->sessionUser();

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/me');

        $response->assertOk();
        $response->assertExactJson([
            'id' => 15,
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
        ]);
    }

    public function test_public_health_routes_remain_available(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertExactJson([
                'status' => 'ok',
            ]);

        $this->get('/up')->assertOk();
    }

    private function sessionUser(): User
    {
        return User::factory()->make([
            'id' => 15,
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
        ]);
    }
}
