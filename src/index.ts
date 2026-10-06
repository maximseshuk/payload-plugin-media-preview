import type { AcceptedLanguages } from '@payloadcms/translations'
import { insertField } from '@seshuk/payload-plugin-tooling/fields'
import { definePlugin } from 'payload'
import type { AdminDependencies, CollectionConfig, Config, SelectFn, SelectType } from 'payload'

import { endpoints } from '@/server/endpoints.js'
import { mediaPreviewField } from '@/server/field.js'
import { buildFilePreviewMap, mergeFilePreview } from '@/server/filePreviewMap.js'
import type { CollectionSettings, PluginData } from '@/server/settings.js'
import { resolveExternalViewer } from '@/server/settings.js'
import { buildFeatures, reportMediaPreviewTelemetry } from '@/server/telemetry.js'
import { PLUGIN_KEY } from '@/shared/constants.js'
import { translations } from '@/shared/translations/index.js'
import type { PluginDefaultTranslationsObject } from '@/shared/translations/types.js'
import type {
  MediaPreviewAdapter,
  MediaPreviewCollectionConfig,
  MediaPreviewPluginConfig,
} from '@/shared/types/index.js'

export { mediaPreviewField } from '@/server/field.js'
export type {
  AudioViewerProps,
  IframeViewerProps,
  ImageViewerProps,
  InsertPosition,
  MediaPreviewAdapter,
  MediaPreviewAdapterInlineResult,
  MediaPreviewAdapterNewTabResult,
  MediaPreviewAdapterResolveArgs,
  MediaPreviewAdapterResolveResult,
  MediaPreviewAdapterSignUrlArgs,
  MediaPreviewCollectionConfig,
  MediaPreviewContentMode,
  MediaPreviewContentModeType,
  MediaPreviewContentType,
  MediaPreviewExternalViewer,
  MediaPreviewFieldConfig,
  MediaPreviewMode,
  MediaPreviewPlugin,
  MediaPreviewPluginConfig,
  VideoViewerProps,
} from '@/shared/types/index.js'

const selectsPreview = (select: SelectType): boolean =>
  Object.entries(select).some(([key, value]) =>
    key === 'mediaPreview' ? value === true : typeof value === 'object' && selectsPreview(value),
  )

const withFilePreview = (
  collection: CollectionConfig,
  collAdapters: MediaPreviewAdapter[] = [],
): CollectionConfig['upload'] => {
  const upload = typeof collection.upload === 'object' ? collection.upload : {}
  const ours = buildFilePreviewMap(
    collection.slug,
    collAdapters.flatMap((a) => a.mimeTypes ?? []),
  )
  return {
    ...upload,
    admin: {
      ...upload.admin,
      components: {
        ...upload.admin?.components,
        filePreview: mergeFilePreview(upload.admin?.components?.filePreview, ours),
      },
    },
  }
}

const withPreviewSelect =
  (select: CollectionConfig['select']): SelectFn =>
  (args) => {
    const resolved = select?.(args) ?? args.select
    return resolved && selectsPreview(resolved) ? { mediaPreview: false } : resolved
  }

export const mediaPreview = definePlugin<MediaPreviewPluginConfig>({
  slug: '@seshuk/payload-plugin-media-preview',
  plugin: ({ config: incomingConfig, options }) => {
    for (const [slug, collConfig] of Object.entries(options.collections)) {
      for (const key of ['mode', 'contentMode']) {
        if (collConfig && typeof collConfig === 'object' && key in collConfig) {
          throw new Error(`[${PLUGIN_KEY}] collections.${slug}.${key} was renamed to collections.${slug}.field.${key}`)
        }
      }
    }

    if (options.enabled === false) {
      return incomingConfig
    }

    const allAdapters: MediaPreviewAdapter[] = []
    const collectionAdapters = Object.values(options.collections).flatMap((collConfig) =>
      collConfig && typeof collConfig === 'object' ? (collConfig.adapters ?? []) : [],
    )
    for (const adapter of [...(options.adapters ?? []), ...collectionAdapters]) {
      const known = allAdapters.find((a) => a.name === adapter.name)
      if (!known) {
        allAdapters.push(adapter)
      } else if (known !== adapter) {
        throw new Error(
          `[${PLUGIN_KEY}] two different adapters are named "${adapter.name}". Give each adapter a unique name`,
        )
      }
    }

    const adapterDependencies: AdminDependencies = {}
    for (const adapter of allAdapters) {
      if (adapter.Component) {
        adapterDependencies[`media-preview-viewer-${adapter.name}`] = {
          type: 'component' as const,
          path: adapter.Component,
        }
      }
    }

    const collectionSettings: Record<string, CollectionSettings> = {}
    for (const [slug, collConfig] of Object.entries(options.collections)) {
      if (collConfig) {
        const resolved: MediaPreviewCollectionConfig = collConfig === true ? {} : collConfig
        collectionSettings[slug] = {
          adapterNames: (resolved.adapters ?? options.adapters ?? []).map((a) => a.name),
          externalViewer: resolveExternalViewer(resolved.externalViewer ?? options.externalViewer),
        }
      }
    }
    const hasExternalViewer = Object.values(collectionSettings).some((settings) => settings.externalViewer)
    const features = buildFeatures({ adapters: allAdapters, collections: collectionSettings, options })

    const pluginTranslations = {} as Record<AcceptedLanguages, PluginDefaultTranslationsObject>
    for (const [locale, i18nObject] of Object.entries(translations)) {
      const typedLocale = locale as AcceptedLanguages
      pluginTranslations[typedLocale] = {
        ...incomingConfig.i18n?.translations?.[typedLocale],
        '@seshuk/payload-plugin-media-preview': i18nObject?.['@seshuk/payload-plugin-media-preview'],
      } as PluginDefaultTranslationsObject
    }

    const finalConfig: Config = {
      ...incomingConfig,
      admin: {
        ...incomingConfig.admin,
        dependencies: {
          ...incomingConfig.admin?.dependencies,
          ...adapterDependencies,
        },
      },
      collections: (incomingConfig.collections ?? []).map((collection) => {
        const collConfig = options.collections[collection.slug]
        if (!collConfig || !collection.upload) {
          return collection
        }

        const resolved: MediaPreviewCollectionConfig = collConfig === true ? {} : collConfig
        const select = withPreviewSelect(collection.select)
        const collAdapters = resolved.adapters ?? options.adapters ?? []
        const upload = resolved.filePreview === false ? collection.upload : withFilePreview(collection, collAdapters)

        if (resolved.field === false) {
          return Object.assign({}, collection, { select, upload })
        }

        const { position = 'last', ...fieldOptions } = typeof resolved.field === 'object' ? resolved.field : {}
        const fields = insertField(
          collection.fields,
          position,
          mediaPreviewField({ ...fieldOptions, adapterNames: collAdapters.map((a) => a.name) }),
        )

        return Object.assign({}, collection, { fields, select, upload })
      }),
      custom: {
        ...incomingConfig.custom,
        [PLUGIN_KEY]: {
          adapters: allAdapters,
          collections: collectionSettings,
        } satisfies PluginData,
      },
      endpoints: [...(incomingConfig.endpoints ?? []), ...(hasExternalViewer ? endpoints : [])],
      i18n: {
        ...incomingConfig.i18n,
        translations: {
          ...incomingConfig.i18n?.translations,
          ...pluginTranslations,
        },
      },
      onInit: async (payload) => {
        await incomingConfig.onInit?.(payload)
        void reportMediaPreviewTelemetry({ features, options, payload })
      },
    }

    return finalConfig
  },
})
