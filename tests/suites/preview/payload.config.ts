import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { CollectionConfig } from 'payload'

import { mediaPreview } from '@/index.js'
import type { MediaPreviewAdapter } from '@/index.js'

import { buildConfigWithDefaults, devUser } from '../../helpers/shared/buildConfigWithDefaults.js'
import { DOCX } from '../../helpers/shared/mimeTypes.js'

const uploadsDir = mkdtempSync(path.join(tmpdir(), 'media-preview-int-'))

export const signer: MediaPreviewAdapter = {
  name: 'signer',
  resolve: () => null,
  signUrl: ({ doc, expiresIn }) =>
    doc.mimeType === DOCX ? `https://cdn.example.com/${String(doc.filename)}?expiresIn=${expiresIn}` : null,
}

export const player: MediaPreviewAdapter = {
  name: 'player',
  mimeTypes: ['video/*'],
  resolve: async ({ collectionSlug, doc, payload }) => {
    if (doc.mimeType !== 'video/mp4') {
      return null
    }
    const { totalDocs } = await payload.count({ collection: collectionSlug as 'media', overrideAccess: true })
    return { mode: 'newTab', url: `https://player.example.com/${String(doc.filename)}?of=${totalDocs}` }
  },
}

const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: ({ isReadingStaticFile, req: { user } }) => {
      if (user?.email === devUser.email) {
        return true
      }
      return isReadingStaticFile ? { fileLocked: { equals: false } } : { locked: { equals: false } }
    },
  },
  fields: [
    { name: 'locked', type: 'checkbox', defaultValue: false },
    { name: 'fileLocked', type: 'checkbox', defaultValue: false },
  ],
  upload: { staticDir: path.join(uploadsDir, 'media') },
  versions: { drafts: true },
}

const MediaPublic: CollectionConfig = {
  slug: 'media-public',
  fields: [],
  hooks: {
    afterRead: [({ doc }) => ({ ...doc, url: `https://files.example.com/${doc.filename}` })],
  },
  upload: { staticDir: path.join(uploadsDir, 'media-public') },
}

export default buildConfigWithDefaults({
  admin: { autoLogin: false },
  collections: [Media, MediaPublic],
  plugins: [
    mediaPreview({
      adapters: [player],
      collections: {
        media: true,
        'media-public': { adapters: [signer, player], externalViewer: { expiresIn: 120, office: true } },
      },
      externalViewer: true,
    }),
  ],
  serverURL: 'https://cms.example.com',
})
