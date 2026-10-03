'use client'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/translations/index.js'

import { useTranslation } from '@payloadcms/ui'
import React from 'react'

import type { PreviewData } from '../MediaPreview.types.js'

import { AudioViewer } from './AudioViewer.js'
import { DownloadCard } from './DownloadCard.js'
import { ExternalViewer } from './ExternalViewer.js'
import { IframeViewer } from './IframeViewer.js'
import { ImageViewer } from './ImageViewer.js'
import { TextViewer } from './TextViewer.js'
import { VideoViewer } from './VideoViewer.js'
import './Viewer.css'

type ViewerProps = {
  inline?: boolean
  preview: PreviewData
}

export const MediaPreviewViewer: React.FC<ViewerProps> = ({ inline, preview }) => {
  const { filename, hint, kind, mimeType, url } = preview
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()

  if (!url || hint) {
    return <DownloadCard {...preview} hint={hint} />
  }

  switch (kind) {
    case 'audio':
      return (
        <AudioViewer
          autoPlay={!inline}
          className="media-preview-viewer__audio"
          mimeType={mimeType}
          src={url}
          title={t('@seshuk/payload-plugin-media-preview:titleAudio')}
        />
      )
    case 'google':
    case 'office':
      return <ExternalViewer kind={kind} preview={preview} />
    case 'image':
      return (
        <ImageViewer
          alt={t('@seshuk/payload-plugin-media-preview:titleImage')}
          className="media-preview-viewer__media"
          src={url}
        />
      )
    case 'pdf':
      return (
        <IframeViewer
          className="media-preview-viewer__frame"
          src={url}
          title={filename ?? t('@seshuk/payload-plugin-media-preview:titleDocument')}
        />
      )
    case 'text':
      return <TextViewer preview={preview} />
    case 'video':
      return (
        <VideoViewer
          autoPlay={!inline}
          className="media-preview-viewer__media"
          mimeType={mimeType}
          src={url}
          title={t('@seshuk/payload-plugin-media-preview:titleVideo')}
        />
      )
    default:
      return <DownloadCard {...preview} hint="noPreview" />
  }
}
