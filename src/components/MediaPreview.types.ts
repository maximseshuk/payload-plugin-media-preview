export type FileKind = 'audio' | 'google' | 'image' | 'office' | 'pdf' | 'text' | 'unsupported' | 'video'

export type PreviewHint = 'loadError' | 'noPreview' | 'privateServer' | 'tooLarge'

export type PreviewData = {
  collectionSlug: string
  credentials: 'include' | 'omit'
  external?: boolean
  filename?: string
  filesize?: number
  height?: number
  hint?: PreviewHint
  id?: number | string
  kind: FileKind
  mimeType?: string
  url?: string
  width?: number
}
