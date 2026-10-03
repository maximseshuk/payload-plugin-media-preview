import type {
  MediaPreviewAdapterInlineResult,
  MediaPreviewAdapterNewTabResult,
  MediaPreviewAdapterResolveArgs,
} from '@/types.js'
import type { ImportMap, SanitizedConfig } from 'payload'

import { getCollectionAdapters, getPluginData } from '@/settings.js'
import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent'

type PayloadLike = {
  config: SanitizedConfig
  importMap: ImportMap
}

export type AdapterMatch = {
  adapterName: string
  result: MediaPreviewAdapterInlineResult | MediaPreviewAdapterNewTabResult
}

export const resolveAdapter = (
  payloadLike: PayloadLike,
  adapterNames: string[] | undefined,
  args: MediaPreviewAdapterResolveArgs,
): AdapterMatch | null => {
  for (const adapter of getCollectionAdapters(getPluginData(payloadLike.config), adapterNames)) {
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

export const resolveAdapterViewer = (payloadLike: PayloadLike, match: AdapterMatch | null): null | React.ReactNode => {
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
