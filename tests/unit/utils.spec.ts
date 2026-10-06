import type { SanitizedConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import { buildFilePreviewMap, FILE_PREVIEW_COMPONENT, mergeFilePreview } from '@/server/filePreviewMap.js'
import { getExternalViewerHint, getPreviewData } from '@/server/getPreviewData.js'
import { resolveExternalViewer } from '@/server/settings.js'
import {
  GOOGLE_VIEWER_MAX_SIZE,
  MICROSOFT_EXCEL_MAX_SIZE,
  MICROSOFT_VIEWER_MAX_SIZE,
  TEXT_PREVIEW_MAX_SIZE,
} from '@/shared/constants.js'
import { PLUGIN_KEY } from '@/shared/constants.js'
import {
  formatText,
  getContentType,
  getCodeLanguage,
  getExtension,
  getFileKind,
  isCsv,
  getExternalViewerUrl,
  isPayloadFileUrl,
  isPublicUrl,
  parseCsv,
  readText,
} from '@/shared/utils.js'

import { DOCX, XLSX } from '../helpers/shared/mimeTypes.js'

describe('getFileKind', () => {
  it.each([
    ['video/mp4', 'video'],
    ['audio/mpeg', 'audio'],
    ['image/png', 'image'],
    ['image/svg+xml', 'image'],
    ['application/pdf', 'pdf'],
    ['application/msword', 'office'],
    [DOCX, 'office'],
    ['application/vnd.ms-excel', 'office'],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'office'],
    ['image/vnd.adobe.photoshop', 'google'],
    ['application/postscript', 'google'],
    ['text/plain', 'text'],
    ['text/csv', 'text'],
    ['text/markdown', 'text'],
    ['application/json', 'text'],
  ])('returns kind for %s', (mime, expected) => {
    expect(getFileKind(mime)).toBe(expected)
  })

  it.each(['application/octet-stream', 'application/vnd.oasis.opendocument.text', undefined])(
    'returns unsupported for %s',
    (mime) => {
      expect(getFileKind(mime)).toBe('unsupported')
    },
  )

  it.each(['app.ts', 'App.TSX', 'main.py', 'run.sh', 'pyproject.toml', 'setup.ini', '.env.example', 'server.log'])(
    'detects text by extension for %s without a useful MIME type',
    (filename) => {
      expect(getFileKind('application/octet-stream', filename)).toBe('text')
      expect(getFileKind('', filename)).toBe('text')
      expect(getFileKind(undefined, filename)).toBe('text')
    },
  )

  it.each(['archive.zip', 'binary', 'image.ts.bin'])('keeps %s unsupported', (filename) => {
    expect(getFileKind('application/octet-stream', filename)).toBe('unsupported')
  })

  it('trusts a known MIME type over the extension', () => {
    expect(getFileKind('application/zip', 'notes.txt')).toBe('unsupported')
    expect(getFileKind('video/mp2t', 'clip.ts')).toBe('video')
  })
})

describe('getContentType', () => {
  it.each([
    ['image', 'image'],
    ['video', 'video'],
    ['audio', 'audio'],
    ['pdf', 'document'],
    ['text', 'document'],
    ['office', 'document'],
    ['google', 'document'],
    ['unsupported', 'document'],
  ] as const)('maps %s to %s', (kind, expected) => {
    expect(getContentType(kind)).toBe(expected)
  })
})

describe('getExtension', () => {
  it.each([
    ['App.TSX', 'tsx'],
    ['a.b.yaml', 'yaml'],
    ['.env', 'env'],
    ['.env.local', 'env'],
    ['env.example', 'env'],
    ['Makefile', ''],
    [undefined, ''],
  ])('returns the extension of %s', (filename, expected) => {
    expect(getExtension(filename)).toBe(expected)
  })
})

describe('getCodeLanguage', () => {
  it.each([
    ['application/json', 'x.json', 'json'],
    ['text/yaml', undefined, 'yaml'],
    ['application/octet-stream', 'app.ts', 'typescript'],
    ['text/plain', 'main.py', 'python'],
    ['text/plain', 'notes.txt', 'plaintext'],
    ['text/plain', 'server.log', 'plaintext'],
    [undefined, undefined, 'plaintext'],
  ])('maps %s %s to %s', (mime, filename, expected) => {
    expect(getCodeLanguage(mime, filename)).toBe(expected)
  })
})

