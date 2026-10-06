# Media Preview for Payload

Payload 4 plugin `@seshuk/payload-plugin-media-preview`. Preview uploads in admin: list view column (popup or fullscreen modal) and edit view upload panel through Payload `upload.admin.components.filePreview`. Viewers: image, video, audio, PDF, text and code (Monaco), CSV table, download card for rest. Opt-in Microsoft/Google document viewers with signed file URLs. Custom adapters (inline Component or new tab). i18n 40+ locales. Entries `.`, `./client`, `./rsc`.

## Environment

- pnpm 12. Node.js 24.15+. Payload 4.
- Shared dev config from `@seshuk/payload-plugin-tooling` (oxlint, oxfmt, tsconfig, tsdown, test DB, CI/release workflows, changelog).
- No secrets. Dev app on SQLite `tests/payload.db`, e2e on in-memory SQLite.

## Commands

```bash
pnpm typecheck        # tsc --noEmit
pnpm lint             # oxlint; lint:fix
pnpm format           # oxfmt write; format:check to verify
pnpm test:unit        # tests/unit: no DB, no server
pnpm test:int         # tests/integration: real Payload, in-memory SQLite
pnpm test:coverage    # unit + int, v8 coverage -> coverage/
pnpm test:e2e         # Playwright, tests/e2e: starts dev app on in-memory SQLite
pnpm build            # tsdown -> dist/

pnpm dev                     # dev admin, dev@example.com / test
pnpm dev:generate-importmap  # after adding or renaming component in src/ or tests/
```

