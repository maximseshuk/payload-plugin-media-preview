import type { PayloadComponent, UploadConfig } from 'payload'

import { GOOGLE_VIEWER_TYPES, MICROSOFT_OFFICE_TYPES, TEXT_TYPES } from '@/shared/constants.js'

type FilePreview = NonNullable<NonNullable<UploadConfig['admin']>['components']>['filePreview']

export const FILE_PREVIEW_COMPONENT = '@seshuk/payload-plugin-media-preview/rsc#MediaPreviewFile'

const PAYLOAD_PREVIEW_TYPES = ['image/*', 'video/*', 'audio/*', 'application/pdf']

export const buildFilePreviewMap = (
  collectionSlug: string,
  adapterMimeTypes: string[] = [],
): Record<string, PayloadComponent> => {
  const component = { path: FILE_PREVIEW_COMPONENT, serverProps: { collectionSlug } }
  return {
    ...Object.fromEntries(PAYLOAD_PREVIEW_TYPES.map((type) => [type, false])),
    ...Object.fromEntries(
      ['*', ...MICROSOFT_OFFICE_TYPES, ...GOOGLE_VIEWER_TYPES, ...TEXT_TYPES, ...adapterMimeTypes].map((type) => [
        type,
        component,
      ]),
    ),
  }
}

export const mergeFilePreview = (existing: FilePreview, ours: Record<string, PayloadComponent>): FilePreview => {
  if (existing != null && (typeof existing !== 'object' || 'path' in existing || '*' in existing)) {
    return existing
  }
  const user: Record<string, PayloadComponent> = existing ?? {}
  const merged = { ...user }
  for (const [type, component] of Object.entries(ours)) {
    if (!(type in user) && !(`${type.split('/')[0]}/*` in user)) {
      merged[type] = component
    }
  }
  return merged
}
