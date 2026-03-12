# Media Preview Plugin for Payload CMS

[![GitHub Release](https://img.shields.io/github/v/release/maximseshuk/payload-plugin-media-preview.svg)](https://github.com/maximseshuk/payload-plugin-media-preview/releases/) [![npm](https://img.shields.io/badge/npm-blue.svg)](https://www.npmjs.com/package/@seshuk/payload-media-preview) [![license](https://img.shields.io/badge/license-grey.svg)](https://github.com/maximseshuk/payload-plugin-media-preview/blob/main/LICENSE) [![NPM Downloads](https://img.shields.io/npm/dm/@seshuk/payload-media-preview)](https://www.npmjs.com/package/@seshuk/payload-media-preview) [![Ko-fi](https://img.shields.io/badge/Ko--fi-Buy_me_a_coffee-ff5f5f?logo=ko-fi)](https://ko-fi.com/V7V61UCT39)

Preview images, videos, audio, and documents directly in the Payload CMS admin panel.

## Features

- Inline previews in list view cells and edit view fields
- Popup previews on desktop, fullscreen modals on mobile
- Built-in viewers for images, video, audio, and documents (PDF, Office, etc.)
- Extensible adapter system for custom viewers
- Zero database fields — works as a virtual UI field

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
- [Adapters](#adapters)
- [Standalone Field](#standalone-field)
- [Internationalization](#internationalization)
- [Exports](#exports)
- [TypeScript](#typescript)
- [License](#license)

## Requirements

- Payload `^3.53.0`
- Node.js `^18.20.2 || >=20.9.0`

## Installation

```bash
pnpm add @seshuk/payload-media-preview
# or
npm install @seshuk/payload-media-preview
# or
yarn add @seshuk/payload-media-preview
```

## Quick Start

```ts
import { mediaPreview } from '@seshuk/payload-media-preview'
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

This adds a preview column to your `media` collection's list view and a preview button to the edit view.

## Configuration

### Plugin Config

| Option        | Type                                       | Default | Description                                  |
| ------------- | ------------------------------------------ | ------- | -------------------------------------------- |
| `enabled`     | `boolean`                                  | `true`  | Enable or disable the plugin                 |
| `adapters`    | `MediaPreviewAdapter[]`                    | `[]`    | Global adapters available to all collections |
| `collections` | `Record<string, CollectionConfig \| true>` | —       | Which upload collections to add preview to   |

### Collection Config

Each collection entry can be `true` (all defaults) or an object:

| Option        | Type                                 | Default    | Description                                                       |
| ------------- | ------------------------------------ | ---------- | ----------------------------------------------------------------- |
| `mode`        | `'auto' \| 'fullscreen'`             | `'auto'`   | Preview display mode                                              |
| `contentMode` | `Partial<MediaPreviewContentMode>`   | all inline | How to open each content type (`'inline'` or `'newTab'`)          |
| `adapters`    | `MediaPreviewAdapter[]`              | —          | Per-collection adapters (override global)                         |
| `field`       | `false \| { position?, overrides? }` | `{}`       | Field injection config, or `false` to skip (for manual placement) |

**`field` options:**

| Option      | Type                                       | Default  | Description                                                      |
| ----------- | ------------------------------------------ | -------- | ---------------------------------------------------------------- |
| `position`  | `'first' \| 'last' \| { after \| before }` | `'last'` | Where to insert the preview field                                |
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

The `mode` option controls how previews are displayed:

#### `'auto'` (default)

Smart mode that adapts to context and device:

| Context           | Desktop                      | Mobile           |
| ----------------- | ---------------------------- | ---------------- |
| Cell (list view)  | Floating popup near the cell | Fullscreen modal |
| Field (edit view) | Fullscreen modal             | Fullscreen modal |

#### `'fullscreen'`

Always uses a fullscreen modal, regardless of context or device.

```ts
collections: {
  media: {
    mode: 'fullscreen',
  },
}
```

### Content Modes

Control how each content type is opened with the `contentMode` option. Each content type can be set to `'inline'` (default) or `'newTab'`:

| Mode       | Behavior                          |
| ---------- | --------------------------------- |
| `'inline'` | Show content in modal preview     |
| `'newTab'` | Open content in a new browser tab |

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

Control where the preview field appears in the edit view with the `field.position` option:

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

Dot-notation paths are supported for fields inside named tabs and nested groups:

```ts
// After a field inside a tab
field: {
  position: {
    after: 'myTab.fieldName'
  }
}
```

### Supported File Types

#### Images

All `image/*` MIME types — displayed using the native `<img>` element.

#### Video

All `video/*` MIME types — displayed using the native `<video>` element with controls.

#### Audio

All `audio/*` MIME types — displayed using the native `<audio>` element with controls.

#### Documents

Documents are previewed via external viewer services:

**Microsoft Office Online Viewer** — for Office formats:

- `.doc`, `.docx` (Word)
- `.xls`, `.xlsx` (Excel)
- `.ppt`, `.pptx` (PowerPoint)

**Google Docs Viewer** — for other document types:

- `.pdf`
- `.txt`, `.css`, `.html`, `.js`, `.php`, `.c`, `.cpp`
- `.pages` (Apple Pages)
- `.ai`, `.eps`, `.ps` (PostScript)
- `.psd` (Photoshop)
- `.dxf` (AutoCAD)
- `.svg`
- `.xps`

> **Note:** Document previews use external services (Google Docs Viewer, Microsoft Office Online) that fetch files by URL. This only works when your media URLs are publicly accessible. Google Docs Viewer also has a 25 MB file size limit.

## Adapters

Adapters let you customize how files are previewed. When an adapter matches a document, it takes priority over built-in viewers and `contentMode` settings.

Each adapter has a `resolve()` function that returns one of two modes:

- `{ mode: 'inline', props }` — renders a custom component inside the modal preview
- `{ mode: 'newTab', url }` — opens a link in a new browser tab

The `Component` field is only needed for `inline` mode. Adapters that only use `newTab` mode don't need a component.

### Examples

```ts
import type { IframeViewerProps, MediaPreviewAdapter } from '@seshuk/payload-media-preview'

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
  Component: '@seshuk/payload-media-preview/client#IframeViewer',
  resolve: ({ url }) => {
    if (!url) return null
    return {
      mode: 'inline',
      props: { src: url, allowFullScreen: true } satisfies IframeViewerProps,
    }
  },
}
```

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

### How Adapters Work

1. When a document is loaded, all registered adapters are tried in order
2. Each adapter's `resolve()` function receives `{ doc, url, mimeType }`
3. The first adapter to return a non-null value wins
4. For `inline` results, the `props` are passed to the adapter's `Component`
5. For `newTab` results, clicking the preview opens the URL in a new browser tab
6. If no adapter matches, the default built-in viewer is used

### Built-in Viewer Components

The plugin exports four built-in viewer components that you can use in adapters with `inline` mode:

| Component      | Import Path                                         | Props Type          |
| -------------- | --------------------------------------------------- | ------------------- |
| `ImageViewer`  | `@seshuk/payload-media-preview/client#ImageViewer`  | `ImageViewerProps`  |
| `VideoViewer`  | `@seshuk/payload-media-preview/client#VideoViewer`  | `VideoViewerProps`  |
| `AudioViewer`  | `@seshuk/payload-media-preview/client#AudioViewer`  | `AudioViewerProps`  |
| `IframeViewer` | `@seshuk/payload-media-preview/client#IframeViewer` | `IframeViewerProps` |

### Adapter Props Reference

`**ImageViewerProps**`

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

The plugin automatically injects the preview field into configured collections. If you need more control over field placement, you can add the field manually using `mediaPreviewField()`.

### With `field: false`

Use `field: false` in the collection config to register adapters without injecting the field. This lets you place the field manually while keeping all adapter and translation registration:

```ts
import type { MediaPreviewAdapter } from '@seshuk/payload-media-preview'
import { mediaPreview, mediaPreviewField } from '@seshuk/payload-media-preview'

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
import { mediaPreview, mediaPreviewField } from '@seshuk/payload-media-preview'

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

The plugin must still be included to register viewer components and translations. Pass `adapterNames` to `mediaPreviewField()` to use adapters — those adapters must be registered via the plugin's `adapters` (global) or collection `adapters` config.

## Internationalization

The plugin includes translations for 44 locales. Translations are automatically merged into your Payload i18n configuration under the `@seshuk/payload-media-preview` namespace.

Supported locales: `ar`, `az`, `bg`, `bn` (BD/IN), `ca`, `cs`, `da`, `de`, `en`, `es`, `et`, `fa`, `fi`, `fr`, `he`, `hr`, `hu`, `hy`, `id`, `is`, `it`, `ja`, `ka`, `ko`, `lt`, `lv`, `mk`, `nb`, `nl`, `pl`, `pt`, `ro`, `rs` (Cyrillic/Latin), `ru`, `sk`, `sl`, `sv`, `th`, `tr`, `uk`, `vi`, `zh`, `zhTw`.

## Exports

The package provides three entry points:

| Entry Point                            | Description                                        | Usage                     |
| -------------------------------------- | -------------------------------------------------- | ------------------------- |
| `@seshuk/payload-media-preview`        | Plugin function and all public types               | Server-side config        |
| `@seshuk/payload-media-preview/client` | Client components (Field, Cell, Modal, Viewers)    | `'use client'` components |
| `@seshuk/payload-media-preview/rsc`    | Server components (MediaPreview, MediaPreviewCell) | React Server Components   |

## TypeScript

All types are exported from the main entry point:

```ts
import type {
  MediaPreviewAdapter,
  MediaPreviewAdapterResolveArgs,
  MediaPreviewAdapterInlineResult,
  MediaPreviewAdapterNewTabResult,
  MediaPreviewAdapterResolveResult,
  MediaPreviewCollectionConfig,
  MediaPreviewContentMode,
  MediaPreviewContentModeType,
  MediaPreviewContentType,
  MediaPreviewFieldConfig,
  MediaPreviewMode,
  MediaPreviewPluginConfig,
  InsertPosition,
  ImageViewerProps,
  VideoViewerProps,
  AudioViewerProps,
  IframeViewerProps,
} from '@seshuk/payload-media-preview'
```

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
