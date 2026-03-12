import type { MediaPreviewAdapter } from '@seshuk/payload-media-preview'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { en } from '@payloadcms/translations/languages/en'
import { mediaPreview, mediaPreviewField } from '@seshuk/payload-media-preview'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { ru } from 'payload/i18n/ru'
import sharp from 'sharp'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const devUser = {
  email: 'dev@example.com',
  password: 'test',
}

const testAdapter: MediaPreviewAdapter = {
  name: 'test-adapter',
  Component: '@seshuk/payload-media-preview/client#IframeViewer',
  resolve: ({ doc }) => {
    const externalVideoId = doc.externalVideoId as string | undefined
    if (externalVideoId) {
      return {
        mode: 'inline',
        props: {
          src: `https://example.com/embed/${externalVideoId}`,
          title: 'External video',
        },
      }
    }
    return null
  },
}

const customAdapter: MediaPreviewAdapter = {
  name: 'custom-adapter',
  Component: './components/CustomViewer#CustomViewer',
  resolve: ({ doc }) => {
    const provider = doc.provider as string | undefined
    const embedId = doc.embedId as string | undefined
    if (provider && embedId) {
      return {
        mode: 'inline',
        props: { embedId, provider },
      }
    }
    return null
  },
}

const newTabAdapter: MediaPreviewAdapter = {
  name: 'newtab-adapter',
  resolve: ({ doc }) => {
    const externalUrl = doc.externalUrl as string | undefined
    if (externalUrl) {
      return { mode: 'newTab', url: externalUrl }
    }
    return null
  },
}

const createUploadCollection = (slug: string, extraFields: any[] = []) => ({
  slug,
  fields: [...extraFields],
  upload: {
    staticDir: path.resolve(dirname, `uploads/${slug}`),
  },
})

const buildConfigAsync = async () => {
  if (process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_DB === '1') {
    const memoryDB = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        dbName: 'payloadmemory',
      },
    })
    process.env.DATABASE_URL = `${memoryDB.getUri()}&retryWrites=true`
  }

  return buildConfig({
    admin: {
      autoLogin: {
        email: devUser.email,
        password: devUser.password,
      },
      importMap: {
        baseDir: path.resolve(dirname),
      },
    },
    collections: [
      {
        slug: 'users',
        auth: true,
        fields: [],
      },
      createUploadCollection('media-default'),
      createUploadCollection('media-fullscreen'),
      createUploadCollection('media-newtab'),
      createUploadCollection('media-position', [
        { name: 'alt', type: 'text' },
      ]),
      createUploadCollection('media-adapter', [
        { name: 'externalVideoId', type: 'text' },
      ]),
      createUploadCollection('media-adapter-newtab', [
        { name: 'externalUrl', type: 'text' },
      ]),
      createUploadCollection('media-custom', [
        { name: 'provider', type: 'text' },
        { name: 'embedId', type: 'text' },
      ]),
      {
        slug: 'media-standalone',
        fields: [
          { name: 'externalVideoId', type: 'text' },
          mediaPreviewField({
            adapterNames: ['test-adapter'],
            mode: 'fullscreen',
          }),
        ],
        upload: {
          staticDir: path.resolve(dirname, 'uploads/media-standalone'),
        },
      },
    ],
    db: mongooseAdapter({
      url: process.env.DATABASE_URL || 'mongodb://127.0.0.1/payload-media-preview',
    }),
    i18n: {
      supportedLanguages: {
        en,
        ru,
      },
    },
    onInit: async (payload) => {
      if (process.env.CLEAN_DB) {
        await payload.db.connection.dropDatabase()
      }

      const existingUser = await payload.find({
        collection: 'users',
        where: { email: { equals: devUser.email } },
      })

      if (existingUser.docs.length === 0) {
        await payload.create({
          collection: 'users',
          data: devUser,
        })
      }
    },
    plugins: [
      mediaPreview({
        adapters: [testAdapter],
        collections: {
          'media-adapter': {
            adapters: [testAdapter],
          },
          'media-adapter-newtab': {
            adapters: [newTabAdapter],
          },
          'media-custom': {
            adapters: [customAdapter],
          },
          'media-default': true,
          'media-fullscreen': {
            mode: 'fullscreen',
          },
          'media-newtab': {
            contentMode: {
              document: 'newTab',
              video: 'newTab',
            },
          },
          'media-position': {
            field: { position: { after: 'alt' } },
          },
          'media-standalone': {
            adapters: [testAdapter],
            field: false,
          },
        },
      }),
    ],
    secret: process.env.PAYLOAD_SECRET || 'test-secret-key-media-preview',
    sharp,
    telemetry: false,
    typescript: {
      declare: {
        ignoreTSError: true,
      },
    },
  })
}

export default buildConfigAsync()
