'use client'

import { Button, useTranslation } from '@payloadcms/ui'
import { DownloadIcon } from '@payloadcms/ui/icons/Download'
import { NewTabIcon } from '@payloadcms/ui/icons/NewTab'
import React from 'react'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/shared/translations/index.js'

type Props = {
  filename?: string
  url: string
}

export const FileActions: React.FC<Props> = ({ filename, url }) => {
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
