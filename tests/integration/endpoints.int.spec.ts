import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { Payload } from 'payload'
import { handleEndpoints } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createFileToken } from '@/server/fileToken.js'

import { getPayload } from '../helpers/int/getPayload.js'
import { devUser } from '../helpers/shared/buildConfigWithDefaults.js'
import { DOCX, XLSX } from '../helpers/shared/mimeTypes.js'

const SERVER_URL = 'https://cms.example.com'
const otherUser = { email: 'other@example.com', password: 'test' }
const fixture = (name: string) => path.resolve(import.meta.dirname, '../fixtures', name)

describe('media preview endpoints', () => {
  let payload: Payload
  let devToken: string
  let otherToken: string

  const request = (url: string, token?: string) =>
    handleEndpoints({
      config: payload.config,
      request: new Request(new URL(url, SERVER_URL), {
        headers: token ? { Authorization: `JWT ${token}` } : {},
      }),
    })

  const upload = (collection: 'media' | 'media-public', file: string, data: Record<string, unknown> = {}) =>
    payload.create({ collection, data, filePath: fixture(file), overrideAccess: true })

  const signUrl = (collection: string, id: number | string, token = devToken) =>
    request(`/api/media-preview/url?collection=${collection}&id=${id}`, token)

  const signedUrlOf = async (collection: string, id: number | string, token?: string) => {
    const res = await signUrl(collection, id, token)
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    return ((await res.json()) as { url: string }).url
  }

  beforeAll(async () => {
    payload = await getPayload('preview')
    await payload.create({ collection: 'users', data: otherUser, overrideAccess: true })
    devToken = (await payload.login({ collection: 'users', data: devUser })).token!
    otherToken = (await payload.login({ collection: 'users', data: otherUser })).token!
  })

  afterAll(async () => {
    await payload.destroy()
  })

  describe('GET /api/media-preview/url', () => {
    it('returns 401 without a user', async () => {
      const doc = await upload('media', 'test-document.docx')
      expect((await request(`/api/media-preview/url?collection=media&id=${doc.id}`)).status).toBe(401)
    })

    it('returns 404 for a collection or file type the viewers do not handle', async () => {
      const image = await upload('media', 'test-image.png')
      const docx = await upload('media', 'test-document.docx')

      expect((await signUrl('media', image.id)).status).toBe(404)
      expect((await signUrl('users', docx.id)).status).toBe(404)
      expect((await request('/api/media-preview/url?collection=media', devToken)).status).toBe(404)
    })

    it('returns 404 when the user cannot read the document', async () => {
      const doc = await upload('media', 'test-document.docx', { locked: true })

      expect((await signUrl('media', doc.id, otherToken)).status).toBe(404)
      expect((await signUrl('media', doc.id)).status).toBe(200)
    })

    it('returns 404 when the user cannot read the file', async () => {
      const locked = await upload('media', 'test-document.docx', { fileLocked: true })
      const open = await upload('media', 'test-document.docx')

      expect((await signUrl('media', locked.id, otherToken)).status).toBe(404)
      expect((await signUrl('media', open.id, otherToken)).status).toBe(200)
    })

    it('prefers the adapter signUrl result over a public URL', async () => {
      const docx = await upload('media-public', 'test-document.docx')
      const xlsx = await upload('media-public', 'test-spreadsheet.xlsx')

      expect(await signedUrlOf('media-public', docx.id)).toBe(`https://cdn.example.com/${docx.filename}?expiresIn=120`)
      expect(await signedUrlOf('media-public', xlsx.id)).toBe(`https://files.example.com/${xlsx.filename}`)
    })

    it('returns a token URL when Payload serves the file', async () => {
      const doc = await upload('media', 'test-document.docx')
      const url = await signedUrlOf('media', doc.id)

      expect(doc.url).toBe(`${SERVER_URL}/api/media/file/${doc.filename}`)
      const { origin, pathname } = new URL(url)
      expect(origin).toBe(SERVER_URL)
      expect(pathname.split('/')).toEqual([
        '',
        'api',
        'media-preview',
        'file',
        expect.stringMatching(/^[\w-]+\.[\w-]+$/),
        doc.filename,
      ])
    })

    it('signs the draft version', async () => {
      const doc = await upload('media', 'test-document.docx')
      const draft = await payload.update({
        id: doc.id,
        collection: 'media',
        data: {},
        draft: true,
        filePath: fixture('test-spreadsheet.xlsx'),
        overrideAccess: true,
      })
      const url = await signedUrlOf('media', doc.id)

      expect(draft.filename).not.toBe(doc.filename)
      expect(url.endsWith(`/${draft.filename}`)).toBe(true)

      const res = await request(url)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe(XLSX)
    })
  })

  describe('GET /api/media-preview/file/:token/:filename', () => {
    const tokenUrl = async () => {
      const doc = await upload('media', 'test-document.docx')
      return { doc, url: await signedUrlOf('media', doc.id) }
    }

    it('serves the file for a valid token without a session', async () => {
      const { url } = await tokenUrl()
      const res = await request(url)
      const bytes = readFileSync(fixture('test-document.docx'))

      expect(res.status).toBe(200)
      expect(Buffer.from(await res.arrayBuffer()).equals(bytes)).toBe(true)
      expect(res.headers.get('Content-Type')).toBe(DOCX)
      expect(res.headers.get('Content-Length')).toBe(String(bytes.length))
      expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'none'; sandbox")
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('Cache-Control')).toBe('no-store')
    })

    it('returns 404 for an expired token', async () => {
      const { doc } = await tokenUrl()
      const token = createFileToken({
        id: doc.id,
        collection: 'media',
        expiresAt: Math.floor(Date.now() / 1000) - 1,
        filename: doc.filename!,
        secret: payload.secret,
      })

      expect((await request(`/api/media-preview/file/${token}/${doc.filename}`)).status).toBe(404)
    })

    it('returns 404 for a tampered token', async () => {
      const { doc, url } = await tokenUrl()
      const [token, filename] = url.split('/').slice(-2)
      const mac = token.split('.')[1]
      const expiresAt = (Math.floor(Date.now() / 1000) + 9999).toString(36)
      const forged = Buffer.from(`media:${expiresAt}:${doc.id}`).toString('base64url')

      expect((await request(url)).status).toBe(200)
      expect((await request(`/api/media-preview/file/${forged}.${mac}/${filename}`)).status).toBe(404)
    })

    it('returns 404 for another filename', async () => {
      const { url } = await tokenUrl()
      expect((await request(url.replace(/[^/]+$/, 'other.docx'))).status).toBe(404)
    })

    it('returns 404 for a deleted document', async () => {
      const { doc, url } = await tokenUrl()
      await payload.delete({ id: doc.id, collection: 'media', overrideAccess: true })

      expect((await request(url)).status).toBe(404)
    })
  })
})
