import type { MediaPreviewContentType } from '@/shared/types/index.js'
import type { FileKind } from '@/shared/types/preview.js'

import {
  CODE_LANGUAGES,
  GOOGLE_VIEWER_TYPES,
  MICROSOFT_OFFICE_TYPES,
  TEXT_EXTENSIONS,
  TEXT_TYPES,
} from './constants.js'

export const getExtension = (filename = ''): string => {
  const name = filename.toLowerCase()
  return /^\.?env(\.|$)/.test(name) ? 'env' : name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
}

export const getFileKind = (mimeType?: string, filename?: string): FileKind => {
  if (!mimeType || mimeType === 'application/octet-stream') {
    return TEXT_EXTENSIONS.includes(getExtension(filename)) ? 'text' : 'unsupported'
  }
  if (MICROSOFT_OFFICE_TYPES.includes(mimeType)) {
    return 'office'
  }
  if (GOOGLE_VIEWER_TYPES.includes(mimeType)) {
    return 'google'
  }
  if (mimeType === 'application/pdf') {
    return 'pdf'
  }
  if (mimeType.startsWith('text/') || TEXT_TYPES.includes(mimeType)) {
    return 'text'
  }
  if (mimeType.startsWith('video/')) {
    return 'video'
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio'
  }
  if (mimeType.startsWith('image/')) {
    return 'image'
  }
  return 'unsupported'
}

export const getContentType = (kind: FileKind): MediaPreviewContentType =>
  kind === 'audio' || kind === 'image' || kind === 'video' ? kind : 'document'

export const getExternalViewerUrl = (kind: 'google' | 'office', fileUrl: string): string =>
  kind === 'office'
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
    : `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`

export const getCodeLanguage = (mimeType?: string, filename?: string): string =>
  CODE_LANGUAGES[mimeType ?? ''] ?? CODE_LANGUAGES[getExtension(filename)] ?? 'plaintext'

export const isCsv = (mimeType?: string, filename?: string): boolean =>
  mimeType === 'text/csv' || getExtension(filename) === 'csv'

export const formatText = (text: string, language: string): string => {
  if (language === 'json') {
    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }
  return text
}

export const parseCsv = (text: string, maxRows = 1000): string[][] => {
  const firstLine = text.split('\n', 1)[0]
  const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length && rows.length < maxRows; i++) {
    const char = text[i]
    if (quoted) {
      if (char !== '"') {
        field += char
      } else if (text[i + 1] === '"') {
        field += '"'
        i++
      } else {
        quoted = false
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') {
        i++
      }
      rows.push([...row, field])
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if ((field || row.length) && rows.length < maxRows) {
    rows.push([...row, field])
  }
  return rows
}

export const readText = async (res: Response, maxBytes: number): Promise<string> => {
  const reader = res.body?.getReader()
  if (!reader) {
    return ''
  }
  const decoder = new TextDecoder()
  let text = ''
  let size = 0
  while (size < maxBytes) {
    const { done, value } = await reader.read()
    if (done) {
      return text + decoder.decode()
    }
    const chunk = value.subarray(0, maxBytes - size)
    size += chunk.byteLength
    text += decoder.decode(chunk, { stream: true })
  }
  reader.cancel().catch(() => {})
  return text
}

export const isPublicUrl = (url?: string): boolean => {
  let host: string
  try {
    const parsed = new URL(url ?? '')
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }
    host = parsed.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, '')
      .replace(/\.$/, '')
  } catch {
    return false
  }

  if (host.includes(':')) {
    return !/^(::|64:ff9b:|f[cd]|fe[89a-f])/.test(host)
  }
  if (!host.includes('.') || /\.(local|localhost|internal)$/.test(host)) {
    return false
  }

  const octets = host.split('.').map(Number)
  if (octets.length !== 4 || !octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    return true
  }
  const [a, b] = octets
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 192 && b === 168)
  )
}

export const isPayloadFileUrl = (args: {
  apiRoute: string
  collectionSlug: string
  serverURL?: string
  url: string
}): boolean => {
  const { apiRoute, collectionSlug, serverURL, url } = args
  let parsed: URL
  try {
    const base = new URL(serverURL || 'http://localhost')
    parsed = new URL(url, base)
    if (parsed.origin !== base.origin || (!serverURL && !url.startsWith('/'))) {
      return false
    }
  } catch {
    return false
  }
  return parsed.pathname.startsWith(`${apiRoute}/${collectionSlug}/file/`)
}
