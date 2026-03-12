'use client'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/translations/index.js'
import type { MediaPreviewContentMode, MediaPreviewMode } from '@/types.js'

import { Pill, useTranslation } from '@payloadcms/ui'
import { EyeIcon } from '@payloadcms/ui/icons/Eye'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ExternalLinkIcon } from '../ExternalLinkIcon/ExternalLinkIcon.js'
import {
  canPreviewDocument,
  getDocumentViewerType,
  getGoogleViewerUrl,
  getMicrosoftViewerUrl,
  getPreviewType,
} from '../MediaPreview.utils.js'
import { MediaPreviewModal } from '../Modal/Modal.js'

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
  rowId?: number | string
}

export const MediaPreviewCellClient: React.FC<Props> = ({
  adapterNewTabUrl,
  contentMode,
  customViewer,
  media,
  mode = 'auto',
  rowId,
}) => {
  const { fileSize, height, mimeType, url, width } = media
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
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
  const canPreview = !isDocumentFile || canPreviewDocument(fileSize)

  const modalMode = useMemo(
    () => (mode === 'fullscreen' ? 'fullscreen' : isTouchDevice ? 'fullscreen' : 'popup'),
    [mode, isTouchDevice],
  )

  const documentViewerUrl = useMemo<null | string>(() => {
    if (isDocumentFile && url && mimeType) {
      const viewerType = getDocumentViewerType(mimeType)
      return viewerType === 'microsoft' ? getMicrosoftViewerUrl(url) : getGoogleViewerUrl(url)
    }
    return null
  }, [isDocumentFile, url, mimeType])

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowModal((prev) => !prev)
  }, [])

  const renderNewTabLink = useCallback(
    (href: string) => (
      <div className="media-preview-cell">
        <a className="media-preview-cell__button-wrapper" href={href} rel="noopener noreferrer" target="_blank">
          <Pill
            alignIcon="left"
            className="media-preview-cell__pill"
            icon={<ExternalLinkIcon className="media-preview-cell__icon" />}
            size="small"
          >
            {t('@seshuk/payload-media-preview:open')}
          </Pill>
        </a>
      </div>
    ),
    [t],
  )

  if (previewType === 'unsupported' || !url || !canPreview) {
    if (!customViewer) {
      return <span>—</span>
    }
  }

  if (adapterNewTabUrl) {
    return renderNewTabLink(adapterNewTabUrl)
  }

  if (!customViewer) {
    if (isVideoFile && videoViewerMode === 'newTab' && url) {
      return renderNewTabLink(url)
    }

    if (isAudioFile && audioViewerMode === 'newTab' && url) {
      return renderNewTabLink(url)
    }

    if (isImageFile && imageViewerMode === 'newTab' && url) {
      return renderNewTabLink(url)
    }

    if (isDocumentFile && documentViewerMode === 'newTab' && documentViewerUrl) {
      return renderNewTabLink(documentViewerUrl)
    }
  }

  return (
    <>
      <div className="media-preview-cell">
        <button className="media-preview-cell__button-wrapper" onClick={handleClick} ref={buttonRef} type="button">
          <Pill
            alignIcon="left"
            className={`media-preview-cell__pill ${showModal ? 'media-preview-cell__pill--active' : ''}`}
            icon={<EyeIcon active={modalMode === 'popup' && showModal} className="media-preview-cell__icon" />}
            size="small"
          >
            {modalMode === 'popup' && showModal
              ? t('@seshuk/payload-media-preview:close')
              : t('@seshuk/payload-media-preview:open')}
          </Pill>
        </button>
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
        mode={modalMode}
        onClose={() => setShowModal(false)}
        rowId={rowId}
        show={showModal}
        triggerRef={buttonRef}
      />
    </>
  )
}
