'use client'

import React, { useMemo } from 'react'

import { AudioViewer } from './AudioViewer.js'
import { IframeViewer } from './IframeViewer.js'
import { ImageViewer } from './ImageViewer.js'
import { VideoViewer } from './VideoViewer.js'

type ViewerProps = {
  className?: string
  media: {
    documentViewerUrl?: null | string
    mimeType?: string
    url?: string
  }
  title?: string
}

export const MediaPreviewViewer: React.FC<ViewerProps> = ({ className, media, title }) => {
  const { documentViewerUrl, mimeType, url } = media

  const isAudio = useMemo(() => mimeType?.startsWith('audio/'), [mimeType])
  const isVideo = useMemo(() => mimeType?.startsWith('video/'), [mimeType])
  const isImage = useMemo(() => mimeType?.startsWith('image/'), [mimeType])

  if (isAudio && url) {
    return <AudioViewer className={className} mimeType={mimeType} src={url} title={title} />
  }

  if (isVideo && url) {
    return <VideoViewer className={className} mimeType={mimeType} src={url} title={title} />
  }

  if (isImage && url) {
    return <ImageViewer alt={title || 'Image preview'} className={className} src={url} />
  }

  if (documentViewerUrl) {
    return <IframeViewer className={className} src={documentViewerUrl} title={title || 'Document preview'} />
  }

  return null
}
