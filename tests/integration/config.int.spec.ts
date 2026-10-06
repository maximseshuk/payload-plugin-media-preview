import path from 'node:path'

import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildFilePreviewMap } from '@/server/filePreviewMap.js'

import { getPayload } from '../helpers/int/getPayload.js'
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

  it.each(['media', 'media-public'])('keeps the filePreview map of %s through sanitize', (slug) => {
    expect(payload.collections[slug].config.upload.admin?.components?.filePreview).toEqual(
      buildFilePreviewMap(slug, ['video/*']),
    )
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
