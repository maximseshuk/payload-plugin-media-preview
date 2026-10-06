import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { PayloadHandler, PayloadRequest } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { endpoints } from '@/server/endpoints.js'
import { createFileToken, parseFileToken, verifyFileToken } from '@/server/fileToken.js'
import { resolveExternalViewer } from '@/server/settings.js'
import { PLUGIN_KEY } from '@/shared/constants.js'
import type { MediaPreviewAdapter } from '@/shared/types/index.js'

import { DOCX, XLSX } from '../helpers/shared/mimeTypes.js'

const SECRET = 'test-secret'
const now = () => Math.floor(Date.now() / 1000)

describe('file token', () => {
  const args = { id: 42, collection: 'media', expiresAt: now() + 600, filename: 'report.docx', secret: SECRET }
  const verify = (token: string, overrides: Partial<{ filename: string; now: number; secret: string }> = {}) => {
    const parsed = parseFileToken(token)
    return !!parsed && verifyFileToken(parsed, { filename: args.filename, secret: SECRET, ...overrides })
  }

  it('verifies a valid token and stays short', () => {
    const token = createFileToken(args)
    expect(verify(token)).toBe(true)
    expect(parseFileToken(token)).toMatchObject({ id: '42', collection: 'media', expiresAt: args.expiresAt })
    expect(token.length).toBeLessThanOrEqual(80)
  })

  it('keeps ids with colons', () => {
    const token = createFileToken({ ...args, id: 'a:b:c' })
    expect(parseFileToken(token)?.id).toBe('a:b:c')
  })

  it('rejects an expired token', () => {
    const token = createFileToken({ ...args, expiresAt: now() - 1 })
    expect(verify(token)).toBe(false)
    expect(verify(createFileToken(args), { now: args.expiresAt })).toBe(false)
  })

  it('rejects a different filename or secret', () => {
    const token = createFileToken(args)
    expect(verify(token, { filename: 'other.docx' })).toBe(false)
    expect(verify(token, { secret: 'other-secret' })).toBe(false)
  })

  it('rejects a tampered payload or MAC', () => {
    const [payload, mac] = createFileToken(args).split('.')
    const forged = (value: string) => Buffer.from(value).toString('base64url')
    expect(verify(`${forged(`media:${(args.expiresAt + 1000).toString(36)}:42`)}.${mac}`)).toBe(false)
    expect(verify(`${forged(`media:${args.expiresAt.toString(36)}:43`)}.${mac}`)).toBe(false)
    expect(verify(`${forged(`other:${args.expiresAt.toString(36)}:42`)}.${mac}`)).toBe(false)
    expect(verify(`${payload}.${mac[0] === 'A' ? 'B' : 'A'}${mac.slice(1)}`)).toBe(false)
    expect(verify(`${payload}.${mac.slice(0, 8)}`)).toBe(false)
  })

  it.each([
    undefined,
    '',
    'abc',
    'a.b.c',
    `${'a'.repeat(600)}.b`,
    `${Buffer.from('nocolons').toString('base64url')}.x`,
  ])('rejects malformed token %j', (token) => {
    expect(parseFileToken(token)).toBeNull()
  })
})

type Doc = Record<string, unknown>
type Where = { and: Record<string, { equals: unknown }>[] }
type ReadOptions = {
  disableErrors?: boolean
  draft?: boolean
  id: number | string
  overrideAccess?: boolean
  showHiddenFields?: boolean
}

const [signEndpoint, fileEndpoint] = endpoints
const signHandler = signEndpoint.handler as PayloadHandler
const fileHandler = fileEndpoint.handler as PayloadHandler

