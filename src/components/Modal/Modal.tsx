'use client'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/translations/index.js'

import { Button, Modal, useModal, useTranslation } from '@payloadcms/ui'
import { XIcon } from '@payloadcms/ui/icons/X'
import React, { useCallback, useEffect, useRef } from 'react'

import './Modal.css'

type MediaPreviewModalProps = {
  children: React.ReactNode
  onClose?: () => void
  rowId?: number | string
  show: boolean
  title?: string
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ children, onClose, rowId, show, title }) => {
  const previousModalOpenRef = useRef<boolean>(false)
  const { closeModal, isModalOpen, openModal } = useModal()
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()
  const modalSlug = `media-preview-${rowId || 'field'}`
  const closeLabel = t('@seshuk/payload-plugin-media-preview:close')

  useEffect(() => {
    if (show && !isModalOpen(modalSlug)) {
      openModal(modalSlug)
    }
  }, [show, modalSlug, isModalOpen, openModal])

  useEffect(() => {
    if (!show && isModalOpen(modalSlug)) {
      closeModal(modalSlug)
    }
  }, [show, modalSlug, isModalOpen, closeModal])

  useEffect(() => {
    const currentModalOpen = isModalOpen(modalSlug)
    if (previousModalOpenRef.current && !currentModalOpen && show) {
      onClose?.()
    }
    previousModalOpenRef.current = currentModalOpen
  }, [isModalOpen, modalSlug, show, onClose])

  const handleClose = useCallback(() => {
    closeModal(modalSlug)
    onClose?.()
  }, [closeModal, modalSlug, onClose])

  if (!isModalOpen(modalSlug)) {
    return null
  }

  return (
    <Modal aria-label={title} className="media-preview-modal" slug={modalSlug}>
      <button
        aria-label={closeLabel}
        className="media-preview-modal__backdrop"
        onClick={handleClose}
        tabIndex={-1}
        type="button"
      />
      <div className="media-preview-modal__panel">
        <div className="media-preview-modal__header">
          <h2 className="media-preview-modal__title" title={title}>
            {title}
          </h2>
          <Button
            aria-label={closeLabel}
            buttonStyle="ghost"
            className="media-preview-modal__close"
            icon={<XIcon size={24} />}
            margin={false}
            onClick={handleClose}
            tooltip={closeLabel}
          />
        </div>
        <div className="media-preview-modal__body">{children}</div>
      </div>
    </Modal>
  )
}
