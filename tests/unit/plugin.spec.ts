import type { Config, ImportMap, Payload, PayloadRequest, SanitizedConfig, SelectType, UIField, User } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { mediaPreview } from '@/index.js'
import type { AdapterMatch } from '@/server/adapterResolver.js'
import { resolveAdapter, resolveAdapterViewer } from '@/server/adapterResolver.js'
import { mediaPreviewField } from '@/server/field.js'
import { buildFilePreviewMap, FILE_PREVIEW_COMPONENT } from '@/server/filePreviewMap.js'
import { getExternalViewerHint } from '@/server/getPreviewData.js'
import { PLUGIN_KEY } from '@/shared/constants.js'
import type { MediaPreviewAdapter, MediaPreviewPluginConfig } from '@/shared/types/index.js'

import { DOCX } from '../helpers/shared/mimeTypes.js'

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

const run = (options: MediaPreviewPluginConfig, collections: Collections = [uploadCollection('media')]) =>
  mediaPreview(options)(baseConfig(collections))

const media = (config: Config) => config.collections!.find((c) => c.slug === 'media')!

const hasField = (fields: Fields, name: string) => fields.some((f) => 'name' in f && f.name === name)

const adapter = (name: string, field?: string): MediaPreviewAdapter => ({
  name,
  Component: `test-package/client#${name}`,
  resolve: ({ doc }) => (field && doc[field] ? { mode: 'inline', props: { [field]: doc[field] } } : null),
})

describe('mediaPreview plugin', () => {
  it('injects field only into configured upload collections', () => {
    const result = run({ collections: { media: true } }, [uploadCollection('media'), uploadCollection('other')])
    const other = result.collections!.find((c) => c.slug === 'other')

    expect(hasField(media(result).fields, 'mediaPreview')).toBe(true)
    expect(hasField(other!.fields, 'mediaPreview')).toBe(false)
  })

  it('skips non-upload collections', () => {
    const result = run({ collections: { posts: true } as never }, [
      { slug: 'posts', fields: [] } as Collections[number],
    ])

    const posts = result.collections!.find((c) => c.slug === 'posts')
    expect(hasField(posts!.fields, 'mediaPreview')).toBe(false)
  })

  it('does not inject field when field: false, but registers adapters', () => {
    const result = run({ collections: { media: { adapters: [adapter('test')], field: false } } })

    expect(hasField(media(result).fields, 'mediaPreview')).toBe(false)

    const stored = result.custom?.['@seshuk/payload-plugin-media-preview']
    expect(stored?.adapters).toHaveLength(1)
    expect(stored?.adapters[0].name).toBe('test')
  })

  it('returns config unchanged when enabled: false', () => {
    const config = baseConfig([uploadCollection('media')])
    const result = mediaPreview({ collections: { media: true }, enabled: false })(config)
    expect(result).toBe(config)
  })

  it('registers under the package slug', () => {
    expect(mediaPreview({ collections: {} }).slug).toBe('@seshuk/payload-plugin-media-preview')
  })

  it('keeps the user i18n, admin dependencies, custom and endpoints next to its own', () => {
    const config = {
      ...baseConfig([uploadCollection('media')]),
      admin: { dependencies: { mine: { type: 'component', path: 'pkg#Mine' } } },
      custom: { mine: true },
      endpoints: [{ handler: () => Response.json({}), method: 'get', path: '/mine' }],
      i18n: { translations: { en: { mine: { hello: 'Hi' } } } },
    } as Config

    const result = mediaPreview({ adapters: [adapter('custom')], collections: { media: { externalViewer: true } } })(
      config,
    )

    expect(result.admin?.dependencies).toEqual({
      mine: { type: 'component', path: 'pkg#Mine' },
      'media-preview-viewer-custom': { type: 'component', path: 'test-package/client#custom' },
    })
    expect(result.custom).toMatchObject({ mine: true, [PLUGIN_KEY]: { adapters: [{ name: 'custom' }] } })
    expect(result.endpoints?.map((e) => e.path)).toEqual([
      '/mine',
      '/media-preview/url',
      '/media-preview/file/:token/:filename',
    ])
    expect(result.i18n?.translations?.en).toMatchObject({
      mine: { hello: 'Hi' },
      [PLUGIN_KEY]: { close: 'Close', open: 'Open' },
    })
  })
})