const createReq = (options: {
  adapters?: MediaPreviewAdapter[]
  docs?: Doc[]
  externalViewer?: boolean
  fileBody?: string
  handlers?: unknown[]
  query?: Record<string, string>
  read?: (args: { data?: Doc; isReadingStaticFile?: boolean }) => unknown
  routeParams?: Record<string, string>
  serverURL?: string
  staticDir?: string
  url?: string
  user?: object | null
}) => {
  const docs = options.docs ?? []
  const handler = vi.fn(async () => new Response(options.fileBody ?? 'file-bytes', { headers: { ETag: '"e1"' } }))
  const findByID = vi.fn(async ({ disableErrors, draft, id, overrideAccess, showHiddenFields }: ReadOptions) => {
    const doc = docs.find((d) => String(d.id) === String(id))
    if (!doc || (overrideAccess === false && doc.private)) {
      if (disableErrors) {
        return null
      }
      throw new Error('Not Found')
    }
    const { _draft, _objectKey, ...rest } = doc
    return { ...rest, ...(draft ? (_draft as Doc) : {}), ...(showHiddenFields ? { _objectKey } : {}) }
  })
  const findOne = vi.fn(
    async ({ where }: { where: Where }) =>
      docs.find((d) =>
        where.and.every((c) => Object.entries(c).every(([k, v]) => String(d[k]) === String(v.equals))),
      ) ?? null,
  )
  const config = {
    custom: {
      [PLUGIN_KEY]: {
        adapters: options.adapters ?? [],
        collections: { media: { externalViewer: resolveExternalViewer(options.externalViewer ?? true) } },
      },
    },
    routes: { api: '/api' },
    serverURL: options.serverURL ?? 'https://cms.example.com',
  }
  const collection = {
    slug: 'media',
    access: { read: options.read },
    upload: { handlers: options.handlers ?? [handler], staticDir: options.staticDir },
  }
  const req = {
    payload: {
      collections: { media: { config: collection } },
      config,
      db: { findOne },
      findByID,
      secret: SECRET,
    },
    routeParams: options.routeParams,
    searchParams: new URLSearchParams(options.query),
    url: options.url ?? 'https://cms.example.com/api/media-preview/file',
    user: options.user === undefined ? { id: 1 } : options.user,
  } as unknown as PayloadRequest
  return { findByID, findOne, handler, req }
}

const docx = { id: 7, filename: 'report.docx', filesize: 1000, mimeType: DOCX, url: '/api/media/file/report.docx' }

