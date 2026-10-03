import type { Config, PayloadRequest, SanitizedConfig, SelectType, UIField } from 'payload'

import { describe, expect, it } from 'vitest'

import type { MediaPreviewAdapter, MediaPreviewPluginConfig } from '../src/types.js'

import { getExternalViewerHint } from '../src/components/getPreviewData.js'
import { mediaPreviewField } from '../src/field.js'
import { mediaPreview } from '../src/index.js'
import { FILE_PREVIEW_COMPONENT } from '../src/utils/filePreviewMap.js'

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type Collections = NonNullable<Config['collections']>
type Fields = Collections[number]['fields']

const baseConfig = (collections: Collections = []): Config =>
  ({
    collections: [{ slug: 'users', auth: true, fields: [] }, ...collections],
    i18n: {},
  }) as Config

const uploadCollection = (slug: string, fields: Fields = []) =>
  ({
    slug,
    fields,
    upload: true,
  }) as Collections[number]

const hasField = (fields: Fields, name: string) => fields.some((f) => 'name' in f && f.name === name)

const adapter = (name: string, field?: string): MediaPreviewAdapter => ({
  name,
  Component: `test-package/client#${name}`,
  resolve: ({ doc }) => (field && doc[field] ? { mode: 'inline', props: { [field]: doc[field] } } : null),
})

describe('mediaPreview plugin', () => {
  it('injects field only into configured upload collections', () => {
    const config = baseConfig([uploadCollection('media'), uploadCollection('other')])

    const result = mediaPreview({ collections: { media: true } })(config)

    const media = result.collections!.find((c) => c.slug === 'media')
    const other = result.collections!.find((c) => c.slug === 'other')

    expect(hasField(media!.fields, 'mediaPreview')).toBe(true)
    expect(hasField(other!.fields, 'mediaPreview')).toBe(false)
  })

  it('skips non-upload collections', () => {
    const config = baseConfig([{ slug: 'posts', fields: [] } as Collections[number]])

    const result = mediaPreview({ collections: { posts: true } as never })(config)

    const posts = result.collections!.find((c) => c.slug === 'posts')
    expect(hasField(posts!.fields, 'mediaPreview')).toBe(false)
  })

  it('does not inject field when field: false, but registers adapters', () => {
    const config = baseConfig([uploadCollection('media')])
    const a = adapter('test')

    const result = mediaPreview({
      collections: { media: { adapters: [a], field: false } },
    })(config)

    const media = result.collections!.find((c) => c.slug === 'media')
    expect(hasField(media!.fields, 'mediaPreview')).toBe(false)

    const stored = result.custom?.['@seshuk/payload-plugin-media-preview']
    expect(stored?.adapters).toHaveLength(1)
    expect(stored?.adapters[0].name).toBe('test')
  })

  it('returns config unchanged when enabled: false', () => {
    const config = baseConfig([uploadCollection('media')])
    const result = mediaPreview({ collections: { media: true }, enabled: false })(config)
    expect(result).toBe(config)
  })

  it('merges i18n translations', () => {
    const config = baseConfig([uploadCollection('media')])

    const result = mediaPreview({ collections: { media: true } })(config)
    const en = result.i18n?.translations?.en as Record<string, Record<string, string>>

    expect(en?.['@seshuk/payload-plugin-media-preview']?.open).toBe('Open')
    expect(en?.['@seshuk/payload-plugin-media-preview']?.close).toBe('Close')
  })
})