describe('filePreview', () => {
  const getUpload = (config: Config) => media(config).upload as Exclude<Collections[number]['upload'], boolean>
  const getMap = (config: Config) =>
    getUpload(config)?.admin?.components?.filePreview as Record<string, { path: string; serverProps: object }>

  it('registers the plugin map for the collection and its adapter mimeTypes', () => {
    const stream = { ...adapter('stream'), mimeTypes: ['video/*'] }

    expect(getMap(run({ collections: { media: true } }))).toEqual(buildFilePreviewMap('media'))
    expect(getMap(run({ collections: { media: { adapters: [stream] } } }))).toEqual(
      buildFilePreviewMap('media', ['video/*']),
    )
  })

  it('registers the map with field: false', () => {
    expect(getMap(run({ collections: { media: { field: false } } }))[DOCX]).toBeDefined()
  })

  it('does not register with filePreview: false', () => {
    expect(getUpload(run({ collections: { media: { filePreview: false } } }))).toBe(true)
  })

  it('merges the user filePreview map and keeps the upload options', () => {
    const collection = {
      slug: 'media',
      fields: [],
      upload: { admin: { components: { filePreview: { [DOCX]: './Docx#Preview' } } }, staticDir: 'uploads' },
    } as Collections[number]
    const result = run({ collections: { media: true } }, [collection])

    expect(getMap(result)[DOCX]).toBe('./Docx#Preview')
    expect(getMap(result)['text/*']?.path).toBe(FILE_PREVIEW_COMPONENT)
    expect(getUpload(result).staticDir).toBe('uploads')
  })
})

describe('externalViewer', () => {
  const getSettings = (config: Config) => config.custom?.['@seshuk/payload-plugin-media-preview']?.collections
  const paths = (config: Config) => (config.endpoints ?? []).map((e) => e.path)
  const mediaAndDocs = [uploadCollection('media'), uploadCollection('docs')]

  it('is off by default and adds no endpoints', () => {
    const result = run({ collections: { media: true } })

    expect(getSettings(result).media.externalViewer).toBe(false)
    expect(paths(result)).toEqual([])
  })

  it('adds the endpoints when a collection enables it', () => {
    const result = run({ collections: { media: { externalViewer: { office: true } } } })

    expect(getSettings(result).media.externalViewer).toEqual({ expiresIn: 600, google: false, office: true })
    expect(paths(result)).toEqual(['/media-preview/url', '/media-preview/file/:token/:filename'])
  })

  it('lets the collection override the global value', () => {
    const result = run(
      { collections: { docs: true, media: { externalViewer: false } }, externalViewer: true },
      mediaAndDocs,
    )

    expect(getSettings(result).media.externalViewer).toBe(false)
    expect(getSettings(result).docs.externalViewer).toMatchObject({ google: true, office: true })
  })

  it('stores collection adapter names', () => {
    const result = run(
      { adapters: [adapter('global')], collections: { docs: true, media: { adapters: [adapter('local')] } } },
      mediaAndDocs,
    )

    expect(getSettings(result).media.adapterNames).toEqual(['local'])
    expect(getSettings(result).docs.adapterNames).toEqual(['global'])
  })

  it('throws when two different adapters share a name', () => {
    const shared = adapter('shared')
    const message = 'two different adapters are named "shared"'

    expect(() => run({ adapters: [shared], collections: { media: { adapters: [shared] } } })).not.toThrow()
    expect(() => run({ adapters: [shared], collections: { media: { adapters: [adapter('shared')] } } })).toThrow(
      message,
    )
    expect(() =>
      run(
        { collections: { docs: { adapters: [adapter('shared')] }, media: { adapters: [adapter('shared')] } } },
        mediaAndDocs,
      ),
    ).toThrow(message)
  })

  it('does not give one collection the adapters of another', () => {
    const signer = { ...adapter('signer'), mimeTypes: ['video/*'], signUrl: () => 'https://cdn.example.com/a' }
    const result = run(
      { collections: { docs: { externalViewer: true }, media: { adapters: [signer], externalViewer: true } } },
      mediaAndDocs,
    )
    const config = {
      ...result,
      routes: { api: '/api' },
      serverURL: 'http://localhost:3000',
    } as unknown as SanitizedConfig
    const doc = { filesize: 1000, mimeType: DOCX, url: '/api/docs/file/a.docx' }

    expect(getSettings(result).docs.adapterNames).toEqual([])
    expect(getExternalViewerHint(config, 'docs', doc)).toBe('errorPrivateServer')
    expect(getExternalViewerHint(config, 'media', { ...doc, url: '/api/media/file/a.docx' })).toBeUndefined()

    const docs = result.collections!.find((c) => c.slug === 'docs')!
    const cell = docs.fields.find((f) => 'name' in f && f.name === 'mediaPreview') as UIField
    expect(cell.admin!.components!.Cell).toMatchObject({ serverProps: { adapterNames: [] } })
  })
})

