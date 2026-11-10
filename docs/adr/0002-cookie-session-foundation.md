# ADR 0002: Cookie session foundation

- Status: Accepted
- Date: 2026-10-19

## Context

M0.1 serves a public `GET /api/v1/health`. Admin and CRM will share this Laravel API. Staff authentication must be a first-party session cookie. Workers do not receive login accounts, and there is no public registration.

## Decision

M0.3A adds the Identity module and one protected probe, `GET /api/v1/me`.

- `laravel/sanctum` `^4.3` is the dependency. Its stateful middleware runs on the `api` group so a first-party request can use the existing `web` session guard.
- The route uses `auth:web`. It does not use `auth:sanctum`.
- Any `Authorization` header is rejected with HTTP 401 before the guard runs. Personal access tokens are not issued, and the token migration is not published.
- Sanctum's stateful host list is the application host plus `localhost`, `127.0.0.1`, and `::1`. Vite ports are not added. A different port is a different origin.
- The JSON body is only `id`, `name`, and `email`.
- `GET /api/v1/health` and `GET /up` stay public.
- `App\Models\User` stays in its current location.

## Not in this stage

These remain later, reviewed stages:

- Fortify login and logout, with registration disabled.
- Mandatory MFA before any business module route, and before login is available to users. `/api/v1/me` is only a session probe until that gate exists.
- Spatie Permission and the four staff roles.
- Redis session storage, a 30-minute idle timeout, and a 12-hour absolute lifetime.
- A dedicated PostgreSQL `testing` database. Current feature tests build an in-memory user and do not migrate or reset tables.

## Consequences

`composer install` is required before the application can boot the Sanctum middleware. `composer.lock` is updated by that install, not by hand.

Until login exists, a browser cannot obtain a session. Tests may attach a user to the `web` guard without a database row. A later login stage must prove the cookie and CSRF flow without that test helper, and must not ship before the MFA gate.
