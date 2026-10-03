import type { DefaultServerCellComponentProps } from 'payload'
import React from 'react'

import { MediaPreviewCellClient } from '@/client/Cell/Cell.js'
import { resolveAdapter, resolveAdapterViewer } from '@/server/adapterResolver.js'
import { getPreviewData } from '@/server/getPreviewData.js'
import type { MediaPreviewContentMode, MediaPreviewMode } from '@/shared/types/index.js'

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