describe('isCsv', () => {
  it('matches the MIME type or the extension', () => {
    expect(isCsv('text/csv')).toBe(true)
    expect(isCsv('application/octet-stream', 'DATA.CSV')).toBe(true)
    expect(isCsv('text/plain', 'notes.txt')).toBe(false)
  })
})

describe('formatText', () => {
  it('pretty-prints JSON', () => {
    expect(formatText('{"a":1}', 'json')).toBe('{\n  "a": 1\n}')
  })

  it('keeps invalid JSON and other text as is', () => {
    expect(formatText('{oops', 'json')).toBe('{oops')
    expect(formatText('<b>hi</b>', 'html')).toBe('<b>hi</b>')
  })
})

describe('readText', () => {
  const stream = (chunks: string[]) => {
    const pulled: string[] = []
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks[pulled.length]
        if (chunk === undefined) {
          controller.close()
        } else {
          pulled.push(chunk)
          controller.enqueue(new TextEncoder().encode(chunk))
        }
      },
    })
    return { pulled, res: new Response(body) }
  }

  it('reads the whole body under the limit', async () => {
    expect(await readText(stream(['ab', 'cd']).res, 10)).toBe('abcd')
  })

  it('stops reading at the limit', async () => {
    const { pulled, res } = stream(['abc', 'def', 'ghi', 'jkl'])
    expect(await readText(res, 5)).toBe('abcde')
    expect(pulled).toEqual(['abc', 'def'])
  })

  it('decodes multi-byte characters split across chunks', async () => {
    const bytes = new TextEncoder().encode('é')
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, 1))
        controller.enqueue(bytes.subarray(1))
        controller.close()
      },
    })
    expect(await readText(new Response(body), 10)).toBe('é')
  })
})

