# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm test:unit` — run unit tests (vitest, no DB needed)
- `pnpm test:unit tests/unit/utils.spec.ts` — run a single test file
- `pnpm test:int` — run DB integration tests (none yet)
- `pnpm test:e2e` — run E2E tests (Playwright, starts dev server automatically)
- `pnpm test:e2e:ui` — run E2E tests with Playwright UI
- `pnpm typecheck` — TypeScript check (`tsc --noEmit`)
- `pnpm lint` — oxlint (shared base from `@seshuk/payload-plugin-tooling`)
- `pnpm format` / `pnpm format:check` — oxfmt (shared base)
- `pnpm build` — tsdown (`pluginBuild()` from the tooling)
- `pnpm dev` — Next.js dev server using `tests/payload.config.ts` as test app (port 3000)
- `pnpm dev:generate-importmap` — regenerate import map after adding/changing components
- After adding/changing custom viewer components in tests, run `pnpm dev:generate-importmap` before running E2E tests

## Architecture

**Key files**:

- `src/index.ts` — plugin entry, config transformation
- `src/shared/` — isomorphic: `constants.ts` (incl. `PLUGIN_KEY`), `types/index.ts` (public types), `types/preview.ts` (`PreviewData`), `utils.ts` (MIME kind detection, viewer URLs, CSV parser, public URL check), `translations/`
- `src/server/field.ts` — UI field definition (list Cell only, server/client props split)
- `src/server/settings.ts` — per-collection settings stored in `config.custom`, `resolveExternalViewer()`
- `src/server/endpoints.ts` — sign URL endpoint (session auth) and signed file endpoint (token auth)
- `src/server/fileToken.ts` — HMAC file tokens (key derived from `payload.secret`)
- `src/server/filePreviewMap.ts` — `filePreview` MIME map build + merge with the user's config
- `src/server/adapterResolver.ts` — runtime adapter matching + viewer rendering
- `src/server/getPreviewData.ts` — file kind, hints (viewer off, too large, private server), proxied vs direct URL
- `src/rsc/` — `./rsc` entry: `MediaPreviewCell.tsx` (list cell) and `MediaPreviewFile.tsx` (edit view `filePreview`)
- `src/client/` — `./client` entry: `Cell/Cell.tsx` (list cell popup), `FilePreview/FilePreview.tsx` (upload panel, fullscreen button), `Modal/Modal.tsx` (fullscreen modal, Payload `Modal`), `Viewer/` (`MediaPreviewViewer` dispatcher, Image/Video/Audio/Iframe/Text/External viewers, DownloadCard)

**Plugin pattern**: `mediaPreview(config) => (payloadConfig) => payloadConfig` — standard Payload plugin shape. The plugin transforms the Payload config by:

1. Injecting a virtual `mediaPreview` UI field (no DB storage, list Cell only) into each configured upload collection
2. Merging its MIME map into `upload.admin.components.filePreview` (types Payload doesn't preview, adapter `mimeTypes` and the `'*'` fallback; images, video, audio and PDF set to `false`)
3. Registering adapter Viewer components in `admin.dependencies`
4. Storing adapters and per-collection settings in `config.custom['@seshuk/payload-plugin-media-preview']`
5. Adding the `/media-preview/*` endpoints when some collection turns on `externalViewer`
6. Merging i18n translations (40+ locales)

**Three export paths** (all use `.js` extension in imports):

- `.` — plugin function + all public types
- `./client` — built-in viewers for adapters (Image, Video, Audio, Iframe)
- `./rsc` — server components (MediaPreviewCell, MediaPreviewFile)

**Component rendering flow**: Payload renders the list Cell or the upload panel `filePreview` → RSC (`rsc/MediaPreviewCell.tsx` / `rsc/MediaPreviewFile.tsx`) resolves adapters and builds `PreviewData` via `getPreviewData()` → client component renders `MediaPreviewViewer` or the adapter Viewer (in a Modal for the cell, inline + fullscreen modal for the edit view).

**External viewers**: off by default. Office/Google files get a hint (`noPreview`, `tooLarge`, `privateServer`) or `external: true`. The client asks `GET /api/media-preview/url` for the viewer URL: adapter `signUrl()` → direct URL as is → signed `/api/media-preview/file/:token/:filename` for files Payload serves. Never send Payload file route URLs to external services directly.

**Adapter system**: Extensible via `MediaPreviewAdapter`. Each adapter has a `resolve()` function called with document data — first adapter returning non-null wins. `resolve()` returns `{ mode: 'inline', props }` to render a custom Component in modal, or `{ mode: 'newTab', url }` to show a link button. `Component` is optional (not needed for newTab-only adapters). When adapter matches, it takes priority over built-in viewers and `contentMode`. Built-in viewer prop types (`IframeViewerProps`, etc.) can be used via `satisfies`. Adapters with `Component` register in `admin.dependencies` with key `media-preview-viewer-${adapter.name}`.

**Field positioning**: `insertField()` supports `'first' | 'last' | { after: string } | { before: string }` with dot-notation paths for nested fields and tab traversal.

## Commit Rules

- Never add Co-Authored-By or any other copyright/attribution lines to commit messages

## Code Style

- No code comments: the code must read on its own. The only exception is JSDoc on the public plugin option types (`src/shared/types/index.ts`, `src/server/field.ts`), with `@default` for defaults. Lint and type directives (`@ts-expect-error`, `eslint-disable-next-line`) stay bare, without an explanation.
- Path alias: `@/*` maps to `./src/*`
- All internal imports MUST use `.js` extension (ESM requirement)
- Plain CSS for component styles (BEM-like, co-located with components; Payload 4 `--color-*`, `--spacer-*`, `--radius-*` tokens)
- i18n namespace: `@seshuk/payload-plugin-media-preview`
- Build: tsdown via `@seshuk/payload-plugin-tooling/tsdown` (unbundled ESM + dts, CSS copied to dist)

## Testing

- **Unit tests** (vitest, `tests/unit/`): Pure tests that import from `vitest` — no DB, no server, mock configs inline. 30s timeout.
- **E2E tests** (Playwright, `tests/e2e/`): Run against the test app in `tests/`. The DB comes from `testDatabase()` (`@seshuk/payload-plugin-tooling/test-database`, `TEST_DB=sqlite|postgres|mongodb`); Playwright starts the dev server with `DATABASE_URL=file::memory:`. Test fixtures in `tests/fixtures/`. Dev server auto-starts via Playwright config.
- E2E tests run serially (`fullyParallel: false`). Tests use `afterEach` with DELETE API calls to clean up uploads between tests.
- Test app login: `dev@example.com` / `test`
- Test collections: `media-default` (basic), `media-fullscreen`, `media-newtab` (video/document in new tab), `media-position` (field after 'alt'), `media-adapter` (IframeViewer via adapter), `media-adapter-newtab` (newTab adapter), `media-custom` (custom component via adapter), `media-external` (`externalViewer: true`), `media-stream` (adapter with `mimeTypes: ['video/*', 'audio/*']`)

## Gotchas

- External viewers need a public `serverURL`; on `localhost` the plugin shows the download card with the `privateServer` hint, so they can't be tested locally.
- Payload also renders `ui` field Cells in edit view form state without `rowData`; `MediaPreviewCell` returns `null` there.
- Text previews render as text only (Payload `CodeEditorLazy` read-only, `<pre>` fallback, `<table>` for CSV). Never render SVG/HTML from uploads in the admin origin.
- Missing `.js` extensions on internal imports cause silent runtime failures in ESM builds (see Code Style).