describe('sign URL endpoint', () => {
  it('returns 401 without a user', async () => {
    const { req } = createReq({ docs: [docx], query: { id: '7', collection: 'media' }, user: null })
    expect((await signHandler(req)).status).toBe(401)
  })

  it('returns 404 for a collection without externalViewer', async () => {
    const { findByID, req } = createReq({ docs: [docx], query: { id: '7', collection: 'users' } })
    expect((await signHandler(req)).status).toBe(404)
    expect(findByID).not.toHaveBeenCalled()
  })

  it('returns 404 when read access is denied', async () => {
    const { findByID, req } = createReq({ docs: [{ ...docx, private: true }], query: { id: '7', collection: 'media' } })
    expect((await signHandler(req)).status).toBe(404)
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false, user: { id: 1 } }))
  })

  it('returns 404 on a private server', async () => {
    const { req } = createReq({
      docs: [docx],
      query: { id: '7', collection: 'media' },
      serverURL: 'http://localhost:3102',
    })
    const res = await signHandler(req)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ hint: 'errorPrivateServer' })
  })

  it('returns the hint of a file the viewer refuses', async () => {
    const xlsx = { ...docx, filename: 'big.xlsx', filesize: 6 * 1024 * 1024, mimeType: XLSX }
    const { req } = createReq({ docs: [xlsx], query: { id: '7', collection: 'media' } })
    const res = await signHandler(req)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ hint: 'errorTooLarge' })
  })

  it('returns 404 for a direct URL on a private host', async () => {
    const direct = { ...docx, url: 'http://localhost:9000/bucket/report.docx' }
    const { req } = createReq({ docs: [direct], query: { id: '7', collection: 'media' } })
    expect(await (await signHandler(req)).json()).toEqual({ hint: 'errorPrivateServer' })
  })

  it('returns a signed URL for a proxied file', async () => {
    const { req } = createReq({ docs: [docx], query: { id: '7', collection: 'media' } })
    const res = await signHandler(req)
    const { url } = (await res.json()) as { url: string }

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(url).toMatch(/^https:\/\/cms\.example\.com\/api\/media-preview\/file\/[\w-]+\.[\w-]+\/report\.docx$/)
    expect(url.length).toBeLessThanOrEqual(120)
  })

  it('passes a direct URL through as-is', async () => {
    const direct = { ...docx, url: 'https://bucket.example.com/report.docx' }
    const { req } = createReq({ docs: [direct], query: { id: '7', collection: 'media' } })
    expect(await (await signHandler(req)).json()).toEqual({ url: 'https://bucket.example.com/report.docx' })
  })

  it('signs the draft version the edit view shows', async () => {
    const draft = { ...docx, _draft: { filename: 'draft.docx', url: '/api/media/file/draft.docx' } }
    const { findByID, req } = createReq({ docs: [draft], query: { id: '7', collection: 'media' } })
    const { url } = (await (await signHandler(req)).json()) as { url: string }

    expect(url).toMatch(/\/draft\.docx$/)
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ draft: true }))
  })

  it('returns 404 when access denies reading the file', async () => {
    const read = vi.fn(({ isReadingStaticFile }: { isReadingStaticFile?: boolean }) => !isReadingStaticFile)
    const { req } = createReq({ docs: [docx], query: { id: '7', collection: 'media' }, read })

    expect((await signHandler(req)).status).toBe(404)
    expect(read).toHaveBeenCalledWith(
      expect.objectContaining({ data: { filename: 'report.docx' }, isReadingStaticFile: true }),
    )
  })

  it('checks the file access constraint against the document', async () => {
    const read = ({ isReadingStaticFile }: { isReadingStaticFile?: boolean }) =>
      isReadingStaticFile ? { owner: { equals: 1 } } : true
    const query = { id: '7', collection: 'media' }

    const own = createReq({ docs: [{ ...docx, owner: 1 }], query, read })
    expect((await signHandler(own.req)).status).toBe(200)
    expect(own.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { and: [{ id: { equals: '7' } }, { filename: { equals: 'report.docx' } }, { owner: { equals: 1 } }] },
      }),
    )

    const other = createReq({ docs: [{ ...docx, owner: 2 }], query, read })
    expect((await signHandler(other.req)).status).toBe(404)
  })

  it('does not sign a draft-only file when access returns a query', async () => {
    const read = ({ isReadingStaticFile }: { isReadingStaticFile?: boolean }) =>
      isReadingStaticFile ? { owner: { equals: 1 } } : true
    const draft = { ...docx, _draft: { filename: 'draft.docx', url: '/api/media/file/draft.docx' }, owner: 1 }
    const { req } = createReq({ docs: [draft], query: { id: '7', collection: 'media' }, read })
    expect((await signHandler(req)).status).toBe(404)
  })

  it('prefers the adapter signUrl result', async () => {
    const signUrl = vi.fn(() => 'https://cdn.example.com/signed')
    const adapter: MediaPreviewAdapter = { name: 'signer', resolve: () => null, signUrl }
    const { req } = createReq({ adapters: [adapter], docs: [docx], query: { id: '7', collection: 'media' } })

    expect(await (await signHandler(req)).json()).toEqual({ url: 'https://cdn.example.com/signed' })
    expect(signUrl).toHaveBeenCalledWith(expect.objectContaining({ expiresIn: 600, url: docx.url }))
  })

  it('passes hidden fields to signUrl', async () => {
    const signUrl = vi.fn(() => 'https://cdn.example.com/signed')
    const adapter: MediaPreviewAdapter = { name: 'signer', resolve: () => null, signUrl }
    const { req } = createReq({
      adapters: [adapter],
      docs: [{ ...docx, _objectKey: 'media/report.docx' }],
      query: { id: '7', collection: 'media' },
    })

    await signHandler(req)
    expect(signUrl).toHaveBeenCalledWith(
      expect.objectContaining({ doc: expect.objectContaining({ _objectKey: 'media/report.docx' }) }),
    )
  })

  it('skips a signUrl result the viewer cannot reach', async () => {
    const adapter: MediaPreviewAdapter = { name: 'signer', resolve: () => null, signUrl: () => '/api/media/x.docx' }
    const { req } = createReq({ adapters: [adapter], docs: [docx], query: { id: '7', collection: 'media' } })
    const { url } = (await (await signHandler(req)).json()) as { url: string }
    expect(url).toMatch(/^https:\/\/cms\.example\.com\/api\/media-preview\/file\//)
  })

  it('returns 404 on a private server when every signUrl returns null', async () => {
    const adapter: MediaPreviewAdapter = { name: 'signer', resolve: () => null, signUrl: () => null }
    const { req } = createReq({
      adapters: [adapter],
      docs: [docx],
      query: { id: '7', collection: 'media' },
      serverURL: 'http://localhost:3102',
    })
    const res = await signHandler(req)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ hint: 'errorPrivateServer' })
  })
})

