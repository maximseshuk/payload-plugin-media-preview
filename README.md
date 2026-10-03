<div align="center">

<h1>Media Preview Plugin for Payload CMS</h1>

<p>Preview images, videos, audio, and documents directly in the Payload CMS admin panel.</p>

<a href="https://www.npmjs.com/package/@seshuk/payload-plugin-media-preview"><img src="https://img.shields.io/npm/v/@seshuk/payload-plugin-media-preview?style=flat-square&logo=npm" alt="npm version" /></a>
<a href="https://www.npmjs.com/package/@seshuk/payload-plugin-media-preview"><img src="https://img.shields.io/npm/dm/@seshuk/payload-plugin-media-preview?style=flat-square" alt="npm downloads" /></a>
<a href="https://github.com/maximseshuk/payload-plugin-media-preview/releases/"><img src="https://img.shields.io/github/v/release/maximseshuk/payload-plugin-media-preview?style=flat-square&logo=github" alt="GitHub release" /></a>
<a href="https://github.com/maximseshuk/payload-plugin-media-preview/blob/main/LICENSE"><img src="https://img.shields.io/github/license/maximseshuk/payload-plugin-media-preview?style=flat-square" alt="license" /></a>
<a href="https://ko-fi.com/V7V61UCT39"><img src="https://img.shields.io/badge/Ko--fi-Buy_me_a_coffee-ff5f5f?style=flat-square&logo=ko-fi&logoColor=white" alt="Ko-fi" /></a>

</div>

## Features