describe('parseCsv', () => {
  it('parses quoted fields, escaped quotes and CRLF', () => {
    expect(parseCsv('a,"b,c","say ""hi"""\r\n1,2,3\r\n')).toEqual([
      ['a', 'b,c', 'say "hi"'],
      ['1', '2', '3'],
    ])
  })

  it('detects the semicolon delimiter', () => {
    expect(parseCsv('a;b;c\n1;2;3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('stops at maxRows', () => {
    expect(parseCsv('1\n2\n3\n4', 2)).toEqual([['1'], ['2']])
  })
})

describe('isPublicUrl', () => {
  it.each([
    'https://example.com/file.docx',
    'https://example.com./file.docx',
    'http://cms.example.com:8080',
    'https://8.8.8.8',
    'https://198.20.0.1',
    'https://[2001:db8::1]',
  ])('returns true for %s', (url) => {
    expect(isPublicUrl(url)).toBe(true)
  })

  it.each([
    undefined,
    '',
    '/api/media/file/a.docx',
    'ftp://example.com',
    'http://localhost:3000',
    'http://app.localhost',
    'http://intranet',
    'http://nas.local',
    'http://127.0.0.1',
    'http://10.0.0.5',
    'http://172.16.4.2',
    'http://192.168.1.10',
    'http://169.254.169.254',
    'http://100.64.0.1',
    'http://0.0.0.0',
    'http://[::1]',
    'http://[fd00::1]',
    'http://[fe80::1]',
    'http://[::ffff:127.0.0.1]',
    'http://localhost.:3000',
    'http://nas.local.',
    'http://10.0.0.5.',
    'http://198.18.0.1',
    'http://198.19.255.255',
    'http://[::127.0.0.1]',
    'http://[::10.0.0.1]',
    'http://[64:ff9b::10.0.0.1]',
    'http://[fec0::1]',
    'http://[feff::1]',
  ])('returns false for %s', (url) => {
    expect(isPublicUrl(url)).toBe(false)
  })
})

describe('isPayloadFileUrl', () => {
  const base = { apiRoute: '/api', collectionSlug: 'media', serverURL: 'https://cms.example.com' }

  it.each(['/api/media/file/a.docx', 'https://cms.example.com/api/media/file/a.docx'])(
    'returns true for proxied URL %s',
    (url) => {
      expect(isPayloadFileUrl({ ...base, url })).toBe(true)
    },
  )

  it.each([
    ['/api/media/file/a.docx', true],
    ['//evil.example.com/api/media/file/a', false],
    ['https://cdn.example.com/api/media/file/a', false],
  ])('treats %s without serverURL as proxied: %s', (url, expected) => {
    expect(isPayloadFileUrl({ ...base, serverURL: undefined, url })).toBe(expected)
  })

  it.each([
    'https://bucket.s3.amazonaws.com/media/a.docx',
    'https://other.example.com/api/media/file/a.docx',
    '/api/other/file/a.docx',
    '/media/a.docx',
    '//evil.example.com/api/media/file/a.docx',
    '/\\evil.example.com/api/media/file/a.docx',
  ])('returns false for direct URL %s', (url) => {
    expect(isPayloadFileUrl({ ...base, url })).toBe(false)
  })
})

describe('getExternalViewerUrl', () => {
  it('builds the Microsoft viewer URL', () => {
    expect(getExternalViewerUrl('office', 'https://example.com/doc.docx')).toBe(
      'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fexample.com%2Fdoc.docx',
    )
  })

  it('builds the Google viewer URL', () => {
    expect(getExternalViewerUrl('google', 'https://example.com/a.psd')).toBe(
      'https://docs.google.com/viewer?url=https%3A%2F%2Fexample.com%2Fa.psd&embedded=true',
    )
  })
})

describe('resolveExternalViewer', () => {
  it('is off by default', () => {
    expect(resolveExternalViewer()).toBe(false)
    expect(resolveExternalViewer(false)).toBe(false)
    expect(resolveExternalViewer({})).toBe(false)
    expect(resolveExternalViewer({ expiresIn: 60 })).toBe(false)
  })

  it('turns on both viewers for true', () => {
    expect(resolveExternalViewer(true)).toEqual({ expiresIn: 600, google: true, office: true })
  })

  it('turns on only the set viewers', () => {
    expect(resolveExternalViewer({ expiresIn: 120, office: true })).toEqual({
      expiresIn: 120,
      google: false,
      office: true,
    })
  })

  it.each([0, -5, Number.NaN, Infinity, 0.5])('falls back to the default expiresIn for %s', (expiresIn) => {
    expect(resolveExternalViewer({ expiresIn, google: true })).toMatchObject({ expiresIn: 600 })
  })

  it('rounds expiresIn down to whole seconds', () => {
    expect(resolveExternalViewer({ expiresIn: 90.7, google: true })).toMatchObject({ expiresIn: 90 })
  })
})

describe('getPreviewData', () => {
  const config = (
    externalViewer: ReturnType<typeof resolveExternalViewer>,
    serverURL = 'https://cms.example.com',
    adapters: unknown[] = [],
  ) =>
    ({
      custom: { [PLUGIN_KEY]: { adapters, collections: { media: { externalViewer } } } },
      routes: { api: '/api' },
      serverURL,
    }) as unknown as SanitizedConfig
  const on = resolveExternalViewer(true)
  const docx = { id: 1, filename: 'a.docx', filesize: 1000, mimeType: DOCX, url: '/api/media/file/a.docx' }

  it('marks an Office file as external when the viewer is on and the server is public', () => {
    const data = getPreviewData(config(on), 'media', docx)
    expect(data).toMatchObject({ credentials: 'include', external: true, kind: 'office' })
    expect(data.hint).toBeUndefined()
  })

  it('shows the download card when the viewer is off', () => {
    expect(getPreviewData(config(false), 'media', docx)).toMatchObject({ external: false, hint: 'errorNoPreview' })
  })

  it('shows the download card when only the other viewer is on', () => {
    const googleOnly = resolveExternalViewer({ google: true })
    expect(getExternalViewerHint(config(googleOnly), 'media', docx)).toBe('errorNoPreview')
  })

  it.each(['http://localhost:3102', 'http://192.168.1.10', ''])(
    'hints errorPrivateServer for serverURL %j',
    (serverURL) => {
      expect(getExternalViewerHint(config(on, serverURL), 'media', docx)).toBe('errorPrivateServer')
    },
  )

  it.each([
    ['a private server', 'http://localhost:3102', docx.url],
    ['a private direct URL', undefined, 'http://minio:9000/a.docx'],
  ])('allows %s when an adapter signs URLs', (_, serverURL, url) => {
    const adapters = [{ name: 'signer', resolve: () => null, signUrl: () => 'https://cdn.example.com/a' }]
    expect(getExternalViewerHint(config(on, serverURL, adapters), 'media', { ...docx, url })).toBeUndefined()
  })

  it('checks the direct URL itself for reachability', () => {
    const direct = { ...docx, url: 'https://bucket.example.com/a.docx' }
    expect(getExternalViewerHint(config(on, 'http://localhost:3102'), 'media', direct)).toBeUndefined()
    expect(getPreviewData(config(on), 'media', direct).credentials).toBe('omit')
    expect(getExternalViewerHint(config(on), 'media', { ...docx, url: 'http://minio:9000/a.docx' })).toBe(
      'errorPrivateServer',
    )
  })

  it.each([
    [DOCX, 6 * 1024 * 1024, undefined],
    [DOCX, MICROSOFT_VIEWER_MAX_SIZE, undefined],
    [DOCX, MICROSOFT_VIEWER_MAX_SIZE + 1, 'errorTooLarge'],
    [XLSX, MICROSOFT_EXCEL_MAX_SIZE, undefined],
    [XLSX, MICROSOFT_EXCEL_MAX_SIZE + 1, 'errorTooLarge'],
    ['application/vnd.ms-excel', MICROSOFT_EXCEL_MAX_SIZE + 1, 'errorTooLarge'],
    ['image/vnd.adobe.photoshop', GOOGLE_VIEWER_MAX_SIZE, undefined],
    ['image/vnd.adobe.photoshop', GOOGLE_VIEWER_MAX_SIZE + 1, 'errorTooLarge'],
  ])('hints %s of %i bytes with %s', (mimeType, filesize, hint) => {
    expect(getExternalViewerHint(config(on), 'media', { ...docx, filesize, mimeType })).toBe(hint)
  })

  it('hints errorTooLarge for big text files', () => {
    const txt = { filesize: TEXT_PREVIEW_MAX_SIZE + 1, mimeType: 'text/plain', url: '/api/media/file/a.txt' }
    expect(getPreviewData(config(false), 'media', txt)).toMatchObject({ hint: 'errorTooLarge', kind: 'text' })
  })

  it('hints errorNoPreview for unsupported types', () => {
    expect(getPreviewData(config(false), 'media', { mimeType: 'application/zip' })).toMatchObject({
      hint: 'errorNoPreview',
      kind: 'unsupported',
    })
  })
})

describe('buildFilePreviewMap', () => {
  const map = buildFilePreviewMap('media', ['video/*'])

  it('registers Office, Google, text and adapter types', () => {
    for (const type of [DOCX, 'image/vnd.adobe.photoshop', 'text/*', 'application/json', 'video/*']) {
      expect(map[type]).toEqual({ path: FILE_PREVIEW_COMPONENT, serverProps: { collectionSlug: 'media' } })
    }
  })

  it('registers the * fallback for other types', () => {
    expect(map['*']).toEqual({ path: FILE_PREVIEW_COMPONENT, serverProps: { collectionSlug: 'media' } })
  })

  it('leaves built-in previews to Payload', () => {
    for (const type of ['image/*', 'audio/*', 'application/pdf']) {
      expect(map[type]).toBe(false)
    }
    expect(buildFilePreviewMap('media')['video/*']).toBe(false)
  })
})

describe('mergeFilePreview', () => {
  const ours = { 'text/*': 'ours', 'video/*': 'ours', [DOCX]: 'ours' }

  it('uses the plugin map when the user has none', () => {
    expect(mergeFilePreview(undefined, ours)).toEqual(ours)
  })

  it.each(['./Custom#Preview', { path: './Custom#Preview' }, false] as const)(
    'keeps a single user component %j',
    (existing) => {
      expect(mergeFilePreview(existing as never, ours)).toBe(existing)
    },
  )

  it('keeps user keys, exact and wildcard', () => {
    const merged = mergeFilePreview({ 'text/plain': 'user', 'video/*': 'user', [DOCX]: 'user' }, ours) as Record<
      string,
      unknown
    >
    expect(merged).toEqual({ 'text/*': 'ours', 'text/plain': 'user', 'video/*': 'user', [DOCX]: 'user' })
  })

  it('keeps a user map with the * fallback as is', () => {
    const user = { '*': 'user', 'image/*': 'user' }
    expect(mergeFilePreview(user, ours)).toBe(user)
  })

  it('treats null like no user config', () => {
    expect(mergeFilePreview(null as never, ours)).toEqual(ours)
  })

  it('skips plugin keys covered by a user category wildcard', () => {
    const merged = mergeFilePreview({ 'application/*': 'user' }, ours) as Record<string, unknown>
    expect(merged[DOCX]).toBeUndefined()
    expect(merged['text/*']).toBe('ours')
  })
})
