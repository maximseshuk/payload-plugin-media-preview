import type { UIField } from 'payload'

import type { MediaPreviewContentMode, MediaPreviewMode } from './types.js'

export type MediaPreviewFieldOptions = {
  /** Which adapters to try when resolving a preview (by name). */
  adapterNames?: string[]
  contentMode?: Partial<MediaPreviewContentMode>
  /**
   * Preview display mode.
   *
   * - `'auto'` — popup in cell (desktop), fullscreen in field and on mobile.
   * - `'fullscreen'` — always fullscreen modal.
   * @default 'auto'
   */
  mode?: MediaPreviewMode
  /** Payload UI field overrides (`name` and `type` cannot be changed). */
  overrides?: Partial<Omit<UIField, 'name' | 'type'>>
}

export const mediaPreviewField = (props?: MediaPreviewFieldOptions): UIField => {
  const { adapterNames, contentMode, mode = 'auto', overrides } = props || {}

  return {
    // @ts-expect-error - Payload supports label as a function but types are incorrect
    label: ({ t }) => t('@seshuk/payload-media-preview:label'),
    ...overrides,
    name: 'mediaPreview',
    type: 'ui',
    admin: {
      components: {
        ...(overrides?.admin?.components || {}),
        Cell: {
          clientProps: {
            contentMode,
            mode,
          },
          path: '@seshuk/payload-media-preview/rsc#MediaPreviewCell',
          serverProps: {
            adapterNames,
          },
        },
        Field: {
          clientProps: {
            contentMode,
            mode,
          },
          path: '@seshuk/payload-media-preview/rsc#MediaPreview',
          serverProps: {
            adapterNames,
          },
        },
      },
      ...(overrides?.admin || {}),
    },
  }
}
