import type { Plugin, UIField, UploadCollectionSlug } from 'payload'

// Viewer component props

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

// Adapter

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

/** Adapters are tried in order — first non-null `resolve()` result wins. */
export type MediaPreviewAdapter = {
  /**
   * Import path for the viewer component (e.g. `'my-pkg/client#Player'`).
   * Only needed when `resolve()` can return `mode: 'inline'`.
   */
  Component?: string
  name: string
  /**
   * Decide how to preview a document.
   *
   * - Return `{ mode: 'inline', props }` to render `Component` in a modal.
   * - Return `{ mode: 'newTab', url }` to open a link in a new tab.
   * - Return `null` to skip this adapter.
   */
  resolve: (args: MediaPreviewAdapterResolveArgs) => MediaPreviewAdapterResolveResult | null
}

// Field position

export type InsertPosition =
  | 'first'
  | 'last'
  | { after: string; before?: never }
  | { after?: never; before: string }

// Content mode

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

// Collection config

export type MediaPreviewFieldConfig = {
  /** Payload UI field overrides (`name` and `type` cannot be changed). */
  overrides?: Partial<Omit<UIField, 'name' | 'type'>>
  /** @default 'last' */
  position?: InsertPosition
}

export type MediaPreviewCollectionConfig = {
  /** Overrides global adapters when set. */
  adapters?: MediaPreviewAdapter[]
  contentMode?: Partial<MediaPreviewContentMode>
  /**
   * Controls field injection into the collection.
   *
   * - Omit or pass `{}` to inject with defaults.
   * - Pass `{ position, overrides }` to customize the injected field.
   * - Set to `false` to skip injection (for manual placement via `mediaPreviewField()`).
   */
  field?: false | MediaPreviewFieldConfig
  /**
   * Preview display mode.
   *
   * - `'auto'` — popup in cell (desktop), fullscreen in field and on mobile.
   * - `'fullscreen'` — always fullscreen modal.
   * @default 'auto'
   */
  mode?: MediaPreviewMode
}

// Plugin config

export type MediaPreviewPluginConfig = {
  /** Adapters available to all collections. */
  adapters?: MediaPreviewAdapter[]
  /** Use `true` for defaults or an object for fine-tuning. */
  collections: Partial<Record<UploadCollectionSlug, MediaPreviewCollectionConfig | true>>
  /** @default true */
  enabled?: boolean
}

export type MediaPreviewPlugin = (pluginConfig: MediaPreviewPluginConfig) => Plugin

// Internal props

export type MediaPreviewFieldProps = {
  adapterNames?: string[]
  contentMode?: Partial<MediaPreviewContentMode>
  mode?: MediaPreviewMode
}
