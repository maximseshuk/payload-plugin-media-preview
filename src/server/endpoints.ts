import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import type { Endpoint, PayloadHandler, PayloadRequest, SanitizedCollectionConfig } from 'payload'
import { executeAccess } from 'payload'

import { FILE_PATH, SIGN_URL_PATH } from '@/shared/constants.js'
import { isPublicUrl } from '@/shared/utils.js'

import { createFileToken, parseFileToken, verifyFileToken } from './fileToken.js'
import { getExternalViewerHint, isProxiedFile } from './getPreviewData.js'
import { getCollectionAdapters, getPluginData } from './settings.js'

type Doc = Record<string, unknown>

const notFound = () => new Response(null, { headers: { 'Cache-Control': 'no-store' }, status: 404 })

export const getExternalFileUrl = async (req: PayloadRequest, collectionSlug: string, doc: Doc) => {
  const { config, secret } = req.payload
  const data = getPluginData(config)
  const settings = data.collections[collectionSlug]
  if (!settings?.externalViewer) {
    return null
  }
  const { expiresIn } = settings.externalViewer
  const url = typeof doc.url === 'string' ? doc.url : undefined

  for (const adapter of getCollectionAdapters(data, settings.adapterNames)) {
    const signed = await adapter.signUrl?.({ doc, expiresIn, req, url })
    if (signed && isPublicUrl(signed)) {
      return signed
    }
  }

  if (!isProxiedFile(config, collectionSlug, url)) {
    return url && isPublicUrl(url) ? url : null
  }
  if (!isPublicUrl(config.serverURL) || typeof doc.filename !== 'string' || doc.id === undefined) {
    return null
  }

  const token = createFileToken({
    id: doc.id as number | string,
    collection: collectionSlug,
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
    filename: doc.filename,
    secret,
  })
  return `${config.serverURL}${config.routes.api}${FILE_PATH}/${token}/${encodeURIComponent(doc.filename)}`
}

const signUrlHandler: PayloadHandler = async (req) => {
  const collectionSlug = req.searchParams.get('collection') ?? ''
  const id = req.searchParams.get('id')
  if (!req.user) {
    return new Response(null, { headers: { 'Cache-Control': 'no-store' }, status: 401 })
  }
  if (!id || !getPluginData(req.payload.config).collections[collectionSlug]?.externalViewer) {
    return notFound()
  }

  let doc: Doc
  try {
    doc = await req.payload.findByID({
      id,
      collection: collectionSlug as never,
      depth: 0,
      draft: true,
      overrideAccess: false,
      req,
      showHiddenFields: true,
      user: req.user,
    })
    const collection = req.payload.collections[collectionSlug].config
    const access = await executeAccess(
      { slug: collectionSlug, data: { filename: doc.filename }, isReadingStaticFile: true, req },
      collection.access.read,
    )
    if (
      typeof access === 'object' &&
      !(await req.payload.db.findOne({
        collection: collectionSlug,
        req,
        where: { and: [{ id: { equals: id } }, { filename: { equals: doc.filename } }, access] },
      }))
    ) {
      return notFound()
    }
  } catch {
    return notFound()
  }

  const hint = getExternalViewerHint(req.payload.config, collectionSlug, doc)
  const url = hint ? null : await getExternalFileUrl(req, collectionSlug, doc)
  return url
    ? Response.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
    : Response.json({ hint: hint ?? 'errorPrivateServer' }, { headers: { 'Cache-Control': 'no-store' }, status: 404 })
}

const followRedirect = async (req: PayloadRequest, location: string): Promise<null | Response> => {
  try {
    const target = new URL(location, req.url)
    if (target.protocol !== 'https:' && !(target.protocol === 'http:' && new URL(req.url!).protocol === 'http:')) {
      return null
    }
    const timeout = AbortSignal.timeout(30_000)
    return await fetch(target, {
      redirect: 'error',
      signal: req.signal ? AbortSignal.any([req.signal, timeout]) : timeout,
    })
  } catch {
    return null
  }
}

const getFileResponse = async (
  req: PayloadRequest,
  collection: SanitizedCollectionConfig,
  doc: Doc & { filename: string },
): Promise<null | Response> => {
  const params = {
    collection: collection.slug,
    filename: doc.filename,
    prefix: typeof doc.prefix === 'string' ? doc.prefix : undefined,
  }
  for (const handler of collection.upload.handlers ?? []) {
    const response = await handler(req, { doc: doc as never, headers: new Headers(), params })
    if (response instanceof Response) {
      const location = response.headers.get('location')
      return response.status >= 300 && response.status < 400 && location ? followRedirect(req, location) : response
    }
  }

  const dir = path.resolve(collection.upload.staticDir || collection.slug)
  const filePath = path.resolve(dir, doc.filename)
  if (!filePath.startsWith(dir + path.sep)) {
    return null
  }
  try {
    const { size } = await stat(filePath)
    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      headers: { 'Content-Length': String(size) },
    })
  } catch {
    return null
  }
}

const fileHandler: PayloadHandler = async (req) => {
  const token = parseFileToken(req.routeParams?.token)
  const filename = req.routeParams?.filename
  const { config, secret } = req.payload
  if (
    !token ||
    typeof filename !== 'string' ||
    !verifyFileToken(token, { filename, secret }) ||
    !getPluginData(config).collections[token.collection]?.externalViewer
  ) {
    return notFound()
  }
  const collection = req.payload.collections[token.collection]?.config
  if (!collection?.upload) {
    return notFound()
  }

  let doc: Doc | null
  try {
    doc = await req.payload.findByID({
      id: token.id,
      collection: token.collection as never,
      depth: 0,
      disableErrors: true,
      draft: true,
      overrideAccess: true,
      showHiddenFields: true,
    })
  } catch {
    return notFound()
  }

  if (!doc || doc.filename !== filename || getExternalViewerHint(config, token.collection, doc) === 'errorNoPreview') {
    return notFound()
  }

  const upstream = await getFileResponse(req, collection, { ...doc, filename })
  const notModified = upstream?.status === 304
  if (!upstream || (!notModified && (!upstream.ok || !upstream.body))) {
    return notFound()
  }

  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Disposition': `inline; filename="${filename.replace(/[^\x20-\x7e]|["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Type': String(doc.mimeType),
    'X-Content-Type-Options': 'nosniff',
  })
  for (const name of ['Accept-Ranges', 'Content-Length', 'Content-Range', 'ETag', 'Last-Modified']) {
    const value = upstream.headers.get(name)
    if (value) {
      headers.set(name, value)
    }
  }
  if (upstream.headers.has('Content-Encoding')) {
    headers.delete('Content-Length')
  }
  if (notModified) {
    return new Response(null, { headers, status: 304 })
  }
  return new Response(upstream.body, { headers, status: upstream.status === 206 ? 206 : 200 })
}

export const endpoints: Endpoint[] = [
  { handler: signUrlHandler, method: 'get', path: SIGN_URL_PATH },
  { handler: fileHandler, method: 'get', path: `${FILE_PATH}/:token/:filename` },
]