- Previews in the edit view upload panel for file types Payload doesn't preview itself: text, code, JSON, CSV, Office and other documents
- Preview column in the list view, with a popup on desktop and a fullscreen modal on mobile
- Opt-in Microsoft and Google viewers for Office and other documents, with short-lived signed URLs for files Payload serves itself
- Extensible adapter system for custom viewers
- Zero database fields

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Plugin Config](#plugin-config)
  - [Collection Config](#collection-config)
  - [Display Modes](#display-modes)
  - [Content Modes](#content-modes)
  - [Field Position](#field-position)
  - [Supported File Types](#supported-file-types)
- [Edit View](#edit-view)
- [External Viewers](#external-viewers)
- [Adapters](#adapters)
- [Standalone Field](#standalone-field)
- [Internationalization](#internationalization)
- [Exports](#exports)
- [TypeScript](#typescript)
- [Breaking Changes in 2.0](#breaking-changes-in-20)
- [License](#license)

## Requirements

- Payload `4.0.0-canary.37`
- Node.js `>=24.15.0`

## Installation

```bash
pnpm add @seshuk/payload-plugin-media-preview@beta
# or
npm install @seshuk/payload-plugin-media-preview@beta
# or
yarn add @seshuk/payload-plugin-media-preview@beta
```

2.x is in beta under the `beta` npm tag. For Payload 3, use `@seshuk/payload-plugin-media-preview@1`.

## Quick Start

```ts
import { mediaPreview } from '@seshuk/payload-plugin-media-preview'
import { buildConfig } from 'payload'

export default buildConfig({
  // ...
  plugins: [
    mediaPreview({
      collections: {
        media: true,
      },
    }),
  ],
})
```

This adds a preview column to your `media` collection's list view and previews text, JSON, CSV and other files in the edit view upload panel. Images, video, audio and PDF keep Payload's own preview there.

## Configuration

### Plugin Config

| Option           | Type                                          | Default | Description                                                                                 |
| ---------------- | --------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `enabled`        | `boolean`                                     | `true`  | Enable or disable the plugin                                                                |
| `adapters`       | `MediaPreviewAdapter[]`                       | `[]`    | Global adapters for collections that don't set their own                                    |
| `collections`    | `Record<string, CollectionConfig \| true>`    | —       | Which upload collections to add preview to                                                  |
| `externalViewer` | `boolean \| { office?, google?, expiresIn? }` | `false` | Microsoft and Google viewers for all collections. See [External Viewers](#external-viewers) |

### Collection Config

Each collection entry can be `true` (all defaults) or an object:

| Option           | Type                                          | Default    | Description                                                          |
| ---------------- | --------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `mode`           | `'auto' \| 'fullscreen'`                      | `'auto'`   | List cell display mode                                               |
| `contentMode`    | `Partial<MediaPreviewContentMode>`            | all inline | How the list cell opens each content type (`'inline'` or `'newTab'`) |
| `adapters`       | `MediaPreviewAdapter[]`                       | —          | Per-collection adapters (override global)                            |
| `field`          | `false \| { position?, overrides? }`          | `{}`       | List column config, or `false` to skip it (for manual placement)     |
| `filePreview`    | `boolean`                                     | `true`     | Register the edit view preview. See [Edit View](#edit-view)          |
| `externalViewer` | `boolean \| { office?, google?, expiresIn? }` | global     | Overrides the global `externalViewer` for this collection            |

**`field` options:**

| Option      | Type                                       | Default  | Description                                                      |
| ----------- | ------------------------------------------ | -------- | ---------------------------------------------------------------- |
| `position`  | `'first' \| 'last' \| { after \| before }` | `'last'` | Where to insert the preview field, which sets the column order   |
| `overrides` | `Partial<Omit<UIField, 'name' \| 'type'>>` | —        | Payload UI field overrides (`name` and `type` cannot be changed) |

```ts
mediaPreview({
  collections: {
    media: true,
    'hero-images': {
      mode: 'fullscreen',
      contentMode: { video: 'newTab' },
      field: { position: { after: 'alt' } },
    },
  },
})
```

### Display Modes

The `mode` option controls how the list view cell shows previews. The edit view always uses Payload's upload panel, with a fullscreen button for plugin previews.

#### `'auto'` (default)

Smart mode that adapts to context and device:

| Context          | Desktop                      | Mobile           |
| ---------------- | ---------------------------- | ---------------- |
| Cell (list view) | Floating popup near the cell | Fullscreen modal |

#### `'fullscreen'`

Always uses a fullscreen modal, regardless of device.

```ts
collections: {
  media: {
    mode: 'fullscreen',
  },
}
```

### Content Modes

Control how the list cell opens each content type with the `contentMode` option. Each content type can be set to `'inline'` (default) or `'newTab'`:

| Mode       | Behavior                               |
| ---------- | -------------------------------------- |
| `'inline'` | Show content in modal preview          |
| `'newTab'` | Open the file URL in a new browser tab |

`document` covers PDF, text, Office and other documents.

```ts
collections: {
  media: {
    contentMode: {
      video: 'newTab',      // open videos in a new tab
      document: 'newTab',   // open documents in a new tab
      image: 'inline',      // show images in modal (default)
      audio: 'inline',      // show audio in modal (default)
    },
  },
}
```

### Field Position

The preview is a `ui` field. Its position in the fields array sets the default order of the list view column. Change it with the `field.position` option:

```ts
// At the end (default)
field: {
  position: 'last'
}

// At the beginning
field: {
  position: 'first'
}

// After a specific field
field: {
  position: {
    after: 'alt'
  }
}

// Before a specific field
field: {
  position: {
    before: 'description'
  }
}
```

Dot-notation paths are supported for nested groups and named tab fields:

```ts
// After a field inside a named group
field: {
  position: {
    after: 'myGroup.fieldName'
  }
}

// After a field inside a named tabs field (tab index is zero-based)
field: {
  position: {
    after: 'myTabs.0.fieldName'
  }
}
```

Fields inside unnamed tabs are found automatically — no path prefix needed:

```ts
// Works even if 'alt' is inside an unnamed tab
field: {
  position: {
    after: 'alt'
  }
}
```

### Supported File Types

| Type                                                       | Edit view                | List cell                |
| ---------------------------------------------------------- | ------------------------ | ------------------------ |
| Images (`image/*`)                                         | Payload built-in         | `<img>`                  |
| Video and audio (`video/*`, `audio/*`)                     | Payload built-in         | `<video>` / `<audio>`    |
| PDF                                                        | Payload built-in         | `<iframe>`               |
| Text and code (`text/*`, JSON, XML, YAML, JavaScript)      | Plugin: code viewer      | Plugin: code viewer      |
| CSV (`text/csv`)                                           | Plugin: table            | Plugin: table            |
| Office (`.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`) | Microsoft viewer or card | Microsoft viewer or card |
| `.psd`, `.ai`/`.eps`/`.ps`, `.dxf`, `.pages`, `.xps`       | Google viewer or card    | Google viewer or card    |
| Anything else (`.zip`, unknown types)                      | Download card            | Download card            |

Text is fetched in the browser and shown as text, never as HTML. Markdown and HTML files show their source. Text and code open in Payload's read-only code editor (Monaco, the same one as JSON fields) with syntax highlighting for JSON (pretty-printed), YAML, XML, CSS, HTML, Markdown, JavaScript, TypeScript, Python, shell and INI/TOML. Plain text and logs show without highlighting. If the editor can't load, the text shows as plain text. Files over 1 MB and CSV past 1000 rows are not rendered in full: files over 1 MB show the download card, and CSV shows the first 1000 rows. When the size is unknown, the first 1 MB is shown.

Browsers often upload code files as `application/octet-stream` or without a type. For those files the plugin goes by the extension: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.py`, `.sh`, `.json`, `.yaml`, `.yml`, `.toml`, `.ini`, `.conf`, `.env` (and `.env.example`), `.log`, `.md`, `.txt`, `.csv`, `.css` and `.xml` show as text. Other untyped files get the download card.

Payload rejects some uploads unless the collection sets `upload.allowRestrictedFileTypes: true` (or lists the types in `upload.mimeTypes`): among them `.html`/`.htm`, `.js`, `.py`, `.rb`, `.php` and `.pl`. See `RESTRICTED_FILE_EXT_AND_TYPES` in Payload. The plugin previews these files once Payload accepts them.

The download card shows the file name, size and type, with Download and Open buttons. It also shows why there is no preview: the viewer is off, the file is too large, or the server isn't public.

OpenDocument files (`.odt`, `.ods`, `.odp`) are not sent to the Microsoft viewer because its embed endpoint rejects them.

## Edit View

The plugin adds its component to `upload.admin.components.filePreview` as a MIME type map. It registers the types Payload doesn't preview (text, CSV, Office and Google viewer formats), the `mimeTypes` of the collection's adapters, and the `'*'` fallback, so any other type shows the download card instead of Payload's placeholder. Images, video, audio and PDF are set to `false`, so they keep Payload's built-in preview.

Your own `filePreview` wins:

- A single component (a string or `{ path }`) is kept as is, and the plugin adds nothing.
- A map with the `'*'` fallback is kept as is, because your fallback already covers every type.
- In a map, the keys you set are kept. The plugin skips its own keys that match yours exactly or by category (`text/*` covers `text/plain`).

Set `filePreview: false` on a collection to skip the edit view preview.

Plugin previews have a fullscreen button that opens the same fullscreen modal as the list cell.

## External Viewers

Office files can be shown in the [Microsoft Office viewer](https://view.officeapps.live.com), and `.psd`, `.ai`, `.eps`, `.ps`, `.dxf`, `.pages` and `.xps` files in the Google Docs viewer. These are external services that download the file from a URL, so they are **off by default**.

> **Privacy:** When an external viewer is on, Microsoft or Google downloads the file and can cache it, sometimes for about a day. Turn it on only for files you are allowed to share with these services.

```ts
mediaPreview({
  externalViewer: { office: true }, // all collections: Microsoft viewer only
  collections: {
    media: true,
    contracts: { externalViewer: false }, // never send these files out
    designs: { externalViewer: { google: true, expiresIn: 300 } },
  },
})
```

| Option      | Type      | Default | Description                                                          |
| ----------- | --------- | ------- | -------------------------------------------------------------------- |
| `office`    | `boolean` | `false` | Microsoft viewer for Office formats                                  |
| `google`    | `boolean` | `false` | Google viewer for the other document formats                         |
| `expiresIn` | `number`  | `600`   | Signed URL lifetime in seconds. Applies only to files Payload serves |

`true` turns on both viewers. The collection value replaces the global one.

The viewer needs a URL it can reach:

- **Direct URL** (public bucket, CDN, `generateFileURL`): the viewer gets the file URL as is.
- **Payload file route** (`{serverURL}/api/{collection}/file/{filename}`, which checks access): the plugin signs a short-lived URL to its own endpoint, so the viewer never gets your session.
- **Adapter `signUrl`**: when an adapter returns a URL, it is used instead of both. See [Adapters](#adapters).

The viewers are hidden, and the download card is shown, when:

- `serverURL` is missing, `localhost` or a private IP address. External viewers can't be tested on `localhost`.
- The file is larger than 10 MB (Microsoft) or 25 MB (Google).

When any collection turns on an external viewer, the plugin adds two endpoints:

| Endpoint                                       | Auth          | Description                                                                           |
| ---------------------------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| `GET /api/media-preview/url?collection=&id=`   | Admin session | Checks read access to the document and its file and returns `{ url }` for the viewer  |
| `GET /api/media-preview/file/:token/:filename` | Signed token  | Streams one file. The token is bound to the collection, document, filename and expiry |

The token is an HMAC-SHA256 signature with a key derived from the Payload `secret`. The file endpoint reads the file through the collection's storage adapter handlers, or from `staticDir`, and responds with `Cache-Control: no-store`, `Content-Disposition: inline` and `X-Content-Type-Options: nosniff`. An expired or invalid token returns `404`.

The sign endpoint checks file access the same way Payload's file route does: your `read` access function is called with `isReadingStaticFile: true`, and a returned query must match the document. With drafts, both endpoints use the latest draft, the version the edit view shows.

When a storage handler redirects to a signed storage URL (for example S3 `signedDownloads`), the file endpoint downloads the target itself. It follows only `https:` URLs, or `http:` URLs when the request itself came over `http:` (local development). It does not follow further redirects and stops after 30 seconds.

## Adapters

Adapters let you customize how files are previewed. When an adapter matches a document, it takes priority over built-in viewers and `contentMode` settings.

Each adapter has a `resolve()` function that returns one of two modes:

- `{ mode: 'inline', props }` — renders a custom component inside the modal preview
- `{ mode: 'newTab', url }` — opens a link in a new browser tab

The `Component` field is only needed for `inline` mode. Adapters that only use `newTab` mode don't need a component.

Adapters always apply in the list cell. The edit view shows the plugin preview only for the plugin's own types and the types in the adapters' `mimeTypes`. For other types, Payload shows its own preview and adapters are not called. When `resolve()` returns `null`, the plugin shows its default viewer.

| Field       | Type                                     | Description                                                                       |
| ----------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `name`      | `string`                                 | Unique adapter name                                                               |
| `Component` | `string`                                 | Component path for `inline` results                                               |
| `resolve`   | `(args) => result \| null`               | Returns how to preview a document, or `null` to skip                              |
| `mimeTypes` | `string[]`                               | Types the adapter previews in the edit view, for example `['video/*', 'audio/*']` |
| `signUrl`   | `(args) => string \| null \| Promise<…>` | Public URL for the external viewers. See [Signed URLs](#signed-urls)              |

### Examples

```ts
import type { IframeViewerProps, MediaPreviewAdapter } from '@seshuk/payload-plugin-media-preview'

// Inline — custom component in modal
const videoAdapter: MediaPreviewAdapter = {
  name: 'video-embed',
  Component: 'my-pkg/client#VideoPlayer',
  resolve: ({ doc }) => {
    if (!doc.videoId) return null
    return {
      mode: 'inline',
      props: { videoId: doc.videoId, autoplay: false },
    }
  },
}

// NewTab — opens link in new browser tab (no Component needed)
const externalPreview: MediaPreviewAdapter = {
  name: 'external',
  resolve: ({ url }) => {
    if (!url) return null
    return {
      mode: 'newTab',
      url: `https://preview.service.com/?file=${encodeURIComponent(url)}`,
    }
  },
}

// Built-in viewer with typed props via satisfies
const iframeAdapter: MediaPreviewAdapter = {
  name: 'iframe',
  Component: '@seshuk/payload-plugin-media-preview/client#IframeViewer',
  resolve: ({ url }) => {
    if (!url) return null
    return {
      mode: 'inline',
      props: { src: url, allowFullScreen: true } satisfies IframeViewerProps,
    }
  },
}
```

### Signed URLs

When the files live in private storage, an adapter can return its own short-lived URL for the external viewers. `signUrl` receives `{ doc, url, expiresIn, req }`. The first adapter that returns a URL wins, and its URL is used instead of the plugin's signed URL. Return `null` to skip.

```ts
const privateBucket: MediaPreviewAdapter = {
  name: 'private-bucket',
  resolve: () => null,
  signUrl: async ({ doc, expiresIn }) =>
    typeof doc.filename === 'string' ? await createSignedUrl(`media/${doc.filename}`, expiresIn) : null,
}
```

`createSignedUrl` stands for your storage SDK. Storage adapters such as [`@seshuk/payload-storage-bunny`](https://github.com/maximseshuk/payload-storage-bunny) can use the same hooks: `mimeTypes: ['video/*', 'audio/*']` to show their player in the edit view, and `signUrl` for token-authenticated storage URLs.

### Registering Adapters

```ts
mediaPreview({
  adapters: [videoAdapter], // global adapters
  collections: {
    media: {
      adapters: [externalPreview], // per-collection adapters
    },
  },
})
```

A collection uses its own `adapters` when it sets them, and the global `adapters` otherwise. It never uses the adapters of another collection.

### How Adapters Work

1. When a document is loaded, the collection's adapters are tried in order
2. Each adapter's `resolve()` function receives `{ doc, url, mimeType }`
3. The first adapter to return a non-null value wins
4. For `inline` results, the `props` are passed to the adapter's `Component`
5. For `newTab` results, clicking the preview opens the URL in a new browser tab
6. If no adapter matches, the default built-in viewer is used

### Built-in Viewer Components

The plugin exports four built-in viewer components that you can use in adapters with `inline` mode:

| Component      | Import Path                                                | Props Type          |
| -------------- | ---------------------------------------------------------- | ------------------- |
| `ImageViewer`  | `@seshuk/payload-plugin-media-preview/client#ImageViewer`  | `ImageViewerProps`  |
| `VideoViewer`  | `@seshuk/payload-plugin-media-preview/client#VideoViewer`  | `VideoViewerProps`  |
| `AudioViewer`  | `@seshuk/payload-plugin-media-preview/client#AudioViewer`  | `AudioViewerProps`  |
| `IframeViewer` | `@seshuk/payload-plugin-media-preview/client#IframeViewer` | `IframeViewerProps` |

### Adapter Props Reference

**`ImageViewerProps`**

| Prop        | Type     | Required |
| ----------- | -------- | -------- |
| `src`       | `string` | Yes      |
| `alt`       | `string` | No       |
| `className` | `string` | No       |

**`VideoViewerProps`**

| Prop        | Type                             | Required |
| ----------- | -------------------------------- | -------- |
| `src`       | `string`                         | Yes      |
| `mimeType`  | `string`                         | No       |
| `title`     | `string`                         | No       |
| `controls`  | `boolean`                        | No       |
| `autoPlay`  | `boolean`                        | No       |
| `loop`      | `boolean`                        | No       |
| `muted`     | `boolean`                        | No       |
| `preload`   | `'auto' \| 'metadata' \| 'none'` | No       |
| `className` | `string`                         | No       |

**`AudioViewerProps`**

| Prop        | Type                             | Required |
| ----------- | -------------------------------- | -------- |
| `src`       | `string`                         | Yes      |
| `mimeType`  | `string`                         | No       |
| `title`     | `string`                         | No       |
| `controls`  | `boolean`                        | No       |
| `autoPlay`  | `boolean`                        | No       |
| `loop`      | `boolean`                        | No       |
| `muted`     | `boolean`                        | No       |
| `preload`   | `'auto' \| 'metadata' \| 'none'` | No       |
| `className` | `string`                         | No       |

**`IframeViewerProps`**

| Prop              | Type                | Required |
| ----------------- | ------------------- | -------- |
| `src`             | `string`            | Yes      |
| `title`           | `string`            | No       |
| `allow`           | `string`            | No       |
| `allowFullScreen` | `boolean`           | No       |
| `loading`         | `'eager' \| 'lazy'` | No       |
| `className`       | `string`            | No       |

## Standalone Field

The plugin automatically injects the preview field into configured collections. The field only adds the list view column. If you need more control over its placement, you can add the field manually using `mediaPreviewField()`.

### With `field: false`

Use `field: false` in the collection config to register adapters without injecting the field. This lets you place the field manually while keeping all adapter and translation registration. The edit view preview is still registered:

```ts
import type { MediaPreviewAdapter } from '@seshuk/payload-plugin-media-preview'
import { mediaPreview, mediaPreviewField } from '@seshuk/payload-plugin-media-preview'

const videoAdapter: MediaPreviewAdapter = {
  name: 'video-embed',
  Component: 'my-pkg/client#VideoPlayer',
  resolve: ({ doc }) => {
    if (!doc.videoId) return null
    return { mode: 'inline', props: { videoId: doc.videoId } }
  },
}

export default buildConfig({
  collections: [
    {
      slug: 'media',
      upload: true,
      fields: [
        { name: 'alt', type: 'text' },
        mediaPreviewField({
          adapterNames: ['video-embed'],
          mode: 'fullscreen',
        }),
        { name: 'caption', type: 'textarea' },
      ],
    },
  ],
  plugins: [
    mediaPreview({
      collections: {
        media: {
          adapters: [videoAdapter],
          field: false, // don't inject — already added manually above
        },
      },
    }),
  ],
})
```

### Without collection registration

If you don't need per-collection adapters, you can omit the collection from the plugin config entirely and use global adapters:

```ts
import { mediaPreview, mediaPreviewField } from '@seshuk/payload-plugin-media-preview'

export default buildConfig({
  collections: [
    {
      slug: 'media',
      upload: true,
      fields: [{ name: 'alt', type: 'text' }, mediaPreviewField({ mode: 'fullscreen' })],
    },
  ],
  plugins: [
    mediaPreview({
      collections: {},
    }),
  ],
})
```

The plugin must still be included to register viewer components and translations. Collections that are not listed get no edit view preview. Pass `adapterNames` to `mediaPreviewField()` to choose adapters. Those adapters must be registered via the plugin's `adapters` (global) or collection `adapters` config. Without `adapterNames`, the cell tries all registered adapters.

The list view only loads the fields of its visible columns. For collections listed in the plugin config, the plugin loads the whole document when the preview column is visible, so the cell has the file data and every field your adapters read. Unlisted collections don't get this, so their preview cell can show `—`. List them with `field: false` to keep it working.

## Internationalization

The plugin includes translations for 44 locales. Translations are automatically merged into your Payload i18n configuration under the `@seshuk/payload-plugin-media-preview` namespace.

Supported locales: `ar`, `az`, `bg`, `bn` (BD/IN), `ca`, `cs`, `da`, `de`, `en`, `es`, `et`, `fa`, `fr`, `he`, `hr`, `hu`, `hy`, `id`, `is`, `it`, `ja`, `ko`, `lt`, `lv`, `my`, `nb`, `nl`, `pl`, `pt`, `ro`, `rs` (Cyrillic/Latin), `ru`, `sk`, `sl`, `sv`, `ta`, `th`, `tr`, `uk`, `vi`, `zh`, `zhTw`.

## Exports

The package provides three entry points:

| Entry Point                                   | Description                                            | Usage                     |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------- |
| `@seshuk/payload-plugin-media-preview`        | Plugin function and all public types                   | Server-side config        |
| `@seshuk/payload-plugin-media-preview/client` | Viewer components (Image, Video, Audio, Iframe)        | `'use client'` components |
| `@seshuk/payload-plugin-media-preview/rsc`    | Server components (MediaPreviewCell, MediaPreviewFile) | React Server Components   |

## TypeScript

All types are exported from the main entry point:

```ts
import type {
  AudioViewerProps,
  IframeViewerProps,
  ImageViewerProps,
  InsertPosition,
  MediaPreviewAdapter,
  MediaPreviewAdapterInlineResult,
  MediaPreviewAdapterNewTabResult,
  MediaPreviewAdapterResolveArgs,
  MediaPreviewAdapterResolveResult,
  MediaPreviewAdapterSignUrlArgs,
  MediaPreviewCollectionConfig,
  MediaPreviewContentMode,
  MediaPreviewContentModeType,
  MediaPreviewContentType,
  MediaPreviewExternalViewer,
  MediaPreviewFieldConfig,
  MediaPreviewFieldOptions,
  MediaPreviewMode,
  MediaPreviewPlugin,
  MediaPreviewPluginConfig,
  VideoViewerProps,
} from '@seshuk/payload-plugin-media-preview'
```

## Breaking Changes in 2.0

- The edit view preview button and its `Field` component are removed. The edit view now uses Payload's `upload.admin.components.filePreview`. See [Edit View](#edit-view).
- `mediaPreviewField()` only adds the list view column. `mode`, `contentMode` and `field` options apply to the list cell only.
- PDF and text files no longer use the Google viewer. PDF uses the browser viewer, text is rendered by the plugin.
- External viewers (Microsoft, Google) are off by default. Set `externalViewer` to turn them on.
- `contentMode: { document: 'newTab' }` opens the file URL, not the external viewer.
- Removed exports: `MediaPreview` from `/rsc` and `MediaPreviewFieldClient` from `/client`. `/rsc` now exports `MediaPreviewFile`.
- Run `payload generate:importmap` after upgrading.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Plugins

- **[@seshuk/payload-storage-bunny](https://github.com/maximseshuk/payload-storage-bunny)** — Bunny.net storage adapter for Payload CMS

## Support

- **Bug Reports**: [GitHub Issues](https://github.com/maximseshuk/payload-plugin-media-preview/issues)
- **Questions**: Join the payload-plugin-media-preview in [GitHub Issues](https://github.com/maximseshuk/payload-plugin-media-preview/issues) or [Payload CMS Discord](https://discord.gg/payloadcms)

## Credits

Built with ❤️ for the Payload CMS community.

If you find this plugin useful, [buy me a coffee](https://ko-fi.com/V7V61UCT39).
