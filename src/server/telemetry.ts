import { reportTelemetry } from '@seshuk/payload-plugin-tooling/telemetry'
import type { Payload } from 'payload'

import type { MediaPreviewAdapter, MediaPreviewPluginOptions } from '@/shared/types/index.js'

import type { CollectionSettings } from './settings.js'

export type TelemetryFeatures = {
  adapterInline: boolean
  adapterMimeTypes: boolean
  adapters: boolean
  adapterSignUrl: boolean
  collectionOverrides: boolean
  externalViewerGoogle: boolean
  externalViewerOffice: boolean
  field: boolean
  fieldContentModeNewTab: boolean
  fieldFullscreen: boolean
  fieldOverrides: boolean
  fieldPosition: boolean
  filePreview: boolean
}

export const buildFeatures = ({
  adapters,
  collections,
  options,
}: {
  adapters: MediaPreviewAdapter[]
  collections: Record<string, CollectionSettings>
  options: MediaPreviewPluginOptions
}): TelemetryFeatures => {
  const resolved = Object.values(options.collections).flatMap((value) => (value ? [value === true ? {} : value] : []))
  const fields = resolved.flatMap(({ field }) => (field === false ? [] : [typeof field === 'object' ? field : {}]))
  const viewers = Object.values(collections).flatMap(({ externalViewer }) => (externalViewer ? [externalViewer] : []))

  return {
    adapterInline: adapters.some((adapter) => Boolean(adapter.Component)),
    adapterMimeTypes: adapters.some((adapter) => Boolean(adapter.mimeTypes?.length)),
    adapters: adapters.length > 0,
    adapterSignUrl: adapters.some((adapter) => Boolean(adapter.signUrl)),
    collectionOverrides: resolved.some((value) => Object.keys(value).length > 0),
    externalViewerGoogle: viewers.some((viewer) => viewer.google),
    externalViewerOffice: viewers.some((viewer) => viewer.office),
    field: fields.length > 0,
    fieldContentModeNewTab: fields.some((field) => Object.values(field.contentMode ?? {}).includes('newTab')),
    fieldFullscreen: fields.some((field) => field.mode === 'fullscreen'),
    fieldOverrides: fields.some((field) => Boolean(field.overrides)),
    fieldPosition: fields.some((field) => field.position !== undefined),
    filePreview: resolved.some((value) => value.filePreview !== false),
  }
}

export const reportMediaPreviewTelemetry = ({
  features,
  options,
  payload,
}: {
  features: TelemetryFeatures
  options: MediaPreviewPluginOptions
  payload: Payload
}): Promise<void> =>
  reportTelemetry({
    disableEnv: 'MEDIA_PREVIEW_TELEMETRY_DISABLED',
    docsUrl: 'https://github.com/maximseshuk/payload-plugin-media-preview#telemetry',
    features,
    option: options.telemetry,
    packageName: '@seshuk/payload-plugin-media-preview',
    payload,
    product: 'payload-plugin-media-preview',
  })