describe('filePreview', () => {
  const getUpload = (config: Config, slug = 'media') =>
    config.collections!.find((c) => c.slug === slug)!.upload as Exclude<Collections[number]['upload'], boolean>
  const getMap = (config: Config, slug = 'media') =>
    getUpload(config, slug)?.admin?.components?.filePreview as Record<string, { path: string; serverProps: object }>

  it('registers the plugin component for types Payload does not preview', () => {
    const result = mediaPreview({ collections: { media: true } })(baseConfig([uploadCollection('media')]))
    const map = getMap(result)

    expect(map[DOCX]).toEqual({ path: FILE_PREVIEW_COMPONENT, serverProps: { collectionSlug: 'media' } })
    expect(map['text/*']?.path).toBe(FILE_PREVIEW_COMPONENT)
    expect(map['*']?.path).toBe(FILE_PREVIEW_COMPONENT)
    expect(map['image/*']).toBe(false)
    expect(map['video/*']).toBe(false)
    expect(map['application/pdf']).toBe(false)
  })

  it('registers adapter mimeTypes', () => {
    const a = { ...adapter('stream'), mimeTypes: ['video/*'] }
    const result = mediaPreview({ collections: { media: { adapters: [a] } } })(baseConfig([uploadCollection('media')]))

    expect(getMap(result)['video/*']?.path).toBe(FILE_PREVIEW_COMPONENT)
  })

  it('registers the map with field: false', () => {
    const result = mediaPreview({ collections: { media: { field: false } } })(baseConfig([uploadCollection('media')]))
    expect(getMap(result)[DOCX]).toBeDefined()
  })

  it('does not register with filePreview: false', () => {
    const result = mediaPreview({ collections: { media: { filePreview: false } } })(
      baseConfig([uploadCollection('media')]),
    )
    expect(getUpload(result)).toBe(true)
  })

  it('keeps the user filePreview', () => {
    const collection = (filePreview: unknown) =>
      ({
        slug: 'media',
        fields: [],
        upload: { admin: { components: { filePreview } }, staticDir: 'uploads' },
      }) as Collections[number]

    const single = mediaPreview({ collections: { media: true } })(baseConfig([collection('./Custom#Preview')]))
    expect(getUpload(single).admin?.components?.filePreview).toBe('./Custom#Preview')

    const merged = mediaPreview({ collections: { media: true } })(
      baseConfig([collection({ [DOCX]: './Docx#Preview' })]),
    )
    expect(getMap(merged)[DOCX]).toBe('./Docx#Preview')
    expect(getMap(merged)['text/*']?.path).toBe(FILE_PREVIEW_COMPONENT)
    expect(getUpload(merged).staticDir).toBe('uploads')

    const fallback = { '*': './Any#Preview' }
    const withFallback = mediaPreview({ collections: { media: true } })(baseConfig([collection(fallback)]))
    expect(getMap(withFallback)).toEqual(fallback)
  })
})

describe('externalViewer', () => {
  const getSettings = (config: Config) => config.custom?.['@seshuk/payload-plugin-media-preview']?.collections
  const paths = (config: Config) => (config.endpoints ?? []).map((e) => e.path)

  it('is off by default and adds no endpoints', () => {
    const result = mediaPreview({ collections: { media: true } })(baseConfig([uploadCollection('media')]))

    expect(getSettings(result).media.externalViewer).toBe(false)
    expect(paths(result)).toEqual([])
  })

  it('adds the endpoints when a collection enables it', () => {
    const result = mediaPreview({ collections: { media: { externalViewer: { office: true } } } })(
      baseConfig([uploadCollection('media')]),
    )

    expect(getSettings(result).media.externalViewer).toEqual({ expiresIn: 600, google: false, office: true })
    expect(paths(result)).toEqual(['/media-preview/url', '/media-preview/file/:token/:filename'])
  })

  it('lets the collection override the global value', () => {
    const result = mediaPreview({
      collections: { docs: true, media: { externalViewer: false } },
      externalViewer: true,
    })(baseConfig([uploadCollection('media'), uploadCollection('docs')]))

    expect(getSettings(result).media.externalViewer).toBe(false)
    expect(getSettings(result).docs.externalViewer).toMatchObject({ google: true, office: true })
  })

  it('stores collection adapter names', () => {
    const result = mediaPreview({
      adapters: [adapter('global')],
      collections: { docs: true, media: { adapters: [adapter('local')] } },
    })(baseConfig([uploadCollection('media'), uploadCollection('docs')]))

    expect(getSettings(result).media.adapterNames).toEqual(['local'])
    expect(getSettings(result).docs.adapterNames).toEqual(['global'])
  })

  it('does not give one collection the adapters of another', () => {
    const signer = { ...adapter('signer'), mimeTypes: ['video/*'], signUrl: () => 'https://cdn.example.com/a' }
    const result = mediaPreview({
      collections: { docs: { externalViewer: true }, media: { adapters: [signer], externalViewer: true } },
    })(baseConfig([uploadCollection('media'), uploadCollection('docs')]))
    const config = {
      ...result,
      routes: { api: '/api' },
      serverURL: 'http://localhost:3000',
    } as unknown as SanitizedConfig
    const doc = { filesize: 1000, mimeType: DOCX, url: '/api/docs/file/a.docx' }

    expect(getSettings(result).docs.adapterNames).toEqual([])
    expect(getExternalViewerHint(config, 'docs', doc)).toBe('privateServer')
    expect(getExternalViewerHint(config, 'media', { ...doc, url: '/api/media/file/a.docx' })).toBeUndefined()

    const docs = result.collections!.find((c) => c.slug === 'docs')!
    const cell = docs.fields.find((f) => 'name' in f && f.name === 'mediaPreview') as UIField
    expect(cell.admin!.components!.Cell).toMatchObject({ serverProps: { adapterNames: [] } })
  })
})