Gate: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unit && pnpm test:int && pnpm build`. UI change: also `pnpm test:e2e`.

## Structure

```
src/
├── index.ts               # mediaPreview(options), every public export
├── shared/                # isomorphic leaf, imports nothing from server/client/rsc
│   ├── constants.ts       # PLUGIN_KEY, endpoint paths, size limits, MIME lists
│   ├── types/index.ts     # public options (JSDoc API)
│   ├── types/preview.ts   # PreviewData, RSC -> client
│   ├── translations/      # index.ts, types.ts, locales/<code>.ts
│   └── utils.ts           # file kind, code language, viewer URLs, CSV parser, public URL check
├── server/                # Node only
│   ├── field.ts           # mediaPreviewField() (JSDoc)
│   ├── settings.ts        # per-collection settings in config.custom, resolveExternalViewer()
│   ├── endpoints.ts       # GET url (session auth), GET file/:token/:filename (token auth)
│   ├── fileToken.ts       # HMAC token, key from payload.secret
│   ├── filePreviewMap.ts  # filePreview MIME map, merge with user map
│   ├── adapterResolver.ts # first non-null resolve() wins
│   └── getPreviewData.ts  # kind, hint, proxied vs direct URL
├── rsc/                   # ./rsc: MediaPreviewCell (list cell), MediaPreviewFile (upload panel)
└── client/                # ./client, 'use client': Cell/, FilePreview/, Modal/, Viewer/
tests/
├── vitest.config.ts       # tooling vitestBase, projects: unit, int; v8 coverage
├── playwright.config.ts   # chromium, list reporter (+ json in CI), output in playwright/{results,reports}
├── unit/                  # utils, plugin, endpoints, telemetry: mocks, no DB
├── integration/           # *.int.spec.ts: config, endpoints, adapters on real Payload
├── suites/<name>/payload.config.ts  # int suite configs, loaded by helpers/int/getPayload(name)
├── helpers/
│   ├── shared/            # buildConfigWithDefaults (users, devUser, testDatabase, en/ru, sharp), MIME constants
│   ├── int/               # getPayload(suite)
│   └── e2e/               # uploadFile, openCellPreview, openFullscreen
├── e2e/                   # plugin.e2e.ts, serial
├── fixtures/              # upload files for int and e2e
└── payload.config.ts, app/, components/   # dev app on buildConfigWithDefaults
```

## Architecture

- **Factory:** `definePlugin` from `payload`, slug `@seshuk/payload-plugin-media-preview`. Call `mediaPreview(options)(config)`. `enabled: false` → config unchanged (schema-stable: plugin add only `ui` field, no DB column). `collections` value `boolean | MediaPreviewCollectionConfig`, `false` skip. Per collection: inject `mediaPreview` UI field (no column in DB, list Cell only) at `field.position`, merge MIME map into `filePreview`, store settings in `config.custom[PLUGIN_KEY]`, register adapter Components in `admin.dependencies` (`media-preview-viewer-${name}`), add `/media-preview/*` endpoints only when some collection has `externalViewer`.
- **Field options in `field`:** `field?: boolean | { position?, overrides?, mode?, contentMode? }`, same shape as janitor `usagePanel`. `position` = `InsertPosition` (`'first' | 'last' | { after } | { before }`, dot paths through groups and named tabs). No `'sidebar'`: field only add list column, `UIField` render nothing in edit view. Unknown or ambiguous name → throw at startup. `overrides.admin.components` merge with plugin `Cell`; own `Cell` win. 1.x collection-level `mode`/`contentMode` → throw `collections.<slug>.<key> was renamed to collections.<slug>.field.<key>`, also with `enabled: false`.
- **filePreview map:** match exact, then category wildcard, then `'*'`. Plugin sets `false` for `image/*`, `video/*`, `audio/*`, `application/pdf` → Payload keep own preview. User map with `'*'` kept as is.
- **Resolve on server, render on client.** RSC resolve adapters and build `PreviewData` with `getPreviewData()`; client render `MediaPreviewViewer` or adapter Viewer. Plain data only across boundary.
- **List select:** list view load only visible columns. Preview column visible → plugin load whole document (`select` wrapper).
- **External viewers off by default.** Office/Google file → hint (`errorNoPreview`, `errorTooLarge`, `errorPrivateServer`) or `external: true`. Client ask `GET /api/media-preview/url`: adapter `signUrl()` → direct URL as is → signed `/api/media-preview/file/:token/:filename` when Payload serve file. Never send Payload file route URL to external service.
- **Adapters:** first non-null `resolve()` win. `resolve` may be async, args `{ doc, url, mimeType, collectionSlug, payload, user? }`; `user` undefined in list Cell (Payload no pass user to cells). `{ mode: 'inline', props }` → adapter Component, `{ mode: 'newTab', url }` → link. Adapter match beat built-in viewers and `contentMode`.
- **Export names are import map keys** (`@seshuk/payload-plugin-media-preview/rsc#MediaPreviewCell`). Never rename.

## Coding rules

- No code comments. Only JSDoc on plugin options types (`src/shared/types/index.ts`, `src/server/field.ts`), `@default` for defaults. Lint/type directives bare.
- Imports end in `.js`. `@/` (= `src/`) for any import that leave folder, `./x.js` only in same folder, no `../`. Tests import source through `@/`.
- Shared names across plugins: `enabled`, `access({ req, ... })`, `path` for route on Payload, `url` for absolute URL, options type `MediaPreviewPluginConfig`. No deprecated aliases.
- Plain CSS next to component, BEM-like, Payload 4 tokens (`--color-*`, `--spacer-*`, `--radius-*`). CSS imported from client component, never RSC (tsdown keep `.css` import as is, `@/` there not rewritten).
- Payload UI first: `Button`, `Popup`, `Modal`, `CodeEditorLazy`, `@payloadcms/ui/icons/*`.
- Upload content render as text only (Monaco read-only, `<pre>` fallback, `<table>` for CSV). Never SVG/HTML from uploads in admin origin.
- Document viewer URLs absolute (`formatAbsoluteURL()`).
- UI string → every locale, namespace `@seshuk/payload-plugin-media-preview`.
- Runtime deps: none. Ask first.

## Testing

- Unit: plain vitest, mock configs inline. Factory testable directly: `mediaPreview(opts)(config)`.
- Int: `getPayload(suite)` on `tests/suites/<suite>/payload.config.ts` built with `buildConfigWithDefaults`. Call endpoints through `handleEndpoints({ config, request })` with `Authorization: JWT <token>`. Local API needs `overrideAccess: true` (Payload 4 default is `false`). Suite set `admin.autoLogin: false`, else request without token get dev user.
- E2E: serial, DELETE API cleanup in `afterEach`. Collections: `media-default`, `media-fullscreen`, `media-newtab`, `media-position`, `media-adapter`, `media-adapter-newtab`, `media-custom`, `media-external`, `media-stream`, `media-standalone`.
- External viewers need public `serverURL`. On `localhost` → `errorPrivateServer` download card, not testable locally.
- Payload render `ui` Cell in edit view form state without `rowData` → `MediaPreviewCell` return `null`.
- Names: `describe` = function or feature; `it` = present-tense verb, plain English, never `should …`.
- Bug fix come with test that fail without fix. No `.only`, `.skip`, placeholder tests.

## Docs

- `README.md` only user doc. User-facing change → update it. Breaking change → "Migrating from 1.x".

## Branches

| Branch | Major | Payload | Node   | Takes                                                   |
| ------ | ----- | ------- | ------ | ------------------------------------------------------- |
| `main` | v2    | 4       | 24.15+ | all work; PRs target `main`                             |
| `1.x`  | v1    | 3       | 18.20+ | critical/high security fixes, cherry-picked from `main` |

## Releases

- Tag push `vX.Y.Z[-pre.N]` → tooling `release.yml`: checks, git-cliff notes (tooling `cliff.toml`), GitHub Release, npm publish. Dist-tag: prerelease id, `latest` newest major, `latest-N` older major.
- New major and first `-<id>.1` prerelease need `.github/releases/<tag>.md`.
- Steps: bump `version` in `package.json`, notes file if needed, gate + `pnpm test:e2e`, commit `chore(release): vX.Y.Z`, tag. Push only when asked.
- Tags `v*` never move. Bad release = new version.

## Commits

- One-line Conventional Commit (`fix: load full documents for the preview column`). Release notes come from these.
- No co-authored-by or agent trailers.
- Commit locally. Push only when asked. Fold fixes into own unpushed commits (fixup + autosquash), no cleanup commits.

## Boundaries

Ask first: new runtime dependency, public API or export change, large refactor, commit/push not requested.

Never: secrets in repo; push, force-push or destructive git without explicit request; edit `dist/`, `importMap.js` or other generated files by hand.

## References

- `README.md`: options, adapters, file types, migration.
- `CONTRIBUTING.md`, `SECURITY.md`.
