# Testing

SimPilot follows a testing pyramid:

1. **Unit (Vitest)** — pure helpers + core logic
2. **Component (RTL + Vitest)** — key UI components
3. **Integration (Vitest)** — ingestion/parsing flows with fixtures + golden files
4. **E2E (Playwright)** — critical user journeys

## Commands

```bash
# Lint + typecheck + unit/integration (coverage) + build
npm run test:ci

# Unit/component tests
npm run test:unit

# Integration tests
npm run test:integration

# Coverage (uses thresholds in vitest.config.ts)
npx vitest run --coverage

# Playwright E2E
npm run test:e2e
```

## Where tests live

- Unit/component: `src/**/__tests__/**` and `src/**/*.test.ts(x)`
- Integration: `tests/integration/**`
- Golden fixtures: `tests/fixtures/golden/**`
- Playwright E2E: `tests/e2e/**`

## Coverage gates

Coverage is enforced via `vitest.config.ts` thresholds. CI runs `npx vitest run --coverage` and will fail if thresholds are not met.

## CI behavior

- `CI` workflow (`.github/workflows/ci.yml`):
  - lint
  - typecheck (app + test tsconfigs)
  - unit + integration tests with coverage thresholds
  - build
- `E2E (Playwright)` workflow (`.github/workflows/e2e.yml`):
  - runs on `main`, nightly schedule, or on PRs with label `run-e2e`
  - uploads the Playwright HTML report as a CI artifact

## Playwright notes

Playwright uses the preview server defined in `playwright.config.ts`:

- builds the app
- starts `npm run preview` on port `4173`
- runs tests against `baseURL=http://localhost:4173`
