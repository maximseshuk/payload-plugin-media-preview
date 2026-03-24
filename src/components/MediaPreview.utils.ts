import { formatAbsoluteURL } from '@payloadcms/ui/utilities/formatAbsoluteURL'

import type { DocumentViewerType, PreviewType } from './MediaPreview.types.js'

import { GOOGLE_VIEWER_MAX_SIZE, GOOGLE_VIEWER_TYPES, MICROSOFT_OFFICE_TYPES, MICROSOFT_VIEWER_MAX_SIZE } from './MediaPreview.constants.js'

export const getPreviewType = (mimeType?: string): PreviewType => {
  if (!mimeType) {
    return 'unsupported'
  }

  if (MICROSOFT_OFFICE_TYPES.includes(mimeType) || GOOGLE_VIEWER_TYPES.includes(mimeType)) {
    return 'document'
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

export const getDocumentViewerType = (mimeType: string): DocumentViewerType => {
  if (MICROSOFT_OFFICE_TYPES.includes(mimeType)) {
    return 'microsoft'
  }
  return 'google'
}

export const canPreviewDocument = (mimeType: string, fileSize?: number): boolean => {
  if (!fileSize) {
    return true
  }
  const maxSize = MICROSOFT_OFFICE_TYPES.includes(mimeType) ? MICROSOFT_VIEWER_MAX_SIZE : GOOGLE_VIEWER_MAX_SIZE
  return fileSize <= maxSize
}

export const getMicrosoftViewerUrl = (fileUrl: string): string => {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(formatAbsoluteURL(fileUrl))}`
}

export const getGoogleViewerUrl = (fileUrl: string): string => {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(formatAbsoluteURL(fileUrl))}&embedded=true`
}
