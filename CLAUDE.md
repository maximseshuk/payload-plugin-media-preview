# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm test` — run unit tests (vitest, no DB needed)
- `pnpm test -- tests/utils.spec.ts` — run a single test file
- `pnpm test:e2e` — run E2E tests (Playwright, starts dev server automatically)
- `pnpm test:e2e:ui` — run E2E tests with Playwright UI
- `pnpm typecheck` — TypeScript check (`tsc --noEmit`)
- `pnpm lint` — ESLint
- `pnpm build` — clean + copyfiles + tsc types + SWC compile
- `pnpm dev` — Next.js dev server using `tests/payload.config.ts` as test app (port 3000)
- `pnpm dev:generate-importmap` — regenerate import map after adding/changing components
- After adding/changing custom viewer components in tests, run `pnpm dev:generate-importmap` before running E2E tests

## Architecture

**Key files**:

- `src/index.ts` — plugin entry, config transformation
- `src/field.ts` — UI field definition (RSC component paths, server/client props split)
- `src/types.ts` — public types (`MediaPreviewAdapter`, `MediaPreviewAdapterInlineResult`, `MediaPreviewAdapterNewTabResult`)
- `src/components/adapterResolver.ts` — runtime adapter matching + viewer rendering
- `src/components/MediaPreview.tsx` — main RSC (field context), resolves adapters
- `src/components/MediaPreview.utils.ts` — preview type detection, viewer URL construction
- `src/components/Cell/Cell.server.tsx` + `Cell.client.tsx` — cell context (RSC + client split)
- `src/components/Field/Field.tsx` — field context (client only, receives resolved data from RSC)
- `src/components/Modal/Modal.tsx` — dual-mode: fullscreen (Payload Modal) or popup (positioned floating panel)
- `src/components/Viewer/` — ImageViewer, VideoViewer, AudioViewer, IframeViewer

**Plugin pattern**: `mediaPreview(config) => (payloadConfig) => payloadConfig` — standard Payload plugin shape. The plugin transforms the Payload config by:

1. Injecting a virtual `mediaPreview` UI field (no DB storage) into each configured upload collection
2. Registering adapter Viewer components in `admin.dependencies`
3. Storing adapters in `config.custom['@seshuk/payload-media-preview']` for runtime resolution
4. Merging i18n translations (40+ locales)

**Three export paths** (all use `.js` extension in imports):

- `.` — plugin function + all public types
- `./client` — client components (Field, Cell, Modal, Viewers)
- `./rsc` — server components (MediaPreview, MediaPreviewCell)

**Component rendering flow**: Payload renders the UI field → RSC server component (`MediaPreview.tsx`) resolves adapters and preview type → passes data to client component (`Field/Field.tsx`) → client renders appropriate Viewer (Image/Video/Audio/Iframe) or custom adapter Viewer inside a Modal.

**Adapter system**: Extensible via `MediaPreviewAdapter`. Each adapter has a `resolve()` function called with document data — first adapter returning non-null wins. `resolve()` returns `{ mode: 'inline', props }` to render a custom Component in modal, or `{ mode: 'newTab', url }` to show a link button. `Component` is optional (not needed for newTab-only adapters). When adapter matches, it takes priority over built-in viewers and `contentMode`. Built-in viewer prop types (`IframeViewerProps`, etc.) can be used via `satisfies`. Adapters with `Component` register in `admin.dependencies` with key `media-preview-viewer-${adapter.name}`.

**Field positioning**: `insertField()` supports `'first' | 'last' | { after: string } | { before: string }` with dot-notation paths for nested fields and tab traversal.

## Commit Rules

- Never add Co-Authored-By or any other copyright/attribution lines to commit messages

## Code Style

- Path alias: `@/*` maps to `./src/*`
- All internal imports MUST use `.js` extension (ESM requirement)
- SCSS for component styles (BEM-like, co-located with components)
- i18n namespace: `@seshuk/payload-media-preview`
- Build: SWC for JS output, tsc for declarations only (`tsconfig.build.json`)

## Testing

- **Unit tests** (vitest): Pure tests with `globals: true` — no DB, no server, mock configs inline. 30s timeout.
- **E2E tests** (Playwright): Run against the test app in `tests/`. Uses MongoDB Memory Server in-memory DB. `CLEAN_DB=1` env var triggers database drop on init. Test fixtures in `tests/fixtures/`. Dev server auto-starts via Playwright config.
- E2E tests run serially (`fullyParallel: false`). Tests use `afterEach` with DELETE API calls to clean up uploads between tests.
- Test app login: `dev@example.com` / `test`
- Test collections: `media-default` (basic), `media-fullscreen`, `media-newtab` (video/document in new tab), `media-position` (field after 'alt'), `media-adapter` (IframeViewer via adapter), `media-adapter-newtab` (newTab adapter), `media-custom` (custom component via adapter)

## Gotchas

- Document viewer URLs (Google Docs Viewer, Microsoft Office Viewer) require absolute URLs via `formatAbsoluteURL()` from Payload — relative paths cause double-encoding.
- Missing `.js` extensions on internal imports cause silent runtime failures in ESM builds (see Code Style).
