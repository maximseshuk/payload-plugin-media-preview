'use client'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/translations/index.js'
import type { MediaPreviewContentMode, MediaPreviewMode } from '@/types.js'

import { Button, useTranslation } from '@payloadcms/ui'
import { EyeIcon } from '@payloadcms/ui/icons/Eye'
import React, { useCallback, useMemo, useState } from 'react'

import { ExternalLinkIcon } from '../ExternalLinkIcon/ExternalLinkIcon.js'
import {
  canPreviewDocument,
  getDocumentViewerType,
  getGoogleViewerUrl,
  getMicrosoftViewerUrl,
  getPreviewType,
} from '../MediaPreview.utils.js'
import { MediaPreviewModal } from '../Modal/Modal.js'
import './Field.scss'

type Props = {
  adapterNewTabUrl?: string
  contentMode?: Partial<MediaPreviewContentMode>
  customViewer?: React.ReactNode
  media: {
    fileSize?: number
    height?: number
    mimeType?: string
    url?: string
    width?: number
  }
  mode?: MediaPreviewMode
}

export const MediaPreviewFieldClient: React.FC<Props> = ({
  adapterNewTabUrl,
  contentMode,
  customViewer,
  media,
  mode: _mode = 'auto',
}) => {
  const { fileSize, height, mimeType, url, width } = media
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()

  const audioViewerMode = contentMode?.audio ?? 'inline'
  const documentViewerMode = contentMode?.document ?? 'inline'
  const imageViewerMode = contentMode?.image ?? 'inline'
  const videoViewerMode = contentMode?.video ?? 'inline'

  const previewType = useMemo(() => getPreviewType(mimeType), [mimeType])
  const isAudioFile = previewType === 'audio'
  const isDocumentFile = previewType === 'document'
  const isImageFile = previewType === 'image'
  const isVideoFile = previewType === 'video'
  const canPreview = !isDocumentFile || canPreviewDocument(mimeType!, fileSize)

  const documentViewerUrl = useMemo<null | string>(() => {
    if (isDocumentFile && url && mimeType) {
      const viewerType = getDocumentViewerType(mimeType)
      return viewerType === 'microsoft' ? getMicrosoftViewerUrl(url) : getGoogleViewerUrl(url)
    }
    return null
  }, [isDocumentFile, url, mimeType])

  const handleToggleModal = useCallback(() => {
    setShowModal((prev) => !prev)
  }, [])

  const renderNewTabButton = useCallback(
    (href: string) => (
      <div className="media-preview__button-wrapper">
        <Button
          buttonStyle="secondary"
          el="anchor"
          icon={<ExternalLinkIcon />}
          iconPosition="left"
          newTab
          size="medium"
          url={href}
        >
          {t('@seshuk/payload-media-preview:open')}
        </Button>
      </div>
    ),
    [t],
  )

  if (previewType === 'unsupported' || !url || !canPreview) {
    if (!customViewer) {
      return null
    }
  }

  if (adapterNewTabUrl) {
    return renderNewTabButton(adapterNewTabUrl)
  }

  if (!customViewer) {
    if (isVideoFile && videoViewerMode === 'newTab' && url) {
      return renderNewTabButton(url)
    }

    if (isAudioFile && audioViewerMode === 'newTab' && url) {
      return renderNewTabButton(url)
    }

    if (isImageFile && imageViewerMode === 'newTab' && url) {
      return renderNewTabButton(url)
    }

    if (isDocumentFile && documentViewerMode === 'newTab' && documentViewerUrl) {
      return renderNewTabButton(documentViewerUrl)
    }
  }

  return (
    <>
      <div className="media-preview__button-wrapper">
        <Button
          buttonStyle="secondary"
          icon={<EyeIcon active={false} />}
          iconPosition="left"
          onClick={handleToggleModal}
          size="medium"
        >
          {t('@seshuk/payload-media-preview:open')}
        </Button>
      </div>

      <MediaPreviewModal
        customViewer={customViewer}
        media={{
          documentViewerUrl,
          height,
          mimeType,
          url,
          width,
        }}
        mode="fullscreen"
        onClose={() => setShowModal(false)}
        show={showModal}
      />
    </>
  )
}
