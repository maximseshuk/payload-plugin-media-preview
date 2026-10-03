import type { MediaPreviewContentMode, MediaPreviewMode } from '@/types.js'
import type { DefaultServerCellComponentProps } from 'payload'

import React from 'react'

import { resolveAdapter, resolveAdapterViewer } from '../adapterResolver.js'
import { getPreviewData } from '../getPreviewData.js'
import { MediaPreviewCellClient } from './Cell.client.js'
import './Cell.css'

type Props = {
  adapterNames?: string[]
  contentMode?: Partial<MediaPreviewContentMode>
  mode?: MediaPreviewMode
} & DefaultServerCellComponentProps

export const MediaPreviewCell: React.FC<Props> = ({
  adapterNames,
  collectionSlug,
  contentMode,
  mode = 'auto',
  payload: payloadInstance,
  rowData,
}) => {
  if (!rowData || !collectionSlug) {
    return null
  }
  const doc = rowData
  const preview = getPreviewData(payloadInstance.config, collectionSlug, doc)

  const adapterMatch = resolveAdapter(payloadInstance, adapterNames, {
    doc,
    mimeType: preview.mimeType,
    url: preview.url,
  })

  const customViewer = resolveAdapterViewer(payloadInstance, adapterMatch)
  const adapterNewTabUrl = adapterMatch?.result.mode === 'newTab' ? adapterMatch.result.url : undefined

  return (
    <MediaPreviewCellClient
      adapterNewTabUrl={adapterNewTabUrl}
      contentMode={contentMode}
      customViewer={customViewer}
      mode={mode}
      preview={preview}
      rowId={rowData.id}
    />
  )
}
