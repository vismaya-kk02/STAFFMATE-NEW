# ADR 0003: Identity and access, part 1

- Status: Accepted
- Date: 2026-10-19

## Context

ADR 0002 established a cookie session and `GET /api/v1/me`. Staff still need login, password reset, email verification, and authorization. Workers do not get accounts. There is no public registration. Business records must stay closed until mandatory TOTP enrollment exists.

## Decision

- `laravel/fortify` `^1.34.1` provides login, logout, password reset, profile updates, password updates, and email verification on the `web` guard. `config/fortify.php` sets `views` to false and does not enable registration, passkeys, or two-factor routes.
- Login uses Fortify's callback only to reject non-active accounts. A suspended or invited account receives the same failure as a wrong password. Login is limited to 5 attempts per minute for the email and IP address.
- `spatie/laravel-permission` `^8.3` stores roles and permissions. Wildcard permissions are off. There is no `Gate::before` rule that grants every ability.
- The staff roles are Management, Administration, Accountant, and Coordinator. Super Admin is a separate platform role. Its permissions are only `identity.users.view`, `identity.users.invite`, `identity.users.update-status`, and `identity.users.assign-role`.
- `staffmate:admin-bootstrap` creates the first Super Admin from interactive prompts. It has no password option. It refuses to run once any Super Admin exists. The account is created with `two_factor_confirmed_at` null.
- `mfa.enrolled` is required for future business routes. It returns HTTP 403 while MFA is not confirmed or the account is not active. It is not applied to `GET /api/v1/me` or `GET /api/v1/health`.
- Assigning Super Admin requires the actor to already be a Super Admin. Suspending, demoting, or deleting the last usable Super Admin is rejected.

## Consequences

TOTP enrollment, recovery codes, and the post-password challenge are not implemented. A password session can still call `GET /api/v1/me`. It cannot pass `mfa.enrolled`. Composer must update `laravel/fortify` and `spatie/laravel-permission` before the application can boot. `composer.lock` is not edited by hand.

Automated tests that write rows use the PostgreSQL database `staffmate_testing` and roll the transaction back. They do not migrate or refresh the schema.
