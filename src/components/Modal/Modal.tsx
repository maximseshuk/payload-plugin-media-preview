'use client'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/translations/index.js'

import { Modal, useModal, useTranslation } from '@payloadcms/ui'
import { XIcon } from '@payloadcms/ui/icons/X'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { MediaPreviewViewer } from '../Viewer/Viewer.js'
import { AUDIO_DIMENSIONS, POPUP_DIMENSIONS, SPACING } from './Modal.constants.js'
import './Modal.scss'

type MediaPreviewModalProps = {
  customViewer?: React.ReactNode
  media: {
    documentViewerUrl?: null | string
    height?: number
    mimeType?: string
    url?: string
    width?: number
  }
  mode: 'fullscreen' | 'popup'
  onClose?: () => void
  rowId?: number | string
  show: boolean
  triggerRef?: React.RefObject<HTMLButtonElement | HTMLElement | null>
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  customViewer,
  media,
  mode,
  onClose,
  rowId,
  show,
  triggerRef,
}) => {
  const { documentViewerUrl, height, mimeType, url, width } = media
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom')
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({})
  const popupRef = useRef<HTMLDivElement>(null)
  const previousModalOpenRef = useRef<boolean>(false)

  const { closeModal, isModalOpen, openModal } = useModal()
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()

  const modalSlug = useMemo(() => `media-preview-${rowId || 'field'}`, [rowId])

  const isAudio = useMemo(() => mimeType?.startsWith('audio/'), [mimeType])
  const isVideo = useMemo(() => mimeType?.startsWith('video/'), [mimeType])
  const isImage = useMemo(() => mimeType?.startsWith('image/'), [mimeType])

  const getPopupDimensions = useCallback((): { height: number; width: number } => {
    if (isImage && width && height) {
      const aspectRatio = width / height
      let popupHeight = POPUP_DIMENSIONS.MAX_HEIGHT
      let popupWidth = popupHeight * aspectRatio

      if (popupWidth > POPUP_DIMENSIONS.MAX_WIDTH) {
        popupWidth = POPUP_DIMENSIONS.MAX_WIDTH
        popupHeight = popupWidth / aspectRatio
      }

      return {
        height: Math.max(POPUP_DIMENSIONS.MIN_HEIGHT, popupHeight),
        width: Math.max(POPUP_DIMENSIONS.MIN_WIDTH, popupWidth),
      }
    }

    if (isAudio) {
      return { height: AUDIO_DIMENSIONS.HEIGHT, width: AUDIO_DIMENSIONS.WIDTH }
    }

    return { height: POPUP_DIMENSIONS.MAX_HEIGHT, width: POPUP_DIMENSIONS.MAX_WIDTH }
  }, [isImage, width, height, isAudio])

  const calculatePopupPosition = useCallback(() => {
    if (!triggerRef?.current || mode !== 'popup') {
      return
    }

    const rect = triggerRef.current.getBoundingClientRect()
    const { height: popupHeight, width: popupWidth } = getPopupDimensions()

    const spacingTop = SPACING.CARET_SIZE + SPACING.TOP
    const spacingBottom = SPACING.CARET_SIZE + SPACING.BOTTOM

    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight

    let top: number
    let selectedPosition: 'bottom' | 'top'
    let left = rect.left + rect.width / 2 - popupWidth / 2

    const buttonCenterX = rect.left + rect.width / 2

    if (left + popupWidth > viewportWidth - SPACING.VIEWPORT_MARGIN) {
      left = viewportWidth - popupWidth - SPACING.VIEWPORT_MARGIN
    }
    if (left < SPACING.VIEWPORT_MARGIN) {
      left = SPACING.VIEWPORT_MARGIN
    }

    const caretLeft = buttonCenterX - left

    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top

    if (spaceBelow >= popupHeight + spacingBottom) {
      selectedPosition = 'bottom'
      top = rect.bottom + spacingBottom
    } else if (spaceAbove >= popupHeight + spacingTop) {
      selectedPosition = 'top'
      top = rect.top - popupHeight - spacingTop
    } else {
      if (spaceAbove > spaceBelow) {
        selectedPosition = 'top'
        top = rect.top - popupHeight - spacingTop
      } else {
        selectedPosition = 'bottom'
        top = rect.bottom + spacingBottom
      }
    }

    setPosition(selectedPosition)
    setPopupStyle({
      '--caret-left': `${caretLeft}px`,
      '--popup-height': `${popupHeight}px`,
      '--popup-width': `${popupWidth}px`,
      left: `${left}px`,
      top: `${top}px`,
    } as React.CSSProperties)
  }, [triggerRef, mode, getPopupDimensions])

  useEffect(() => {
    if (mode === 'fullscreen') {
      if (show && !isModalOpen(modalSlug)) {
        openModal(modalSlug)
      }
    }
  }, [show, mode, modalSlug, isModalOpen, openModal])

  useEffect(() => {
    if (mode === 'fullscreen' && !show && isModalOpen(modalSlug)) {
      closeModal(modalSlug)
    }
  }, [show, mode, modalSlug, isModalOpen, closeModal])

  useEffect(() => {
    if (mode === 'fullscreen') {
      const currentModalOpen = isModalOpen(modalSlug)

      if (previousModalOpenRef.current && !currentModalOpen && show) {
        onClose?.()
      }

      previousModalOpenRef.current = currentModalOpen
    }
  }, [isModalOpen, modalSlug, mode, show, onClose])

  useEffect(() => {
    if (show && mode === 'popup') {
      calculatePopupPosition()

      window.addEventListener('resize', calculatePopupPosition)
      window.addEventListener('scroll', calculatePopupPosition, true)

      return () => {
        window.removeEventListener('resize', calculatePopupPosition)
        window.removeEventListener('scroll', calculatePopupPosition, true)
      }
    }
  }, [show, mode, calculatePopupPosition])

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose?.()
      }
    },
    [onClose, triggerRef],
  )

  useEffect(() => {
    if (!show || mode !== 'popup') {
      return
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [show, mode, handleClickOutside])

  const handleModalClose = useCallback(() => {
    closeModal(modalSlug)
    onClose?.()
  }, [closeModal, modalSlug, onClose])

  const handleBackdropClick = useCallback(
    (e: React.KeyboardEvent | React.MouseEvent) => {
      if ('key' in e && e.key !== 'Enter' && e.key !== ' ') {
        return
      }

      const target = e.target as HTMLElement

      if (
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.tagName === 'AUDIO' ||
        target.tagName === 'IFRAME' ||
        target.classList.contains('media-preview-modal__close') ||
        target.closest('.media-preview-modal__close')
      ) {
        return
      }

      handleModalClose()
    },
    [handleModalClose],
  )

  const viewerContent = useMemo(() => {
    if (customViewer) {
      return customViewer
    }

    return (
      <MediaPreviewViewer
        className={
          documentViewerUrl
            ? 'media-preview-modal__iframe'
            : isVideo
              ? 'media-preview-modal__video'
              : isAudio
                ? 'media-preview-modal__audio'
                : 'media-preview-modal__image'
        }
        media={{
          documentViewerUrl,
          mimeType,
          url,
        }}
        title={
          isVideo
            ? t('@seshuk/payload-media-preview:titleVideo')
            : isImage
              ? t('@seshuk/payload-media-preview:titleImage')
              : isAudio
                ? t('@seshuk/payload-media-preview:titleAudio')
                : t('@seshuk/payload-media-preview:titleDocument')
        }
      />
    )
  }, [customViewer, documentViewerUrl, isVideo, isAudio, isImage, mimeType, url, t])

  if (mode === 'popup') {
    if (!show) {
      return null
    }

    return createPortal(
      <div
        className={`media-preview-modal media-preview-modal--popup media-preview-modal--show media-preview-modal--position-${position}`}
        ref={popupRef}
        style={popupStyle}
      >
        <div className="media-preview-modal__body">{viewerContent}</div>
      </div>,
      document.body,
    )
  }

  if (!isModalOpen(modalSlug)) {
    return null
  }

  return (
    <Modal
      className="media-preview-modal media-preview-modal--fullscreen"
      onClick={handleBackdropClick}
      slug={modalSlug}
    >
      <div
        aria-label={t('@seshuk/payload-media-preview:close')}
        className="media-preview-modal__wrapper"
        onClick={handleBackdropClick}
        onKeyDown={handleBackdropClick}
        role="button"
        tabIndex={-1}
      >
        <button
          aria-label={t('@seshuk/payload-media-preview:close')}
          className="drawer-close-button media-preview-modal__close"
          onClick={handleModalClose}
          type="button"
        >
          <XIcon />
        </button>
        <div className="media-preview-modal__content" role="dialog" tabIndex={-1}>
          <div className="media-preview-modal__body">{viewerContent}</div>
        </div>
      </div>
    </Modal>
  )
}
