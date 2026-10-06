import path from 'node:path'

import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { resolveAdapter } from '@/server/adapterResolver.js'
import { getPluginData } from '@/server/settings.js'

import { getPayload } from '../helpers/int/getPayload.js'

const fixture = (name: string) => path.resolve(import.meta.dirname, '../fixtures', name)

describe('adapters', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload('preview')
  })

  afterAll(async () => {
    await payload.destroy()
  })

  const resolveFor = async (collectionSlug: 'media' | 'media-public', file: string) => {
    const doc = await payload.create({
      collection: collectionSlug,
      data: {},
      filePath: fixture(file),
      overrideAccess: true,
    })
    const { adapterNames } = getPluginData(payload.config).collections[collectionSlug]
    const match = await resolveAdapter(adapterNames, { collectionSlug, doc, mimeType: doc.mimeType!, payload })
    return { doc, match }
  }

  it('awaits an async resolve that reads through payload', async () => {
    const { doc, match } = await resolveFor('media-public', 'test-video.mp4')

    expect(match).toEqual({
      adapterName: 'player',
      result: { mode: 'newTab', url: `https://player.example.com/${doc.filename}?of=1` },
    })
  })

  it('returns null when no adapter matches', async () => {
    const { match } = await resolveFor('media', 'test-image.png')
    expect(match).toBeNull()
  })
})
