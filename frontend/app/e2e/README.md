# Staffmate unified SPA — Playwright tests

## Mocked tests (default)

All specs under `e2e/` use Playwright network mocks for Sanctum/Identity APIs.
They do **not** use real passwords, MFA secrets, or Laravel sessions.

```bash
cd frontend/app
npm install
# Optional: bundled Chromium. Config defaults to the system Chrome channel.
npx playwright install chromium
npm run test:e2e:mocked
```

Playwright is configured with `channel: 'chrome'` so a local Google Chrome install is enough when the bundled Chromium download fails.

## Real Laravel integration (not automated here)

Flows that require a live Fortify session, TOTP enrollment, and Spatie permissions
need a dedicated test account and MFA secret. Those are intentionally not run in CI
without secrets. Manual verification remains on `http://app.localhost:5173`.
