'use client'

import { useTranslation } from '@payloadcms/ui'
import React from 'react'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/shared/translations/index.js'
import type { PreviewData } from '@/shared/types/preview.js'

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
          mimeType={mimeType}
          src={url}
          title={t('@seshuk/payload-plugin-media-preview:titleAudio')}
        />
      )
    case 'google':
    case 'office':
      return (
        <ExternalViewer key={`${kind}:${preview.collectionSlug}:${preview.id}:${url}`} kind={kind} preview={preview} />
      )
    case 'image':
      return <ImageViewer alt={t('@seshuk/payload-plugin-media-preview:titleImage')} src={url} />
    case 'pdf':
      return <IframeViewer src={url} title={filename ?? t('@seshuk/payload-plugin-media-preview:titleDocument')} />
    case 'text':
      return <TextViewer key={preview.url} preview={preview} />
    case 'video':
      return (
        <VideoViewer
          autoPlay={!inline}
          mimeType={mimeType}
          src={url}
          title={t('@seshuk/payload-plugin-media-preview:titleVideo')}
        />
      )
    default:
      return <DownloadCard {...preview} hint="errorNoPreview" />
  }
}
