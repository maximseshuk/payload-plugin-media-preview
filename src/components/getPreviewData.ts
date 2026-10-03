import type { SanitizedConfig } from 'payload'

import { getCollectionAdapters, getPluginData } from '@/settings.js'

import type { PreviewData, PreviewHint } from './MediaPreview.types.js'

import { GOOGLE_VIEWER_MAX_SIZE, MICROSOFT_VIEWER_MAX_SIZE, TEXT_PREVIEW_MAX_SIZE } from './MediaPreview.constants.js'
import { getFileKind, isPayloadFileUrl, isPublicUrl } from './MediaPreview.utils.js'

type FileDoc = {
  filename?: unknown
  filesize?: unknown
  height?: unknown
  id?: unknown
  mimeType?: unknown
  url?: unknown
  width?: unknown
}

type Config = Pick<SanitizedConfig, 'custom' | 'routes' | 'serverURL'>

const str = (value: unknown) => (typeof value === 'string' ? value : undefined)
const num = (value: unknown) => (typeof value === 'number' ? value : undefined)

export const isProxiedFile = (config: Config, collectionSlug: string, url?: string): boolean =>
  !!url && isPayloadFileUrl({ apiRoute: config.routes.api, collectionSlug, serverURL: config.serverURL, url })

export const getExternalViewerHint = (
  config: Config,
  collectionSlug: string,
  doc: FileDoc,
): PreviewHint | undefined => {
  const kind = getFileKind(str(doc.mimeType), str(doc.filename))
  const data = getPluginData(config)
  const settings = data.collections[collectionSlug]
  if ((kind !== 'office' && kind !== 'google') || !settings?.externalViewer || !settings.externalViewer[kind]) {
    return 'noPreview'
  }
  if ((num(doc.filesize) ?? 0) > (kind === 'office' ? MICROSOFT_VIEWER_MAX_SIZE : GOOGLE_VIEWER_MAX_SIZE)) {
    return 'tooLarge'
  }
  const url = str(doc.url)
  const reachable = isProxiedFile(config, collectionSlug, url)
    ? isPublicUrl(config.serverURL) ||
      getCollectionAdapters(data, settings.adapterNames).some((adapter) => adapter.signUrl)
    : isPublicUrl(url)
  return reachable ? undefined : 'privateServer'
}

export const getPreviewData = (config: Config, collectionSlug: string, doc: FileDoc): PreviewData => {
  const url = str(doc.url)
  const kind = getFileKind(str(doc.mimeType), str(doc.filename))
  const data: PreviewData = {
    id: typeof doc.id === 'number' || typeof doc.id === 'string' ? doc.id : undefined,
    collectionSlug,
    credentials: isProxiedFile(config, collectionSlug, url) ? 'include' : 'omit',
    filename: str(doc.filename),
    filesize: num(doc.filesize),
    height: num(doc.height),
    kind,
    mimeType: str(doc.mimeType),
    url,
    width: num(doc.width),
  }

  if (kind === 'office' || kind === 'google') {
    data.hint = getExternalViewerHint(config, collectionSlug, doc)
    data.external = !data.hint
  } else if (kind === 'text' && (data.filesize ?? 0) > TEXT_PREVIEW_MAX_SIZE) {
    data.hint = 'tooLarge'
  } else if (kind === 'unsupported') {
    data.hint = 'noPreview'
  }

  return data
}
