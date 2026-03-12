import type { Config } from 'payload'

import { describe, expect, it } from 'vitest'

import type { MediaPreviewAdapter } from '../src/types.js'

import { mediaPreviewField } from '../src/field.js'
import { mediaPreview } from '../src/index.js'

// Helpers

type Collections = NonNullable<Config['collections']>
type Fields = Collections[number]['fields']

const baseConfig = (collections: Collections = []): Config => ({
  collections: [{ slug: 'users', auth: true, fields: [] }, ...collections],
  i18n: {},
}) as Config

const uploadCollection = (slug: string, fields: Fields = []) => ({
  slug,
  fields,
  upload: true,
}) as Collections[number]

const hasField = (fields: Fields, name: string) =>
  fields.some((f) => 'name' in f && f.name === name)

const adapter = (name: string, field?: string): MediaPreviewAdapter => ({
  name,
  Component: `test-package/client#${name}`,
  resolve: ({ doc }) => (field && doc[field] ? { mode: 'inline', props: { [field]: doc[field] } } : null),
})

// Plugin

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

    const stored = result.custom?.['@seshuk/payload-media-preview']
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

    expect(en?.['@seshuk/payload-media-preview']?.open).toBe('Open')
    expect(en?.['@seshuk/payload-media-preview']?.close).toBe('Close')
  })
})

// Adapters

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
    const stored = result.custom?.['@seshuk/payload-media-preview']

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

    const names = result.custom?.['@seshuk/payload-media-preview']?.adapters.map(
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

// Field position

describe('field position', () => {
  const getName = (field?: Fields[number]) =>
    field && 'name' in field ? field.name : undefined

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

// Field definition

describe('mediaPreviewField', () => {
  it('creates UI field with correct name, type and component paths', () => {
    const field = mediaPreviewField()

    expect(field.name).toBe('mediaPreview')
    expect(field.type).toBe('ui')

    const fieldComp = field.admin?.components?.Field as { path: string }
    const cellComp = field.admin?.components?.Cell as { path: string }

    expect(fieldComp?.path).toBe('@seshuk/payload-media-preview/rsc#MediaPreview')
    expect(cellComp?.path).toBe('@seshuk/payload-media-preview/rsc#MediaPreviewCell')
  })

  it('passes mode and contentMode as clientProps', () => {
    const field = mediaPreviewField({ contentMode: { video: 'newTab' }, mode: 'fullscreen' })

    const comp = field.admin?.components?.Field as { clientProps: Record<string, unknown> }
    expect(comp?.clientProps?.mode).toBe('fullscreen')
    expect((comp?.clientProps?.contentMode as Record<string, string>)?.video).toBe('newTab')
  })

  it('passes adapterNames as serverProps', () => {
    const field = mediaPreviewField({ adapterNames: ['test'] })

    const comp = field.admin?.components?.Field as { serverProps: Record<string, unknown> }
    expect(comp?.serverProps?.adapterNames).toEqual(['test'])
  })

  it('applies overrides', () => {
    const field = mediaPreviewField({ overrides: { admin: { position: 'sidebar' } } })
    expect(field.admin?.position).toBe('sidebar')
  })
})
