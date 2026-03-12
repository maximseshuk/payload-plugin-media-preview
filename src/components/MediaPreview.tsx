import type { PluginMediaPreviewTranslationsKeys } from '@/translations/index.js'
import type { MediaPreviewContentMode, MediaPreviewMode } from '@/types.js'
import type { UIFieldServerProps } from 'payload'

import { getTranslation, type TFunction } from '@payloadcms/translations'
import { FieldLabel } from '@payloadcms/ui'
import React from 'react'

import { resolveAdapter, resolveAdapterViewer } from './adapterResolver.js'
import { MediaPreviewFieldClient } from './Field/Field.js'
import { FIELD_BASE_CLASS } from './MediaPreview.constants.js'
import { getPreviewType } from './MediaPreview.utils.js'

type MediaPreviewProps = {
  adapterNames?: string[]
  contentMode?: Partial<MediaPreviewContentMode>
  mode?: MediaPreviewMode
} & UIFieldServerProps

export const MediaPreview: React.FC<MediaPreviewProps> = (props) => {
  const {
    adapterNames,
    clientField: { label },
    contentMode,
    data,
    mode = 'auto',
    path,
    req,
  } = props

  const reqT = req.t as unknown as TFunction<PluginMediaPreviewTranslationsKeys>

  const fileSize = data?.filesize as number | undefined
  const height = data?.height as number | undefined
  const mimeType = data?.mimeType as string | undefined
  const url = data?.url as string | undefined
  const width = data?.width as number | undefined

  const adapterMatch = resolveAdapter(req.payload, adapterNames, {
    doc: data || {},
    mimeType,
    url,
  })

  const previewType = getPreviewType(mimeType)

  if (previewType === 'unsupported' && !adapterMatch) {
    return null
  }

  const customViewer = resolveAdapterViewer(req.payload, adapterMatch)
  const adapterNewTabUrl = adapterMatch?.result.mode === 'newTab' ? adapterMatch.result.url : undefined

  let fieldLabel: string | undefined
  if (label === '@seshuk/payload-media-preview:label') {
    fieldLabel = reqT('@seshuk/payload-media-preview:label')
  } else if (label) {
    const translatedLabel = getTranslation(label, req.i18n)
    fieldLabel = translatedLabel && translatedLabel !== '' ? translatedLabel : undefined
  }

  return (
    <div className={`${FIELD_BASE_CLASS} media-preview`}>
      {fieldLabel && <FieldLabel htmlFor={path} label={fieldLabel} />}
      <MediaPreviewFieldClient
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
      />
    </div>
  )
}