describe('adapters', () => {
  it('merges collection adapters with global adapters', () => {
    const result = run({ adapters: [adapter('global')], collections: { media: { adapters: [adapter('local')] } } })

    const names = result.custom?.['@seshuk/payload-plugin-media-preview']?.adapters.map(
      (a: MediaPreviewAdapter) => a.name,
    )
    expect(names).toEqual(['global', 'local'])
  })

  it('awaits async adapters and passes collectionSlug, payload and user', async () => {
    const resolve = vi.fn(async () => ({ mode: 'newTab' as const, url: 'https://cdn.example.com/presigned' }))
    const skip: MediaPreviewAdapter = { name: 'skip', resolve: async () => null }
    const signer: MediaPreviewAdapter = { name: 'signer', resolve }
    const payload = { config: { custom: { [PLUGIN_KEY]: { adapters: [skip, signer] } } } } as unknown as Payload
    const user = { id: 1 } as unknown as User

    const match = await resolveAdapter(undefined, { collectionSlug: 'media', doc: { id: 1 }, payload, user })

    expect(match).toEqual({
      adapterName: 'signer',
      result: { mode: 'newTab', url: 'https://cdn.example.com/presigned' },
    })
    expect(resolve).toHaveBeenCalledWith({ collectionSlug: 'media', doc: { id: 1 }, payload, user })
  })

  describe('resolveAdapterViewer', () => {
    const Viewer = () => null
    const config = run({
      adapters: [adapter('custom'), { name: 'plain', resolve: () => null }],
      collections: { media: true },
    }) as unknown as SanitizedConfig
    const payloadLike = { config, importMap: { 'test-package/client#custom': Viewer } as unknown as ImportMap }

    it('renders the adapter Component with the inline props', () => {
      const match: AdapterMatch = { adapterName: 'custom', result: { mode: 'inline', props: { src: 'a.mp4' } } }
      expect(resolveAdapterViewer(payloadLike, match)).toMatchObject({ type: Viewer, props: { src: 'a.mp4' } })
    })

    it.each<[string, AdapterMatch | null]>([
      ['no match', null],
      [
        'an inline result of an adapter without Component',
        { adapterName: 'plain', result: { mode: 'inline', props: {} } },
      ],
      ['a newTab result', { adapterName: 'custom', result: { mode: 'newTab', url: 'https://example.com/view' } }],
    ])('returns null for %s', (_, match) => {
      expect(resolveAdapterViewer(payloadLike, match)).toBeNull()
    })
  })
})

