import type { MediaPreviewContentMode, MediaPreviewMode } from '@/types.js'
import type { DefaultServerCellComponentProps } from 'payload'

import React from 'react'

import { resolveAdapter, resolveAdapterViewer } from '../adapterResolver.js'
import { MediaPreviewCellClient } from './Cell.client.js'
import './Cell.scss'

type Props = {
  adapterNames?: string[]
  contentMode?: Partial<MediaPreviewContentMode>
  mode?: MediaPreviewMode
} & DefaultServerCellComponentProps

export const MediaPreviewCell: React.FC<Props> = ({
  adapterNames,
  contentMode,
  mode = 'auto',
  payload: payloadInstance,
  rowData,
}) => {
  const fileSize = rowData?.filesize as number | undefined
  const height = rowData?.height as number | undefined
  const mimeType = rowData?.mimeType as string | undefined
  const url = rowData?.url as string | undefined
  const width = rowData?.width as number | undefined

  const adapterMatch = resolveAdapter(payloadInstance, adapterNames, {
    doc: rowData || {},
    mimeType,
    url,
  })

  const customViewer = resolveAdapterViewer(payloadInstance, adapterMatch)
  const adapterNewTabUrl = adapterMatch?.result.mode === 'newTab' ? adapterMatch.result.url : undefined

  return (
    <MediaPreviewCellClient
      adapterNewTabUrl={adapterNewTabUrl}
      contentMode={contentMode}
      customViewer={customViewer}
      media={{
        fileSize,
        height,
        mimeType,
        url,
        width,
      }}
      mode={mode}
      rowId={rowData?.id}
    />
  )
}
