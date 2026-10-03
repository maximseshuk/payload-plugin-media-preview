import type { PayloadRequest, Plugin, UIField, UploadCollectionSlug } from 'payload'

export type VideoViewerProps = {
  autoPlay?: boolean
  className?: string
  controls?: boolean
  loop?: boolean
  mimeType?: string
  muted?: boolean
  preload?: 'auto' | 'metadata' | 'none'
  src: string
  title?: string
}

export type AudioViewerProps = {
  autoPlay?: boolean
  className?: string
  controls?: boolean
  loop?: boolean
  mimeType?: string
  muted?: boolean
  preload?: 'auto' | 'metadata' | 'none'
  src: string
  title?: string
}

export type ImageViewerProps = {
  alt?: string
  className?: string
  src: string
}

export type IframeViewerProps = {
  allow?: string
  allowFullScreen?: boolean
  className?: string
  loading?: 'eager' | 'lazy'
  src: string
  title?: string
}

export type MediaPreviewAdapterResolveArgs = {
  doc: Record<string, unknown>
  mimeType?: string
  url?: string
}

/** Returned by `resolve()` to render the adapter's component inside a modal. */
export type MediaPreviewAdapterInlineResult = {
  mode: 'inline'
  props: Record<string, unknown>
}

/** Returned by `resolve()` to open a URL in a new browser tab. */
export type MediaPreviewAdapterNewTabResult = {
  mode: 'newTab'
  url: string
}

export type MediaPreviewAdapterResolveResult = MediaPreviewAdapterInlineResult | MediaPreviewAdapterNewTabResult

export type MediaPreviewAdapterSignUrlArgs = {
  doc: Record<string, unknown>
  /** Lifetime the URL should have, in seconds. */
  expiresIn: number
  req: PayloadRequest
  /** `doc.url` as stored by Payload. */
  url?: string
}

/** Adapters are tried in order — first non-null `resolve()` result wins. */
export type MediaPreviewAdapter = {
  /**
   * Import path for the viewer component (e.g. `'my-pkg/client#Player'`).
   * Only needed when `resolve()` can return `mode: 'inline'`.
   */
  Component?: string
  /**
   * MIME types this adapter can preview in the edit view upload panel, e.g. `['video/*', 'audio/*']`.
   * The plugin registers its panel preview for these types. When `resolve()` returns `null`
   * for a file, the panel falls back to the native player.
   */
  mimeTypes?: string[]
  name: string
  /**
   * Decide how to preview a document.
   *
   * - Return `{ mode: 'inline', props }` to render `Component` in a modal.
   * - Return `{ mode: 'newTab', url }` to open a link in a new tab.
   * - Return `null` to skip this adapter.
   */
  resolve: (args: MediaPreviewAdapterResolveArgs) => MediaPreviewAdapterResolveResult | null
  /**
   * Return a public, short-lived URL of the file for an external viewer (Microsoft, Google),
   * e.g. a CDN URL with token auth. Return `null` to let the plugin decide.
   * The first adapter that returns a URL wins over the plugin's own signed URL.
   */
  signUrl?: (args: MediaPreviewAdapterSignUrlArgs) => null | Promise<null | string> | string
}

/**
 * Sends documents to an external viewer: Microsoft for Office files, Google for rare formats
 * (psd, xps, dxf, pages, postscript).
 *
 * The file leaves your server: Microsoft and Google download it and may cache it for about a day.
 *
 * - `false` (default) — never send files out, show a download card instead.
 * - `true` — turn on both viewers.
 * - `{ office?, google?, expiresIn? }` — turn on only the viewers set to `true`.
 */
export type MediaPreviewExternalViewer =
  | {
      /**
       * Lifetime of the signed file URL the plugin gives to the viewer, in seconds.
       * Used only when Payload serves the file itself (access control on).
       * @default 600
       */
      expiresIn?: number
      /** Google viewer for psd, xps, dxf, pages and postscript files. */
      google?: boolean
      /** Microsoft viewer for doc, docx, xls, xlsx, ppt and pptx files. */
      office?: boolean
    }
  | boolean

export type InsertPosition = 'first' | 'last' | { after: string; before?: never } | { after?: never; before: string }

export type MediaPreviewContentType = 'audio' | 'document' | 'image' | 'video'
export type MediaPreviewContentModeType = 'inline' | 'newTab'

/** `'auto'` adapts to context and device, `'fullscreen'` always uses a modal. */
export type MediaPreviewMode = 'auto' | 'fullscreen'

/**
 * Controls how each content type is opened.
 *
 * - `'inline'` — show content in a modal preview.
 * - `'newTab'` — open content in a new browser tab.
 *
 * @default 'inline' for all content types
 */
export type MediaPreviewContentMode = Record<MediaPreviewContentType, MediaPreviewContentModeType>

export type MediaPreviewFieldConfig = {
  /** Payload UI field overrides (`name` and `type` cannot be changed). */
  overrides?: Partial<Omit<UIField, 'name' | 'type'>>
  /**
   * Position in the fields list, which sets the column order in the list view.
   * @default 'last'
   */
  position?: InsertPosition
}

export type MediaPreviewCollectionConfig = {
  /** Overrides global adapters when set. */
  adapters?: MediaPreviewAdapter[]
  /** How the list view cell opens each content type. */
  contentMode?: Partial<MediaPreviewContentMode>
  /** Overrides the global `externalViewer` when set. */
  externalViewer?: MediaPreviewExternalViewer
  /**
   * Controls the list view preview column.
   *
   * - Omit or pass `{}` to inject with defaults.
   * - Pass `{ position, overrides }` to customize the injected field.
   * - Set to `false` to skip injection (for manual placement via `mediaPreviewField()`).
   */
  field?: false | MediaPreviewFieldConfig
  /**
   * Adds the plugin preview to the edit view upload panel (`upload.admin.components.filePreview`)
   * for file types Payload does not preview itself.
   * @default true
   */
  filePreview?: boolean
  /**
   * List view preview display mode.
   *
   * - `'auto'` — popup on desktop, fullscreen on mobile.
   * - `'fullscreen'` — always fullscreen modal.
   * @default 'auto'
   */
  mode?: MediaPreviewMode
}

export type MediaPreviewPluginConfig = {
  /** Adapters available to all collections. */
  adapters?: MediaPreviewAdapter[]
  /** Use `true` for defaults or an object for fine-tuning. */
  collections: Partial<Record<UploadCollectionSlug, MediaPreviewCollectionConfig | true>>
  /** @default true */
  enabled?: boolean
  /** @default false */
  externalViewer?: MediaPreviewExternalViewer
}

export type MediaPreviewPlugin = (pluginConfig: MediaPreviewPluginConfig) => Plugin

export type MediaPreviewFieldProps = {
  adapterNames?: string[]
  contentMode?: Partial<MediaPreviewContentMode>
  mode?: MediaPreviewMode
}