describe('adapters', () => {
  it('registers Component in admin.dependencies', () => {
    const config = baseConfig([uploadCollection('media')])
    const a = adapter('custom')

    const result = mediaPreview({ adapters: [a], collections: { media: true } })(config)
    const dep = result.admin?.dependencies?.['media-preview-viewer-custom'] as { path: string }

    expect(dep?.path).toBe('test-package/client#custom')
  })

  it('stores adapters in config.custom', () => {
    const config = baseConfig([uploadCollection('media')])
    const a = adapter('test')

    const result = mediaPreview({ adapters: [a], collections: { media: true } })(config)
    const stored = result.custom?.['@seshuk/payload-plugin-media-preview']

    expect(stored?.adapters).toHaveLength(1)
    expect(stored?.adapters[0].name).toBe('test')
  })

  it('merges collection adapters with global adapters', () => {
    const config = baseConfig([uploadCollection('media')])
    const global = adapter('global')
    const local = adapter('local')

    const result = mediaPreview({
      adapters: [global],
      collections: { media: { adapters: [local] } },
    })(config)

    const names = result.custom?.['@seshuk/payload-plugin-media-preview']?.adapters.map(
      (a: MediaPreviewAdapter) => a.name,
    )
    expect(names).toContain('global')
    expect(names).toContain('local')
  })

  it('resolve returns data for matching doc', () => {
    const a = adapter('video', 'videoId')
    expect(a.resolve({ doc: { videoId: 'abc' }, url: '' })).toEqual({ mode: 'inline', props: { videoId: 'abc' } })
  })

  it('adapter resolve returns inline result with mode and props', () => {
    const a: MediaPreviewAdapter = {
      name: 'inline-test',
      Component: 'test-package/client#Viewer',
      resolve: () => ({ mode: 'inline', props: { src: 'https://example.com' } }),
    }
    const result = a.resolve({ doc: {}, url: '' })
    expect(result).toEqual({ mode: 'inline', props: { src: 'https://example.com' } })
  })

  it('adapter resolve returns newTab result with mode and url', () => {
    const a: MediaPreviewAdapter = {
      name: 'newtab-test',
      resolve: () => ({ mode: 'newTab', url: 'https://example.com/view' }),
    }
    const result = a.resolve({ doc: {}, url: '' })
    expect(result).toEqual({ mode: 'newTab', url: 'https://example.com/view' })
  })

  it('resolve returns null for non-matching doc', () => {
    const a = adapter('video', 'videoId')
    expect(a.resolve({ doc: {}, mimeType: 'image/jpeg', url: '' })).toBeNull()
  })
})

