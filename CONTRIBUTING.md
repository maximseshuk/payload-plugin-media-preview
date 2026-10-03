# Contributing

Thanks for helping with the media preview plugin for Payload. This guide covers the setup, the rules the code follows, and how pull requests get reviewed.

## Before you start

- For a bug, open an issue with steps to reproduce first, unless the fix is small and obvious.
- For a new feature or a change to the public config, open an issue first and describe the use case. It saves you work if the idea doesn't fit the plugin.
- For security problems, don't open an issue. Follow [SECURITY.md](SECURITY.md).

## Setup

You need Node.js 24.15+ and pnpm 12.

```bash
pnpm install
pnpm test:unit
```

## Test setup

Tests and the dev app need no accounts and no `.env` file. Unit tests need no database or server. E2E tests run Playwright against the dev app in `tests/` on an in-memory SQLite database, and Playwright starts the dev server itself. `pnpm dev` keeps its data in `tests/payload.db`. Install the browser once with `pnpm exec playwright install chromium`. The dev app login is `dev@example.com` / `test`.

After you add or change a custom component in `tests/`, run `pnpm dev:generate-importmap` before the e2e tests.

## Commands

```bash
pnpm typecheck      # tsc --noEmit
pnpm lint           # oxlint
pnpm format         # oxfmt
pnpm test:unit      # unit tests, no database needed
pnpm test:e2e       # Playwright e2e against the dev app
pnpm build          # tsdown
pnpm dev            # dev Payload app
```

Run `pnpm typecheck && pnpm lint && pnpm format && pnpm test:unit` before you push.

## Code rules

- **End internal imports with `.js`.** The build is ESM, and a missing extension fails silently at runtime.
- **Import across folders through `@/`.** The `@/*` alias maps to `./src/*`. Use `./x.js` only for a file in the same folder, never `../`. Tests import source through `@/` too.
- **Keep the layers apart.** `src/shared/` is isomorphic and imports nothing from the other folders. `src/server/` runs on Node only. `src/client/` and `src/rsc/` are the `./client` and `./rsc` entry points. `.` (`src/index.ts`) holds the plugin and the public types.
- **Resolve on the server, render on the client.** The RSC resolves the adapter and the preview type, then passes plain data to the client components.
- **Use plain CSS.** Keep it next to the component, BEM-like, with the Payload 4 tokens (`--color-*`, `--spacer-*`, `--radius-*`).
- **Pass absolute URLs to document viewers.** Build them with `formatAbsoluteURL()` from Payload. Relative paths get double-encoded by Google Docs and Microsoft Office viewers.
- **Add UI strings to every locale.** Translations live in `src/shared/translations/` under the `@seshuk/payload-plugin-media-preview` namespace.
- **Don't write comments.** Name things so the code explains itself. The only exception is JSDoc on the public option types (`src/shared/types/index.ts`, `src/server/field.ts`), with `@default` for defaults. Lint and type directives stay bare.
- **Match the surrounding code.** Follow the naming and patterns already used in the file you change.
- **Ask before adding a runtime dependency.** Say why in the issue or PR.

## Tests

- Add or update tests for every behavior change.
- Unit tests are plain vitest files in `tests/unit/` (`utils.spec.ts`, `plugin.spec.ts`, `endpoints.spec.ts`) with mock configs inline. Browser behavior goes in the Playwright suite, `tests/e2e/plugin.e2e.ts`.
- E2E tests run serially. Clean up uploads with the DELETE API in `afterEach`.
- Name a `describe` after the function or feature under test (`insertField`, `mediaPreview plugin`). Start an `it` name with a present-tense verb and write it in plain English: `places the field after alt`, not `should place…`.
- A bug fix should come with a test that fails without the fix.
- Don't commit `.only`, `.skip` or placeholder tests.

## Docs

If users will notice the change, update `README.md`. It is the only documentation for the plugin.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) with a short, one-line subject, for example `fix: load full documents for the preview column` or `feat: add a contentMode override`. The release changelog is built from these.
- Keep each PR focused on one change. Open it against `main`, which holds 2.x for Payload 4. The `1.x` branch (Payload 3) only takes critical and high-severity security fixes, which are cherry-picked from `main` where possible.
- Fill in the PR template: what changed, why, and how you tested it. Link the issue (`Closes #123`).
- CI must pass. The `Lint, typecheck, test, build (24)` check runs lint, format check, typecheck, unit tests and the build on Node 24. Playwright e2e runs in a separate CI job.
- All review threads need to be resolved before merge.

## License

By contributing, you agree that your work is released under the [MIT License](LICENSE).
