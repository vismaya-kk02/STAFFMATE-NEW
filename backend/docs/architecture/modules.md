# Module organization

Staffmate CRM is one Laravel 13 application. Domain code lives under `app/Modules/{Domain}` with the namespace `App\Modules\{Domain}`.

Create a module folder only when that domain has real functionality to implement. Do not add empty folders, service providers, repositories, or an interface for every class.

`App\` already maps to `app/`. Module classes do not need a Composer autoload change.

## Domains

Identity and Audit are the first domains. Identity owns session authentication, mandatory TOTP, invitations, staff roles, and the audit records for those changes. `routes/api.php` requires `app/Modules/Identity/routes.php`, which publishes the current-user probe, identity state, Admin home, CRM home, employee management, and role management. Worker, project, and document routes stay unregistered. A protected business route needs `auth:web` and `mfa.enrolled`. Admin APIs require Identity permissions (for example `identity.users.view`). CRM home requires `crm.access` (created by the Identity permission seeder; stock non–Super Admin role mapping for `crm.access` still needs an approved decision). The unified React SPA is same-origin; section navigation is not authorization. The server resolves a role id and authorizes it. A client-supplied role name does not grant permissions. `User` refuses to delete or demote the last Super Admin.

`App\Models\User` stays where it is until an approved authentication change moves it. `config/auth.php` still points at that class.

`GET /api/v1/health` stays in `routes/api.php`. It is application infrastructure, not a domain module.

## What belongs in a module

Add a directory only when the first file in it is part of the change:

```text
app/Modules/{Domain}/
  routes.php
  Http/Controllers/
  Http/Requests/
  Actions/
  Models/
  Policies/
  Services/
  Events/
```

| Piece | Role |
|---|---|
| `Http/Controllers/` | Thin HTTP entry points. Read the request, call one action or service, return a JSON response. |
| `Http/Requests/` | Input validation for that module's endpoints. |
| `Actions/` | One business operation per class, including transaction boundaries. |
| `Services/` | A rule shared by more than one action in the same module. Skip this folder when an action is enough. |
| `Models/` | Eloquent models owned by this module. |
| `Policies/` | Authorization for those models. Register the policy only in an approved change to `AppServiceProvider`. |
| `Events/` | Follow-up work for another module. Do not use an event for authorization or for a check the caller must enforce before it commits. |
| `routes.php` | Paths inside `/api/v1`, added with the module's first API route. |

Controllers stay small. Business operations belong in actions or, when several actions share a rule, in a service.

Tests use the existing PHPUnit suites:

- HTTP coverage: `tests/Feature/Api/V1/` or `tests/Feature/Modules/{Domain}/`
- Action and service coverage: `tests/Unit/Modules/{Domain}/`

Migrations stay in `database/migrations`, in one ordered history. Include the domain name in the filename. Factories go under `database/factories/{Domain}/` when the first factory is needed.

## API routes

The version prefix is set once in `bootstrap/app.php` with `apiPrefix: 'api/v1'`. Laravel applies the `api` middleware group to `routes/api.php`.

When a module gains its first route, register that file explicitly from `routes/api.php`:

```php
require app_path('Modules/Identity/routes.php');
```

A route declared as `GET /sessions` is published as `GET /api/v1/sessions`. The module file must not repeat `api`, `v1`, or the `api` middleware group.

Do not discover module routes by scanning the filesystem. Each `require` is visible in review.

## Calling another module

Call the owning module's action, or a small explicit contract when the caller must not depend on that module's models. Do not write another module's models directly, and do not add an interface unless a real second implementation needs one.

Events are for follow-up processing, such as a later audit record. Authorization and business checks that the operation depends on stay in the action or service that performs the operation.

## Shared files

Changes to shared framework files need Technical Lead review before implementation:

- `bootstrap/app.php`
- `bootstrap/providers.php`
- `routes/api.php`
- `app/Providers/AppServiceProvider.php`
- `app/Models/User.php`
- `config/auth.php` and other `config/` files that define infrastructure
- `composer.json`
- `phpunit.xml`
- `database/migrations/`

Response shapes for `/api/v1` are documented in `docs/api/conventions.md`.