describe('select', () => {
  const selectFn = (collection: Collections[number], collections: MediaPreviewPluginConfig['collections']) => {
    const result = mediaPreview({ collections })(baseConfig([collection]))
    return result.collections!.find((c) => c.slug === collection.slug)!.select!
  }
  const args = (select?: SelectType) => ({ operation: 'read' as const, req: {} as PayloadRequest, select })

  it('loads the whole document when the preview column is selected', () => {
    const select = selectFn(uploadCollection('media'), { media: true })

    expect(select(args({ id: true, mediaPreview: true }))).toEqual({ mediaPreview: false })
    expect(select(args({ group: { mediaPreview: true } }))).toEqual({ mediaPreview: false })
  })

  it('keeps other selects unchanged', () => {
    const select = selectFn(uploadCollection('media'), { media: { field: false } })

    expect(select(args())).toBeUndefined()
    expect(select(args({ id: true, filename: true }))).toEqual({ id: true, filename: true })
    expect(select(args({ mediaPreview: false }))).toEqual({ mediaPreview: false })
  })

  it('applies on top of the collection select function', () => {
    const collection = { ...uploadCollection('media'), select: () => ({ mediaPreview: true }) } as Collections[number]
    const select = selectFn(collection, { media: true })

    expect(select(args({ id: true }))).toEqual({ mediaPreview: false })
  })
})

describe('field position', () => {
  const getName = (field?: Fields[number]) => (field && 'name' in field ? field.name : undefined)

  it('defaults to last', () => {
    const config = baseConfig([uploadCollection('media')])

    const result = mediaPreview({ collections: { media: true } })(config)
    const fields = result.collections!.find((c) => c.slug === 'media')!.fields

    expect(getName(fields.at(-1))).toBe('mediaPreview')
  })

  it('{ after: "alt" } inserts after target', () => {
    const config = baseConfig([uploadCollection('media', [{ name: 'alt', type: 'text' }])])

    const result = mediaPreview({ collections: { media: { field: { position: { after: 'alt' } } } } })(config)
    const fields = result.collections!.find((c) => c.slug === 'media')!.fields
    const altIdx = fields.findIndex((f) => 'name' in f && f.name === 'alt')

    expect(getName(fields[altIdx + 1])).toBe('mediaPreview')
  })

  it('"first" inserts at beginning', () => {
    const config = baseConfig([uploadCollection('media', [{ name: 'alt', type: 'text' }])])

    const result = mediaPreview({ collections: { media: { field: { position: 'first' } } } })(config)
    const fields = result.collections!.find((c) => c.slug === 'media')!.fields

    expect(getName(fields[0])).toBe('mediaPreview')
  })
})

describe('mediaPreviewField', () => {
  it('creates UI field with only a list Cell component', () => {
    const field = mediaPreviewField()

    expect(field.name).toBe('mediaPreview')
    expect(field.type).toBe('ui')

    const cellComp = field.admin?.components?.Cell as { path: string }

    expect(field.admin?.components?.Field).toBeUndefined()
    expect(cellComp?.path).toBe('@seshuk/payload-plugin-media-preview/rsc#MediaPreviewCell')
  })

  it('passes mode, contentMode and adapterNames to the Cell', () => {
    const field = mediaPreviewField({ adapterNames: ['test'], contentMode: { video: 'newTab' }, mode: 'fullscreen' })

    const comp = field.admin?.components?.Cell as {
      clientProps: Record<string, unknown>
      serverProps: Record<string, unknown>
    }
    expect(comp?.clientProps).toEqual({ contentMode: { video: 'newTab' }, mode: 'fullscreen' })
    expect(comp?.serverProps).toEqual({ adapterNames: ['test'] })
  })

  it('applies overrides', () => {
    const field = mediaPreviewField({ overrides: { admin: { position: 'sidebar' } } })
    expect(field.admin?.position).toBe('sidebar')
  })
})
