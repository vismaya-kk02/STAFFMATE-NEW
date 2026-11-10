# ADR 0001: Modular monolith

- Status: Accepted
- Date: 2026-10-17

## Context

Staffmate CRM is a Laravel 13 JSON API for web applications. M0.1 registers `/api/v1` from `bootstrap/app.php` and serves `GET /api/v1/health` from `routes/api.php`. Domain behavior for identity, audit, workers, and later areas still has to be organized without splitting the application into separate services.

## Decision

Use one modular monolith.

- Domain code lives in `app/Modules/{Domain}` with the namespace `App\Modules\{Domain}`.
- Create a module folder only when real functionality is implemented.
- The first domains are Identity and Audit. Add Workers and other domains when a feature needs them.
- Leave `App\Models\User` in its current location until an approved authentication change.
- Keep the `/api/v1` prefix in `bootstrap/app.php`.
- Load a future module `routes.php` with an explicit `require` in `routes/api.php`. Those files do not repeat the API prefix or the `api` middleware group.
- Do not use automatic route discovery.
- Controllers stay thin. Business operations live in actions, or in a service when several actions in the same module share a rule.
- Cross-module calls use the owning module's action or a small explicit contract. Events are for follow-up processing, not for authorization or for checks the operation must enforce itself.
- Do not add repositories, a standing set of interfaces, or a service provider per module.
- Changes to shared framework files require Technical Lead review. The file list is in `backend/docs/architecture/modules.md`.

## Consequences

New domain work has one place to go, and route registration stays visible in `routes/api.php`. Empty Identity and Audit trees are not part of this decision. The first working module, including authentication and auditing, waits for a later approved stage.

`config/auth.php` continues to use `App\Models\User`. Moving that model, adding guards, or registering policies is a separate reviewed change.

A module that repeats `api/v1` in its own routes will publish a duplicated prefix. A filesystem scan for route files would hide new endpoints from review.
