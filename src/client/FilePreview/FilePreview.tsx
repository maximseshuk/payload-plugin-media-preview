'use client'

import { Button, useTranslation } from '@payloadcms/ui'
import { ExpandIcon } from '@payloadcms/ui/icons/Expand'
import { NewTabIcon } from '@payloadcms/ui/icons/NewTab'
import React, { useState } from 'react'

import { MediaPreviewModal } from '@/client/Modal/Modal.js'
import { MediaPreviewViewer } from '@/client/Viewer/Viewer.js'
import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/shared/translations/index.js'
import type { PreviewData } from '@/shared/types/preview.js'

import './FilePreview.css'

type Props = {
  adapterNewTabUrl?: string
  customViewer?: React.ReactNode
  preview: PreviewData
}

export const MediaPreviewFileClient: React.FC<Props> = ({ adapterNewTabUrl, customViewer, preview }) => {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()

  if (adapterNewTabUrl) {
    return (
      <div className="media-preview-file">
        <Button
          buttonStyle="secondary"
          el="anchor"
          icon={<NewTabIcon size={16} />}
          iconPosition="left"
          margin={false}
          newTab
          size="medium"
          url={adapterNewTabUrl}
        >
          {t('@seshuk/payload-plugin-media-preview:open')}
        </Button>
      </div>
    )
  }

  const canExpand = !!customViewer || (!!preview.url && !preview.hint && preview.kind !== 'unsupported')

  return (
    <div className="media-preview-file">
      {customViewer || <MediaPreviewViewer inline preview={preview} />}
      {canExpand && (
        <Button
          aria-label={t('@seshuk/payload-plugin-media-preview:fullscreen')}
          buttonStyle="secondary"
          className="media-preview-file__fullscreen"
          icon={<ExpandIcon />}
          margin={false}
          onClick={() => setShowModal(true)}
          tooltip={t('@seshuk/payload-plugin-media-preview:fullscreen')}
        />
      )}
      <MediaPreviewModal onClose={() => setShowModal(false)} show={showModal} title={preview.filename}>
        {customViewer || <MediaPreviewViewer preview={preview} />}
      </MediaPreviewModal>
    </div>
  )
}
