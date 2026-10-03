import type { InsertPosition } from '@seshuk/payload-plugin-tooling/fields'
import type { Payload, PayloadRequest, Plugin, UIField, UploadCollectionSlug, User } from 'payload'

export type { InsertPosition } from '@seshuk/payload-plugin-tooling/fields'

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
  /** Slug of the upload collection the document belongs to. */
  collectionSlug: string
  doc: Record<string, unknown>
  mimeType?: string
  payload: Payload
  url?: string
  /**
   * The logged-in user in the edit view upload panel.
   * Always `undefined` in the list view cell, because Payload does not pass the user to cells.
   */
  user?: User
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
   *
   * May be async, for example to presign a `newTab` URL.
   */
  resolve: (
    args: MediaPreviewAdapterResolveArgs,
  ) => MediaPreviewAdapterResolveResult | null | Promise<MediaPreviewAdapterResolveResult | null>
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

/** The list view preview column. */
export type MediaPreviewFieldOptions = {
  /** How the cell opens each content type. */
  contentMode?: Partial<MediaPreviewContentMode>
  /**
   * Preview display mode.
   *
   * - `'auto'` — popup on desktop, fullscreen on mobile.
   * - `'fullscreen'` — always fullscreen modal.
   * @default 'auto'
   */
  mode?: MediaPreviewMode
  /**
   * Payload UI field overrides (`name` and `type` cannot be changed).
   * `admin.components` is merged with the plugin's, so the plugin `Cell` stays unless you set your own `Cell`.
   */
  overrides?: Partial<Omit<UIField, 'name' | 'type'>>
  /**
   * Where the plugin puts the column in the fields list, which sets the column order.
   * Ignored by `mediaPreviewField()`.
   * @default 'last'
   */
  position?: InsertPosition
}

export type MediaPreviewCollectionOptions = {
  /** Overrides global adapters when set. */
  adapters?: MediaPreviewAdapter[]
  /** Overrides the global `externalViewer` when set. */
  externalViewer?: MediaPreviewExternalViewer
  /**
   * The list view preview column.
   *
   * - `true` or omitted — add the column with defaults.
   * - `{ position, overrides, mode, contentMode }` — add the column and customize it.
   * - `false` — no column (place it by hand with `mediaPreviewField()`).
   * @default true
   */
  field?: boolean | MediaPreviewFieldOptions
  /**
   * Adds the plugin preview to the edit view upload panel (`upload.admin.components.filePreview`)
   * for file types Payload does not preview itself.
   * @default true
   */
  filePreview?: boolean
}

export type MediaPreviewPluginOptions = {
  /** Adapters available to all collections. */
  adapters?: MediaPreviewAdapter[]
  /** Upload collections to preview, by slug. `true` for defaults, an object to customize, `false` to skip. */
  collections: Partial<Record<UploadCollectionSlug, boolean | MediaPreviewCollectionOptions>>
  /** @default true */
  enabled?: boolean
  /** @default false */
  externalViewer?: MediaPreviewExternalViewer
}

export type MediaPreviewPlugin = (options: MediaPreviewPluginOptions) => Plugin
