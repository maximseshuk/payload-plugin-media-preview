import type { AcceptedLanguages } from '@payloadcms/translations'
import type { AdminDependencies, Config } from 'payload'

import type { PluginDefaultTranslationsObject } from './translations/types.js'
import type { MediaPreviewAdapter, MediaPreviewCollectionConfig, MediaPreviewPluginConfig } from './types.js'

import { mediaPreviewField } from './field.js'
import { translations } from './translations/index.js'
import { insertField } from './utils/insertField.js'

export { mediaPreviewField } from './field.js'
export type { MediaPreviewFieldOptions } from './field.js'
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
  MediaPreviewCollectionConfig,
  MediaPreviewContentMode,
  MediaPreviewContentModeType,
  MediaPreviewContentType,
  MediaPreviewFieldConfig,
  MediaPreviewMode,
  MediaPreviewPlugin,
  MediaPreviewPluginConfig,
  VideoViewerProps,
} from './types.js'

export const mediaPreview =
  (pluginConfig: MediaPreviewPluginConfig) =>
    (incomingConfig: Config): Config => {
      if (pluginConfig.enabled === false) {
        return incomingConfig
      }

      const allAdapters: MediaPreviewAdapter[] = [...(pluginConfig.adapters ?? [])]

      for (const [, collConfig] of Object.entries(pluginConfig.collections)) {
        if (collConfig && typeof collConfig === 'object' && collConfig.adapters) {
          for (const adapter of collConfig.adapters) {
            if (!allAdapters.some((a) => a.name === adapter.name)) {
              allAdapters.push(adapter)
            }
          }
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

      const finalConfig: Config = {
        ...incomingConfig,
        admin: {
          ...incomingConfig.admin,
          dependencies: {
            ...incomingConfig.admin?.dependencies,
            ...adapterDependencies,
          },
        },
        collections: (incomingConfig.collections || []).map((collection) => {
          const collConfig = pluginConfig.collections[collection.slug]
          if (!collConfig) {
            return collection
          }

          if (!collection.upload) {
            return collection
          }

          const resolved: MediaPreviewCollectionConfig =
            collConfig === true ? {} : collConfig

          if (resolved.field === false) {
            return collection
          }

          const fieldConfig = typeof resolved.field === 'object' ? resolved.field : {}
          const position = fieldConfig.position ?? 'last'
          const collAdapters = resolved.adapters ?? pluginConfig.adapters
          const adapterNames = collAdapters?.map((a) => a.name)

          const fields = insertField(
            collection.fields,
            position,
            mediaPreviewField({
              adapterNames,
              contentMode: resolved.contentMode,
              mode: resolved.mode,
              overrides: fieldConfig.overrides,
            }),
          )

          return {
            ...collection,
            fields,
          }
        }),
        custom: {
          ...incomingConfig.custom,
          '@seshuk/payload-media-preview': {
            adapters: allAdapters,
          },
        },
        i18n: {
          ...incomingConfig.i18n,
          translations: {
            ...incomingConfig.i18n?.translations,
            ...Object.entries(translations).reduce(
              (acc, [locale, i18nObject]) => {
                const typedLocale = locale as AcceptedLanguages

                return {
                  ...acc,
                  [typedLocale]: {
                    ...incomingConfig.i18n?.translations?.[typedLocale],
                    '@seshuk/payload-media-preview':
                    i18nObject?.['@seshuk/payload-media-preview'],
                  },
                }
              },
              {} as Record<AcceptedLanguages, PluginDefaultTranslationsObject>,
            ),
          },
        },
      }

      return finalConfig
    }
