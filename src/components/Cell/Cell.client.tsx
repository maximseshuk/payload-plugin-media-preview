'use client'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/translations/index.js'
import type { MediaPreviewContentMode, MediaPreviewMode } from '@/types.js'

import { Button, Popup, useTranslation } from '@payloadcms/ui'
import { DocumentIcon } from '@payloadcms/ui/icons/Document'
import { NewTabIcon } from '@payloadcms/ui/icons/NewTab'
import { PreviewIcon } from '@payloadcms/ui/icons/Preview'
import React, { useEffect, useState } from 'react'

import type { PreviewData } from '../MediaPreview.types.js'

import { getContentType } from '../MediaPreview.utils.js'
import { MediaPreviewModal } from '../Modal/Modal.js'
import { MediaPreviewViewer } from '../Viewer/Viewer.js'

type Props = {
  adapterNewTabUrl?: string
  contentMode?: Partial<MediaPreviewContentMode>
  customViewer?: React.ReactNode
  mode?: MediaPreviewMode
  preview: PreviewData
  rowId?: number | string
}

const buttonProps = { buttonStyle: 'secondary', iconPosition: 'left', margin: false, size: 'medium' } as const

export const MediaPreviewCellClient: React.FC<Props> = ({
  adapterNewTabUrl,
  contentMode,
  customViewer,
  mode = 'auto',
  preview,
  rowId,
}) => {
  const { filename, hint, kind, url } = preview
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [open, setOpen] = useState(false)
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()
  const label = t('@seshuk/payload-plugin-media-preview:open')

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const newTabLink = (href: string) => (
    <Button {...buttonProps} el="anchor" icon={<NewTabIcon size={16} />} newTab url={href}>
      {label}
    </Button>
  )

  if (adapterNewTabUrl) {
    return newTabLink(adapterNewTabUrl)
  }

  if (!customViewer) {
    if (!url) {
      return <span>—</span>
    }
    if (contentMode?.[getContentType(kind)] === 'newTab') {
      return newTabLink(url)
    }
  }

  const viewer = customViewer || <MediaPreviewViewer preview={preview} />
  const icon = hint && !customViewer ? <DocumentIcon size={16} /> : <PreviewIcon active={false} size={16} />

  if (mode === 'fullscreen' || isTouchDevice) {
    return (
      <>
        <Button
          {...buttonProps}
          icon={icon}
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          {label}
        </Button>
        <MediaPreviewModal onClose={() => setOpen(false)} rowId={rowId} show={open} title={filename}>
          {viewer}
        </MediaPreviewModal>
      </>
    )
  }

  return (
    <Popup
      horizontalAlign="center"
      onToggleClose={() => setOpen(false)}
      onToggleOpen={setOpen}
      portalClassName="media-preview-popup"
      render={() =>
        open && (
          <div className="media-preview-popup__body" data-popup-prevent-close>
            {viewer}
          </div>
        )
      }
      renderButton={({ active, onClick, ...triggerProps }) => (
        <Button
          {...triggerProps}
          {...buttonProps}
          icon={icon}
          onClick={(e) => {
            e.stopPropagation()
            onClick(e)
          }}
          selected={active}
        >
          {label}
        </Button>
      )}
      size="large"
      theme="auto"
    />
  )
}