describe('select', () => {
  const selectFn = (collection: Collections[number], collections: MediaPreviewPluginConfig['collections']) =>
    media(run({ collections }, [collection])).select!
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

  it.each<[SelectType | undefined, SelectType]>([
    [{ mediaPreview: true }, { mediaPreview: false }],
    [{ filename: true }, { filename: true }],
    [undefined, { id: true }],
  ])('applies on top of the collection select function returning %j', (own, expected) => {
    const collection = { ...uploadCollection('media'), select: () => own } as Collections[number]

    expect(selectFn(collection, { media: true })(args({ id: true }))).toEqual(expected)
  })
})

describe('field position', () => {
  const getName = (field?: Fields[number]) => (field && 'name' in field ? field.name : undefined)

  it.each([
    [undefined, -1],
    ['first', 0],
    [{ after: 'alt' }, 1],
  ] as const)('inserts the field at %j', (position, index) => {
    const fields: Fields = [
      { name: 'alt', type: 'text' },
      { name: 'caption', type: 'text' },
    ]
    const result = run({ collections: { media: { field: { position } } } }, [uploadCollection('media', fields)])

    expect(getName(media(result).fields.at(index))).toBe('mediaPreview')
  })

  it('throws when the target field does not exist', () => {
    expect(() => run({ collections: { media: { field: { position: { after: 'alt' } } } } })).toThrow(
      'Field path "alt" not found',
    )
  })
})

describe('field options', () => {
  const cellOf = (result: Config) => {
    const field = media(result).fields.at(-1) as UIField
    return field.admin?.components?.Cell as {
      clientProps: Record<string, unknown>
      serverProps: Record<string, unknown>
    }
  }

  it('passes field mode and contentMode to the Cell', () => {
    const result = run({
      adapters: [adapter('test')],
      collections: { media: { field: { contentMode: { video: 'newTab' }, mode: 'fullscreen' } } },
    })

    expect(cellOf(result).clientProps).toEqual({ contentMode: { video: 'newTab' }, mode: 'fullscreen' })
    expect(cellOf(result).serverProps).toEqual({ adapterNames: ['test'] })
  })

  it('adds the column with defaults for field: true', () => {
    expect(cellOf(run({ collections: { media: { field: true } } })).clientProps).toEqual({
      contentMode: undefined,
      mode: 'auto',
    })
  })

  it.each(['mode', 'contentMode'])('throws on the removed collection-level %s with a hint', (key) => {
    const options = { collections: { media: { [key]: 'fullscreen' } } } as MediaPreviewPluginConfig

    expect(() => mediaPreview(options)(baseConfig([uploadCollection('media')]))).toThrow(
      `[@seshuk/payload-plugin-media-preview] collections.media.${key} was renamed to collections.media.field.${key}`,
    )
    expect(() => mediaPreview({ ...options, enabled: false })(baseConfig())).toThrow(/was renamed/)
  })

  it('skips a collection set to false', () => {
    const result = media(run({ collections: { media: false } }))

    expect(hasField(result.fields, 'mediaPreview')).toBe(false)
    expect(result.upload).toBe(true)
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

  it('applies overrides', () => {
    const field = mediaPreviewField({ overrides: { admin: { width: '50%' } } })
    expect(field.admin?.width).toBe('50%')
  })

  it('keeps the plugin Cell next to override components', () => {
    const field = mediaPreviewField({ overrides: { admin: { components: { Label: 'my-pkg#Label' } } } })
    const cell = field.admin?.components?.Cell as { path: string }

    expect(field.admin?.components?.Label).toBe('my-pkg#Label')
    expect(cell.path).toBe('@seshuk/payload-plugin-media-preview/rsc#MediaPreviewCell')
  })

  it('uses an override Cell when set', () => {
    const field = mediaPreviewField({ overrides: { admin: { components: { Cell: 'my-pkg#Cell' } } } })

    expect(field.admin?.components?.Cell).toBe('my-pkg#Cell')
  })
})
