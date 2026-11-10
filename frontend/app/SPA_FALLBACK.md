# Staffmate unified SPA — production fallback notes

Local Vite already serves `index.html` for unknown frontend paths and uses
`spaAuthProxy` so GET `/login`, `/forgot-password`, and `/reset-password/:token`
reach React Router while POST still goes to Fortify.

## Laravel production requirement

When the built SPA is served from Laravel (or any reverse proxy in front of it),
configure a catch-all that returns the SPA `index.html` for browser navigation
to application routes, without capturing API or Fortify POST endpoints.

Routes that must fall back to the SPA document:

- `/`
- `/login`
- `/forgot-password`
- `/reset-password/{token}`
- `/accept-invitation/{token}`
- `/mfa/*`
- `/admin`
- `/admin/employees`
- `/admin/roles`
- `/crm`
- `/forbidden`, `/expired`, `/unavailable`
- any other non-API client route

Do **not** fall back for:

- `/api/*`
- `/sanctum/*`
- Fortify POSTs: `/login`, `/logout`, `/forgot-password`, `/reset-password`,
  `/two-factor-challenge`, `/user/*`, `/email/*`

Typical Laravel approach (implement in a later backend task — not applied here):

1. Build the SPA into a public asset directory Laravel can serve.
2. Add a `web` route (or nginx `try_files`) that returns the SPA entry HTML for
   `GET` requests that are not files and not reserved API/auth paths.
3. Keep Sanctum stateful domains and CSRF cookie flow unchanged.

Frontend routing is not authorization. Admin and CRM APIs remain gated by
session, MFA, and Spatie permissions on the server.
