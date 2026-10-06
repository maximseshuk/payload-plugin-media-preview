import { reportTelemetry } from '@seshuk/payload-plugin-tooling/telemetry'
import type { Config, Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { mediaPreview } from '@/index.js'
import { resolveExternalViewer } from '@/server/settings.js'
import { buildFeatures } from '@/server/telemetry.js'
import type { MediaPreviewAdapter, MediaPreviewPluginConfig } from '@/shared/types/index.js'

vi.mock('@seshuk/payload-plugin-tooling/telemetry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@seshuk/payload-plugin-tooling/telemetry')>()),
  reportTelemetry: vi.fn(async () => {}),
}))

const adapter: MediaPreviewAdapter = { name: 'plain', resolve: () => null }

const features = (options: MediaPreviewPluginConfig, adapters: MediaPreviewAdapter[] = []) =>
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
  const payload = { config: {} } as unknown as Payload
  const init = (options: Partial<MediaPreviewPluginConfig> = {}, onInit?: Config['onInit']) =>
    mediaPreview({ collections: { media: true }, ...options })({
      collections: [{ slug: 'media', fields: [], upload: true }],
      onInit,
    } as Config).onInit?.(payload)

  it('reports after the existing onInit resolves', async () => {
    const order: string[] = []
    const onInit = vi.fn(async () => {
      await Promise.resolve()
      order.push('onInit')
    })
    vi.mocked(reportTelemetry).mockImplementationOnce(async () => {
      order.push('telemetry')
    })

    await init({}, onInit)

    expect(onInit).toHaveBeenCalledWith(payload)
    expect(order).toEqual(['onInit', 'telemetry'])
    expect(reportTelemetry).toHaveBeenLastCalledWith(expect.objectContaining({ payload }))
  })

  it.each([
    [{}, undefined],
    [{ telemetry: false }, false],
  ] as const)('passes the opt-out env and option %j to the tooling', async (options, option) => {
    await init(options)

    expect(vi.mocked(reportTelemetry).mock.lastCall![0]).toMatchObject({
      disableEnv: 'MEDIA_PREVIEW_TELEMETRY_DISABLED',
      option,
    })
  })
})
