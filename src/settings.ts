import type { SanitizedConfig } from 'payload'

import type { MediaPreviewAdapter, MediaPreviewExternalViewer } from './types.js'

import { DEFAULT_SIGNED_URL_EXPIRES_IN } from './components/MediaPreview.constants.js'

export const PLUGIN_KEY = '@seshuk/payload-plugin-media-preview'

export type ResolvedExternalViewer = { expiresIn: number; google: boolean; office: boolean }

export type CollectionSettings = {
  adapterNames?: string[]
  externalViewer: false | ResolvedExternalViewer
}

export type PluginData = {
  adapters: MediaPreviewAdapter[]
  collections: Record<string, CollectionSettings>
}

export const resolveExternalViewer = (value?: MediaPreviewExternalViewer): false | ResolvedExternalViewer => {
  if (!value) {
    return false
  }
  const options = value === true ? { google: true, office: true } : value
  if (!options.office && !options.google) {
    return false
  }
  const expiresIn = Number(options.expiresIn)
  return {
    expiresIn: Number.isFinite(expiresIn) && expiresIn >= 1 ? Math.floor(expiresIn) : DEFAULT_SIGNED_URL_EXPIRES_IN,
    google: options.google === true,
    office: options.office === true,
  }
}

export const getPluginData = (config: Pick<SanitizedConfig, 'custom'>): PluginData => {
  const data = config.custom?.[PLUGIN_KEY] as Partial<PluginData> | undefined
  return { adapters: data?.adapters ?? [], collections: data?.collections ?? {} }
}

export const getCollectionAdapters = (data: PluginData, adapterNames?: string[]): MediaPreviewAdapter[] =>
  adapterNames ? data.adapters.filter((a) => adapterNames.includes(a.name)) : data.adapters
