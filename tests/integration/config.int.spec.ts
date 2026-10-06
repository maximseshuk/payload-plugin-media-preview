import path from 'node:path'

import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { mediaPreview } from '@/index.js'
import { FILE_PREVIEW_COMPONENT } from '@/server/filePreviewMap.js'

import { getPayload } from '../helpers/int/getPayload.js'
import { buildConfigWithDefaults } from '../helpers/shared/buildConfigWithDefaults.js'
import { DOCX } from '../helpers/shared/mimeTypes.js'

const fixture = (name: string) => path.resolve(import.meta.dirname, '../fixtures', name)

describe('mediaPreview config', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload('preview')
  })

  afterAll(async () => {
    await payload.destroy()
  })

  const filePreviewOf = (slug: string) => {
    const upload = payload.collections[slug].config.upload
    return upload.admin?.components?.filePreview as Record<string, unknown>
  }

  it('leaves Payload previews alone and claims the rest of the types', () => {
    const map = filePreviewOf('media')
    const component = { path: FILE_PREVIEW_COMPONENT, serverProps: { collectionSlug: 'media' } }

    for (const type of ['image/*', 'audio/*', 'application/pdf']) {
      expect(map[type]).toBe(false)
    }
    for (const type of ['*', DOCX, 'text/*', 'application/json', 'image/vnd.adobe.photoshop']) {
      expect(map[type]).toEqual(component)
    }
  })

  it('claims the adapter mimeTypes', () => {
    expect(filePreviewOf('media')['video/*']).toMatchObject({ path: FILE_PREVIEW_COMPONENT })
    expect(filePreviewOf('media-public')['video/*']).toMatchObject({ path: FILE_PREVIEW_COMPONENT })
  })

  it('registers both endpoints when a collection has externalViewer', () => {
    const paths = payload.config.endpoints.map((endpoint) => endpoint.path)

    expect(paths).toContain('/media-preview/url')
    expect(paths).toContain('/media-preview/file/:token/:filename')
  })

  it('loads the whole document when the preview column is selected', async () => {
    const created = await payload.create({
      collection: 'media',
      data: {},
      filePath: fixture('test-document.docx'),
      overrideAccess: true,
    })

    const [withPreview] = (
      await payload.find({ collection: 'media', overrideAccess: true, select: { mediaPreview: true } as never })
    ).docs
    expect(withPreview).toMatchObject({ filename: created.filename, mimeType: DOCX, url: created.url })

    const [narrow] = (await payload.find({ collection: 'media', overrideAccess: true, select: { filename: true } }))
      .docs
    expect(narrow).toEqual({ id: created.id, filename: created.filename })
  })
})

describe('mediaPreview config without externalViewer', () => {
  it('adds no endpoints and keeps a user filePreview map with a fallback', async () => {
    const filePreview = { '*': './Custom#Preview' }
    const config = await buildConfigWithDefaults({
      collections: [{ slug: 'files', fields: [], upload: { admin: { components: { filePreview } } } }],
      plugins: [mediaPreview({ collections: { files: true } })],
    })
    const files = config.collections.find((collection) => collection.slug === 'files')!

    expect(config.endpoints.map((endpoint) => endpoint.path)).not.toContain('/media-preview/url')
    expect(files.upload.admin?.components?.filePreview).toEqual(filePreview)
  })
})