describe('file endpoint', () => {
  const tokenFor = (overrides: Partial<Parameters<typeof createFileToken>[0]> = {}) =>
    createFileToken({
      id: 7,
      collection: 'media',
      expiresAt: now() + 600,
      filename: 'report.docx',
      secret: SECRET,
      ...overrides,
    })
  const call = (token: string, filename = 'report.docx', options: Parameters<typeof createReq>[0] = {}) => {
    const ctx = createReq({ docs: [docx], ...options, routeParams: { filename, token }, user: null })
    return { ...ctx, response: fileHandler(ctx.req) }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('streams the file for a valid token', async () => {
    const { findByID, handler, response } = call(tokenFor())
    const res = await response

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('file-bytes')
    expect(res.headers.get('Content-Type')).toBe(DOCX)
    expect(res.headers.get('Content-Disposition')).toBe(`inline; filename="report.docx"; filename*=UTF-8''report.docx`)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('ETag')).toBe('"e1"')
    expect(res.headers.get('Set-Cookie')).toBeNull()
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ draft: true, overrideAccess: true }))
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: { collection: 'media', filename: 'report.docx', prefix: undefined } }),
    )
  })

  it('passes the hidden _objectKey to storage handlers', async () => {
    const { handler, response } = call(tokenFor(), 'report.docx', { docs: [{ ...docx, _objectKey: 'k1' }] })
    expect((await response).status).toBe(200)
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ doc: expect.objectContaining({ _objectKey: 'k1' }) }),
    )
  })

  it('serves the draft file', async () => {
    const draft = { ...docx, _draft: { filename: 'draft.docx' } }
    const { response } = call(tokenFor({ filename: 'draft.docx' }), 'draft.docx', { docs: [draft] })
    expect((await response).status).toBe(200)
  })

  it('returns 404 for an expired token without reading the database', async () => {
    const { findByID, response } = call(tokenFor({ expiresAt: now() - 1 }))
    expect((await response).status).toBe(404)
    expect(findByID).not.toHaveBeenCalled()
  })

  it('returns 404 for a tampered token without reading the database', async () => {
    const [, mac] = tokenFor().split('.')
    const forged = Buffer.from(`media:${(now() + 9999).toString(36)}:7`).toString('base64url')
    const { findByID, response } = call(`${forged}.${mac}`)
    expect((await response).status).toBe(404)
    expect(findByID).not.toHaveBeenCalled()
  })

  it('returns 404 for a token from another collection', async () => {
    expect((await call(tokenFor({ collection: 'users' })).response).status).toBe(404)
  })

  it('returns 404 for a filename that does not match the document', async () => {
    expect((await call(tokenFor(), 'other.docx').response).status).toBe(404)
    expect((await call(tokenFor({ filename: 'other.docx' }), 'other.docx').response).status).toBe(404)
  })

  it('returns 404 when the external viewer is off', async () => {
    expect((await call(tokenFor(), 'report.docx', { externalViewer: false }).response).status).toBe(404)
  })

  it('returns 404 for a type the viewers do not handle', async () => {
    const svg = { ...docx, filename: 'report.docx', mimeType: 'image/svg+xml' }
    expect((await call(tokenFor(), 'report.docx', { docs: [svg] }).response).status).toBe(404)
  })

  describe('storage redirect', () => {
    const redirectTo = (location: string) => async () =>
      new Response(null, { headers: { Location: location }, status: 302 })
    const stubFetch = () => {
      const fetch = vi.fn(async () => new Response('signed-bytes', { headers: { 'Content-Length': '12' } }))
      vi.stubGlobal('fetch', fetch)
      return fetch
    }

    it('follows an https redirect', async () => {
      const fetch = stubFetch()
      const { response } = call(tokenFor(), 'report.docx', {
        handlers: [redirectTo('https://bucket.example.com/report.docx?sig=1')],
      })
      const res = await response

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('signed-bytes')
      expect(fetch).toHaveBeenCalledWith(
        new URL('https://bucket.example.com/report.docx?sig=1'),
        expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }),
      )
    })

    it('resolves a relative Location against the request URL', async () => {
      const fetch = stubFetch()
      const { response } = call(tokenFor(), 'report.docx', { handlers: [redirectTo('/storage/report.docx')] })

      expect((await response).status).toBe(200)
      expect(fetch).toHaveBeenCalledWith(new URL('https://cms.example.com/storage/report.docx'), expect.anything())
    })

    it('allows http only when the request came over http', async () => {
      const fetch = stubFetch()
      const handlers = [redirectTo('http://minio:9000/report.docx')]

      expect((await call(tokenFor(), 'report.docx', { handlers }).response).status).toBe(404)
      expect(fetch).not.toHaveBeenCalled()

      const local = call(tokenFor(), 'report.docx', { handlers, url: 'http://localhost:3000/api/media-preview/file' })
      expect((await local.response).status).toBe(200)
    })

    it('returns 404 for other protocols', async () => {
      const fetch = stubFetch()
      const { response } = call(tokenFor(), 'report.docx', { handlers: [redirectTo('file:///etc/passwd')] })
      expect((await response).status).toBe(404)
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  it('drops Content-Length for an encoded upstream body', async () => {
    const handler = async () =>
      new Response('decoded', { headers: { 'Content-Encoding': 'gzip', 'Content-Length': '3' } })
    const res = await call(tokenFor(), 'report.docx', { handlers: [handler] }).response

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Length')).toBeNull()
  })

  it('passes 304 through', async () => {
    const handler = async () => new Response(null, { headers: { ETag: '"e1"' }, status: 304 })
    const res = await call(tokenFor(), 'report.docx', { handlers: [handler] }).response

    expect(res.status).toBe(304)
    expect(res.headers.get('ETag')).toBe('"e1"')
  })

  describe('local staticDir', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'media-preview-'))
    const staticDir = path.join(root, 'uploads')
    mkdirSync(staticDir)
    writeFileSync(path.join(staticDir, 'report.docx'), 'disk-bytes')
    writeFileSync(path.join(root, 'secret.docx'), 'secret')

    it('streams the file from disk', async () => {
      const res = await call(tokenFor(), 'report.docx', { handlers: [], staticDir }).response

      expect(res.status).toBe(200)
      expect(await res.text()).toBe('disk-bytes')
      expect(res.headers.get('Content-Length')).toBe('10')
    })

    it('rejects a filename outside staticDir', async () => {
      const filename = '../secret.docx'
      const res = await call(tokenFor({ filename }), filename, {
        docs: [{ ...docx, filename }],
        handlers: [],
        staticDir,
      }).response
      expect(res.status).toBe(404)
    })
  })
})
