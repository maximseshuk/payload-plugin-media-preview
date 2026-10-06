import type { InsertPosition as FieldPosition } from '@seshuk/payload-plugin-tooling/fields'
import type { Payload, PayloadRequest, Plugin, UIField, UploadCollectionSlug, User } from 'payload'

export type InsertPosition = Exclude<FieldPosition, 'sidebar'>

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
   * The logged-in user in the edit view.
   * Always `undefined` in the list cell, because Payload doesn't pass the user to cells.
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

/** Adapters run in order. The first non-null `resolve()` result wins. */
export type MediaPreviewAdapter = {
  /**
   * Import path for the viewer component (e.g. `'my-pkg/client#Player'`).
   * Only needed when `resolve()` can return `mode: 'inline'`.
   */
  Component?: string
  /**
   * MIME types this adapter shows in the edit view, e.g. `['video/*', 'audio/*']`.
   * If `resolve()` returns `null` for a file, the default player shows it.
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
   * Return a short-lived public URL of the file for the external viewers (Microsoft, Google),
   * e.g. a CDN URL with a token. The first adapter that returns a public URL wins.
   * Return `null` to try the next adapter. If none returns a URL, the plugin uses the public file URL
   * or its own signed URL.
   */
  signUrl?: (args: MediaPreviewAdapterSignUrlArgs) => null | Promise<null | string> | string
}

/**
 * Opens documents in an external viewer: Microsoft for Office files, Google for psd, xps, dxf,
 * pages and postscript files.
 *
 * The file leaves your server. Microsoft and Google download it and may keep a copy for about a day.
 *
 * - `false` (default) — never send files out, show the download card instead.
 * - `true` — turn on both viewers.
 * - `{ office?, google?, expiresIn? }` — turn on only the viewers set to `true`.
 */
export type MediaPreviewExternalViewer =
  | {
      /**
       * Lifetime of the signed URL the viewer gets, in seconds.
       * Used for the plugin's own signed URLs and passed to adapter `signUrl`.
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

/** `'auto'` picks the view by device. `'fullscreen'` always uses a fullscreen modal. */
export type MediaPreviewMode = 'auto' | 'fullscreen'

/**
 * How each content type opens.
 *
 * - `'inline'` — show the file in the preview modal.
 * - `'newTab'` — open the file in a new browser tab.
 *
 * @default 'inline' for all content types
 */
export type MediaPreviewContentMode = Record<MediaPreviewContentType, MediaPreviewContentModeType>

/** The list view preview column. */
export type MediaPreviewFieldConfig = {
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
   * Payload UI field overrides. You can't change `name` or `type`.
   * `admin.components` is merged, so the plugin `Cell` stays unless you set your own.
   */
  overrides?: Partial<Omit<UIField, 'name' | 'type'>>
  /**
   * Where the plugin puts the field. This sets the column order.
   * Ignored by `mediaPreviewField()`.
   * @default 'last'
   */
  position?: InsertPosition
}

export type MediaPreviewCollectionConfig = {
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
  field?: boolean | MediaPreviewFieldConfig
  /**
   * Shows the plugin preview at the top of the edit view for files Payload can't show.
   * Uses `upload.admin.components.filePreview`.
   * @default true
   */
  filePreview?: boolean
}

export type MediaPreviewPluginConfig = {
  /** Adapters available to all collections. */
  adapters?: MediaPreviewAdapter[]
  /** Upload collections to preview, by slug. `true` for defaults, an object to customize, `false` to skip. */
  collections: Partial<Record<UploadCollectionSlug, boolean | MediaPreviewCollectionConfig>>
  /** @default true */
  enabled?: boolean
  /** @default false */
  externalViewer?: MediaPreviewExternalViewer
  /**
   * Anonymous usage telemetry: plugin, Payload and Node versions and the features in use. On by default.
   * It never sends secrets, IP addresses, keys, file names, URLs or collection names.
   * The first run logs a notice.
   *
   * Off when `payload.config.telemetry` is `false`, when `DO_NOT_TRACK` or `MEDIA_PREVIEW_TELEMETRY_DISABLED`
   * is set, in CI or with `NODE_ENV=test`. Set `false` to turn it off. Pass `{ url }` to use your own collector.
   *
   * @see https://github.com/maximseshuk/payload-plugin-media-preview#telemetry
   * @default true
   */
  telemetry?:
    | boolean
    | {
        /**
         * Collector URL that receives the telemetry report.
         * @default the plugin's public collector
         */
        url?: string
      }
}

export type MediaPreviewPlugin = (options: MediaPreviewPluginConfig) => Plugin
