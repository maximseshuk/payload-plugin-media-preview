'use client'

import { Button, useTranslation } from '@payloadcms/ui'
import { DocumentIcon } from '@payloadcms/ui/icons/Document'
import { DownloadIcon } from '@payloadcms/ui/icons/Download'
import { NewTabIcon } from '@payloadcms/ui/icons/NewTab'
import { formatFilesize } from 'payload/shared'
import React from 'react'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/shared/translations/index.js'
import type { PreviewHint } from '@/shared/types/preview.js'

type Props = {
  filename?: string
  filesize?: number
  hint?: PreviewHint
  mimeType?: string
  url?: string
}

export const DownloadCard: React.FC<Props> = ({ filename, filesize, hint, mimeType, url }) => {
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()
  const meta = [typeof filesize === 'number' ? formatFilesize(filesize) : null, mimeType].filter(Boolean).join(' · ')

  return (
    <div className="media-preview-card">
      <DocumentIcon className="media-preview-card__icon" />
      {filename && <p className="media-preview-card__name">{filename}</p>}
      {meta && <p className="media-preview-card__meta">{meta}</p>}
      {hint && <p className="media-preview-card__hint">{t(`@seshuk/payload-plugin-media-preview:${hint}`)}</p>}
      {url && <FileActions filename={filename} url={url} />}
    </div>
  )
}

export const FileActions: React.FC<{ filename?: string; url: string }> = ({ filename, url }) => {
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()

  return (
    <div className="media-preview-actions">
      <Button
        buttonStyle="secondary"
        el="anchor"
        extraButtonProps={{ download: filename ?? true }}
        icon={<DownloadIcon />}
        iconPosition="left"
        margin={false}
        size="medium"
        url={url}
      >
        {t('upload:download')}
      </Button>
      <Button
        buttonStyle="secondary"
        el="anchor"
        icon={<NewTabIcon />}
        iconPosition="left"
        margin={false}
        newTab
        size="medium"
        url={url}
      >
        {t('@seshuk/payload-plugin-media-preview:open')}
      </Button>
    </div>
  )
}
