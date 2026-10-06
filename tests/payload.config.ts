import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { MediaPreviewAdapter } from '@seshuk/payload-plugin-media-preview'
import { mediaPreview, mediaPreviewField } from '@seshuk/payload-plugin-media-preview'

import { buildConfigWithDefaults } from './helpers/shared/buildConfigWithDefaults.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const testAdapter: MediaPreviewAdapter = {
  name: 'test-adapter',
  Component: '@seshuk/payload-plugin-media-preview/client#IframeViewer',
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
  resolve: async ({ doc }) => {
    const externalUrl = doc.externalUrl as string | undefined
    if (externalUrl) {
      return { mode: 'newTab', url: externalUrl }
    }
    return null
  },
}

const streamAdapter: MediaPreviewAdapter = {
  name: 'stream-adapter',
  Component: '@seshuk/payload-plugin-media-preview/client#IframeViewer',
  mimeTypes: ['video/*', 'audio/*'],
  resolve: ({ doc }) => {
    const streamId = doc.streamId as string | undefined
    return streamId
      ? { mode: 'inline', props: { src: `https://example.com/stream/${streamId}`, title: 'Stream' } }
      : null
  },
}

const fetchProviderAsset = async (assetId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return { embedUrl: `https://example.com/async/${assetId}`, title: `Asset ${assetId}` }
}

const asyncAdapter: MediaPreviewAdapter = {
  name: 'async-adapter',
  Component: '@seshuk/payload-plugin-media-preview/client#IframeViewer',
  mimeTypes: ['video/*'],
  resolve: async ({ doc }) => {
    const assetId = doc.assetId as string | undefined
    if (!assetId) {
      return null
    }
    const asset = await fetchProviderAsset(assetId)
    return { mode: 'inline', props: { src: asset.embedUrl, title: asset.title } }
  },
}

const createUploadCollection = (slug: string, extraFields: any[] = []) => ({
  slug,
  fields: [...extraFields],
  upload: {
    staticDir: path.resolve(dirname, `uploads/${slug}`),
  },
})

export default buildConfigWithDefaults({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    createUploadCollection('media-default'),
    createUploadCollection('media-fullscreen'),
    createUploadCollection('media-newtab'),
    createUploadCollection('media-position', [{ name: 'alt', type: 'text' }]),
    createUploadCollection('media-adapter', [{ name: 'externalVideoId', type: 'text' }]),
    createUploadCollection('media-adapter-newtab', [{ name: 'externalUrl', type: 'text' }]),
    createUploadCollection('media-external'),
    createUploadCollection('media-stream', [{ name: 'streamId', type: 'text' }]),
    createUploadCollection('media-async', [{ name: 'assetId', type: 'text' }]),
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
        'media-external': {
          externalViewer: true,
        },
        'media-fullscreen': {
          field: { mode: 'fullscreen' },
        },
        'media-newtab': {
          field: {
            contentMode: {
              document: 'newTab',
              video: 'newTab',
            },
          },
        },
        'media-position': {
          field: { position: { after: 'alt' } },
        },
        'media-stream': {
          adapters: [streamAdapter],
        },
        'media-async': {
          adapters: [asyncAdapter],
        },
        'media-standalone': {
          adapters: [testAdapter],
          field: false,
        },
      },
    }),
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
