import type { ServerProps, UploadFilePreviewClientProps } from 'payload'
import React from 'react'

import { MediaPreviewFileClient } from '@/client/FilePreview/FilePreview.js'
import type { AdapterMatch } from '@/server/adapterResolver.js'
import { resolveAdapter, resolveAdapterViewer } from '@/server/adapterResolver.js'
import { getPreviewData } from '@/server/getPreviewData.js'
import { getCollectionAdapters, getPluginData } from '@/server/settings.js'

type Props = { collectionSlug: string } & Partial<UploadFilePreviewClientProps> & ServerProps

export const MediaPreviewFile = async (props: Props) => {
  const { id, collectionSlug, filename, filesize, fileSrc, height, mimeType, payload, user, width } = props
  const fileDoc = { id, filename, filesize, height, mimeType, url: fileSrc, width }
  const data = getPluginData(payload.config)
  const adapterNames = data.collections[collectionSlug]?.adapterNames

  let adapterMatch: AdapterMatch | null = null
  if (id !== undefined && getCollectionAdapters(data, adapterNames).length > 0) {
    const doc = await payload
      .findByID({ id, collection: collectionSlug as never, depth: 0, draft: true, overrideAccess: false, user })
      .catch(() => null)
    adapterMatch =
      doc && (await resolveAdapter(adapterNames, { collectionSlug, doc, mimeType, payload, url: fileSrc, user }))
  }

  return (
    <MediaPreviewFileClient
      adapterNewTabUrl={adapterMatch?.result.mode === 'newTab' ? adapterMatch.result.url : undefined}
      customViewer={resolveAdapterViewer(payload, adapterMatch)}
      preview={getPreviewData(payload.config, collectionSlug, fileDoc)}
    />
  )
}
