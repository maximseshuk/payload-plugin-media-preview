import type { Config, Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { mediaPreview } from '@/index.js'
import { resolveExternalViewer } from '@/server/settings.js'
import { buildFeatures } from '@/server/telemetry.js'
import type { MediaPreviewAdapter, MediaPreviewPluginOptions } from '@/shared/types/index.js'

const adapter: MediaPreviewAdapter = { name: 'plain', resolve: () => null }

const features = (options: MediaPreviewPluginOptions, adapters: MediaPreviewAdapter[] = []) =>
  buildFeatures({
    adapters,
    collections: Object.fromEntries(
      Object.entries(options.collections).map(([slug, value]) => [
        slug,
        {
          externalViewer: resolveExternalViewer(
            (typeof value === 'object' ? value.externalViewer : undefined) ?? options.externalViewer,
          ),
        },
      ]),
    ),
    options,
  })

describe('buildFeatures', () => {
  it('sets only the defaults for a collection set to true', () => {
    expect(features({ collections: { media: true } })).toEqual({
      adapterInline: false,
      adapterMimeTypes: false,
      adapters: false,
      adapterSignUrl: false,
      collectionOverrides: false,
      externalViewerGoogle: false,
      externalViewerOffice: false,
      field: true,
      fieldContentModeNewTab: false,
      fieldFullscreen: false,
      fieldOverrides: false,
      fieldPosition: false,
      filePreview: true,
    })
  })

  it('sets adapter features from the adapter options', () => {
    const result = features({ collections: { media: true } }, [
      adapter,
      { ...adapter, name: 'inline', Component: 'pkg/client#Viewer', mimeTypes: ['video/*'] },
      { ...adapter, name: 'signed', signUrl: () => null },
    ])

    expect(result).toMatchObject({ adapterInline: true, adapterMimeTypes: true, adapters: true, adapterSignUrl: true })
  })

  it('sets field, file preview and external viewer features from collection options', () => {
    const result = features({
      collections: {
        docs: { externalViewer: { office: true } },
        media: {
          field: { contentMode: { video: 'newTab' }, mode: 'fullscreen', overrides: {}, position: 'first' },
          filePreview: false,
        },
        off: false,
      },
    })

    expect(result).toMatchObject({
      collectionOverrides: true,
      externalViewerGoogle: false,
      externalViewerOffice: true,
      field: true,
      fieldContentModeNewTab: true,
      fieldFullscreen: true,
      fieldOverrides: true,
      fieldPosition: true,
      filePreview: true,
    })
  })

  it('has no field when every collection turns the field off', () => {
    expect(features({ collections: { media: { field: false, filePreview: false } } })).toMatchObject({
      field: false,
      filePreview: false,
    })
  })
})

describe('telemetry onInit', () => {
  it('keeps the existing onInit', async () => {
    const onInit = vi.fn()
    const config = mediaPreview({ collections: { media: true } })({
      collections: [{ slug: 'media', fields: [], upload: true }],
      onInit,
    } as Config)
    const payload = { config: { telemetry: false } } as unknown as Payload

    await config.onInit?.(payload)

    expect(onInit).toHaveBeenCalledWith(payload)
  })
})
