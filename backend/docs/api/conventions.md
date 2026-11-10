# API conventions

Staffmate CRM exposes a versioned JSON API for the web applications. These conventions apply to `/api/v1`.

## Versioning

The version prefix is registered once in `bootstrap/app.php` with `apiPrefix: 'api/v1'`. Routes in `routes/api.php` are paths inside that prefix. A route declared as `/health` is published as `GET /api/v1/health`.

Do not repeat `api` or `v1` inside API route files. Module route files, when added, are included from `routes/api.php` and follow the same rule.

## Success responses

Successful API responses use `Content-Type: application/json` and an HTTP status that matches the outcome.

`GET /api/v1/health` returns HTTP 200 and exactly:

```json
{"status":"ok"}
```

`GET /api/v1/health` is public. `GET /api/v1/me` requires a first-party session cookie for the `web` guard. An authenticated response is HTTP 200 and exactly:

```json
{"id":1,"name":"Ada Lovelace","email":"ada@example.com"}
```

The body contains only `id`, `name`, and `email`. A missing session or an `Authorization` header returns HTTP 401 and `{"message":"Unauthenticated."}`. Bearer tokens are not accepted.

Later endpoints should return JSON objects or arrays and use the matching success status, such as 200 or 201.

## Error responses

Requests under `api/*` render errors as JSON even when the client does not send `Accept: application/json`.

Laravel’s default JSON error shape is:

```json
{"message":"..."}
```

Validation errors, when an endpoint adds them later, also include an `errors` object. The HTTP status must match the outcome, such as 404, 422, or 500.

API response bodies must not include stack traces, exception class names, file paths, line numbers, SQL, secrets, or worker data. That depends on `APP_DEBUG=false`, which is the application default. Do not enable debug mode for deployed API environments.

## `/up` and `/api/v1/health`

`GET /up` is Laravel’s process health route. It stays registered and is separate from the CRM API. A JSON request to `/up` reports `up` or `down`.

`GET /api/v1/health` is the versioned API health check. Its contract is HTTP 200 and `{"status":"ok"}`.

`GET /api/v1/me` is the current-user probe for the Identity module. It is not a business API. A password session can read it before MFA enrollment. Its body stays limited to `id`, `name`, and `email`.

`GET /api/v1/identity/state` tells the Admin UI whether email verification, MFA enrollment, and the current login's MFA challenge are complete. It is not worker or document data.

`GET /api/v1/admin/home` is the protected Admin landing payload. It requires an active verified account, MFA enrollment, a completed MFA challenge in the current session, the Admin host, and permission to view employees or roles. CRM hosts receive HTTP 403.

`GET /api/v1/crm/home` is the CRM landing payload for a completed CRM session. Its navigation lists only features that exist. Employee and role changes are Admin routes and require the matching Identity permission.

`POST /api/v1/invitations/accept` accepts one invitation token and a new password. It does not start a session.

Business routes must use `mfa.enrolled`. A password-only session or an unfinished challenge receives HTTP 403. Session login, logout, password reset, and email verification are Fortify routes outside `/api/v1`. They do not issue API tokens. Public registration and passkeys are not registered.

The cookie session and the `/me` contract are described in `docs/adr/0002-cookie-session-foundation.md`. Roles and the MFA gate are described in `docs/adr/0003-identity-access-part-1.md`.
