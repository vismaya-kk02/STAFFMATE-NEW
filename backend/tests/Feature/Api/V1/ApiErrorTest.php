<?php

namespace Tests\Feature\Api\V1;

use Tests\TestCase;

class ApiErrorTest extends TestCase
{
    public function test_unknown_api_routes_return_json_without_an_accept_header(): void
    {
        config(['app.debug' => false]);

        $response = $this->get('/api/v1/does-not-exist');

        $response->assertNotFound();
        $this->assertStringStartsWith(
            'application/json',
            (string) $response->headers->get('Content-Type'),
        );
        $response->assertJsonStructure([
            'message',
        ]);
    }

    public function test_api_errors_omit_internal_details_when_debug_is_disabled(): void
    {
        config(['app.debug' => false]);

        $payload = $this->get('/api/v1/does-not-exist')->json();

        $this->assertIsArray($payload);
        $this->assertArrayNotHasKey('exception', $payload);
        $this->assertArrayNotHasKey('file', $payload);
        $this->assertArrayNotHasKey('line', $payload);
        $this->assertArrayNotHasKey('trace', $payload);
    }

    public function test_framework_health_route_remains_available(): void
    {
        $this->get('/up')->assertOk();
    }
}
