<?php

namespace Tests\Feature\Modules\Identity;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class FortifyRouteTest extends TestCase
{
    public function test_session_authentication_routes_are_registered_without_public_registration(): void
    {
        $this->assertTrue(Route::has('login.store'));
        $this->assertTrue(Route::has('logout'));
        $this->assertTrue(Route::has('password.email'));
        $this->assertTrue(Route::has('password.update'));
        $this->assertTrue(Route::has('verification.verify'));
        $this->assertTrue(Route::has('verification.send'));
        $this->assertTrue(Route::has('user-profile-information.update'));
        $this->assertTrue(Route::has('user-password.update'));

        $this->assertFalse(Route::has('register'));
        $this->assertFalse(Route::has('login'));
        $this->assertFalse(Route::has('two-factor.login'));
        $this->assertTrue(Route::has('two-factor.login.store'));
        $this->assertTrue(Route::has('two-factor.enable'));
        $this->assertTrue(Route::has('two-factor.confirm'));
        $this->assertTrue(Route::has('two-factor.disable'));
        $this->assertFalse(Route::has('password.confirm'));
        $this->assertTrue(Route::has('password.confirm.store'));
        $this->assertFalse(Route::has('passkey.login'));

        // App-owned JSON notice for MustVerifyEmail redirects (not a Fortify HTML page).
        $notice = Route::getRoutes()->getByName('verification.notice');
        $this->assertNotNull($notice);
        $this->assertSame('email/verify', $notice->uri());
        $this->assertTrue($notice->methods() === ['GET', 'HEAD'] || in_array('GET', $notice->methods(), true));
        $this->assertContains('auth:web', $notice->gatherMiddleware());

        if (method_exists(\Laravel\Fortify\Features::class, 'passkeys')) {
            $this->assertFalse(\Laravel\Fortify\Features::enabled(\Laravel\Fortify\Features::passkeys()));
        }

        $profile = Route::getRoutes()->getByName('user-profile-information.update');
        $password = Route::getRoutes()->getByName('user-password.update');

        $this->assertContains('verified', $profile->middleware());
        $this->assertContains('verified', $password->middleware());
        $this->assertContains('web', Route::getRoutes()->getByName('login.store')->gatherMiddleware());

        $this->assertFalse(config('cors.supports_credentials'));
        $this->assertSame([], config('cors.allowed_origins'));
        $this->assertSame(30, config('session.lifetime'));
        $this->assertSame(720, config('session.absolute_lifetime'));
        $this->assertTrue(config('session.encrypt'));
        $this->assertNull(config('session.domain'));
        $this->assertSame('lax', config('session.same_site'));
        $this->assertTrue(config('session.http_only'));
        $this->assertFalse(config('session.secure'));
        $this->assertSame('array', config('session.driver'));

        $this->getJson('/api/v1/health')->assertOk()->assertExactJson(['status' => 'ok']);
        $this->get('/up')->assertOk();
    }

    public function test_public_registration_is_not_available(): void
    {
        $this->post('/register', [
            'name' => 'Outside User',
            'email' => 'outside@example.com',
            'password' => 'Staffmate-Owner-1!',
            'password_confirmation' => 'Staffmate-Owner-1!',
        ])->assertNotFound();
    }
}
