import type {
  MediaPreviewAdapter,
  MediaPreviewAdapterInlineResult,
  MediaPreviewAdapterNewTabResult,
  MediaPreviewAdapterResolveArgs,
} from '@/types.js'
import type { ImportMap, SanitizedConfig } from 'payload'

import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent'

type PayloadLike = {
  config: SanitizedConfig
  importMap: ImportMap
}

export type AdapterMatch = {
  adapterName: string
  result: MediaPreviewAdapterInlineResult | MediaPreviewAdapterNewTabResult
}

const getAdapters = (config: SanitizedConfig): MediaPreviewAdapter[] => {
  const pluginData = config.custom?.['@seshuk/payload-media-preview'] as
    | { adapters?: MediaPreviewAdapter[] }
    | undefined
  return pluginData?.adapters ?? []
}

const filterAdapters = (allAdapters: MediaPreviewAdapter[], adapterNames?: string[]): MediaPreviewAdapter[] => {
  if (!adapterNames) {
    return allAdapters
  }
  return allAdapters.filter((a) => adapterNames.includes(a.name))
}

export const resolveAdapter = (
  payloadLike: PayloadLike,
  adapterNames: string[] | undefined,
  args: MediaPreviewAdapterResolveArgs,
): AdapterMatch | null => {
  const allAdapters = getAdapters(payloadLike.config)
  if (allAdapters.length === 0) {
    return null
  }

  const adapters = filterAdapters(allAdapters, adapterNames)

  for (const adapter of adapters) {
    const result = adapter.resolve(args)
    if (result) {
      return {
        adapterName: adapter.name,
        result,
      }
    }
  }

  return null
}

export const resolveAdapterViewer = (
  payloadLike: PayloadLike,
  match: AdapterMatch | null,
): null | React.ReactNode => {
  if (!match || match.result.mode !== 'inline') {
    return null
  }

  const depKey = `media-preview-viewer-${match.adapterName}`
  const dep = payloadLike.config.admin?.dependencies?.[depKey]
  if (!dep) {
    return null
  }

  return RenderServerComponent({
    clientProps: match.result.props,
    Component: dep as unknown as React.ComponentType,
    importMap: payloadLike.importMap,
  })
}
