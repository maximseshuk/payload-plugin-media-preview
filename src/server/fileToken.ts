import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'

const KEY_INFO = '@seshuk/payload-plugin-media-preview:file-token'
const MAC_BYTES = 16

export type FileToken = {
  collection: string
  expiresAt: number
  id: string
  mac: Buffer
}

type SignArgs = {
  collection: string
  expiresAt: number
  filename: string
  id: number | string
  secret: string
}

const sign = ({ collection, expiresAt, filename, id, secret }: SignArgs): Buffer => {
  const key = Buffer.from(hkdfSync('sha256', secret, '', KEY_INFO, 32))
  return createHmac('sha256', key)
    .update(`${collection}\n${id}\n${filename}\n${expiresAt}`)
    .digest()
    .subarray(0, MAC_BYTES)
}

export const createFileToken = (args: SignArgs): string => {
  const payload = Buffer.from(`${args.collection}:${args.expiresAt.toString(36)}:${args.id}`).toString('base64url')
  return `${payload}.${sign(args).toString('base64url')}`
}

export const parseFileToken = (token: unknown): FileToken | null => {
  if (typeof token !== 'string' || token.length > 512) {
    return null
  }
  const [payload, mac, extra] = token.split('.')
  if (!payload || !mac || extra !== undefined) {
    return null
  }
  const match = /^([^:]+):([0-9a-z]+):(.+)$/.exec(Buffer.from(payload, 'base64url').toString())
  if (!match) {
    return null
  }
  return {
    collection: match[1],
    expiresAt: parseInt(match[2], 36),
    id: match[3],
    mac: Buffer.from(mac, 'base64url'),
  }
}

export const verifyFileToken = (
  token: FileToken,
  args: { filename: string; now?: number; secret: string },
): boolean => {
  const now = args.now ?? Math.floor(Date.now() / 1000)
  if (!(token.expiresAt > now)) {
    return false
  }
  const expected = sign({ ...token, filename: args.filename, secret: args.secret })
  return token.mac.length === expected.length && timingSafeEqual(token.mac, expected)
}
