import type { UIField } from 'payload'

import type { MediaPreviewContentMode, MediaPreviewMode } from './types.js'

/** Options of the list view preview column. The edit view preview lives in the upload panel. */
export type MediaPreviewFieldOptions = {
  /** Which adapters to try when resolving a preview (by name). */
  adapterNames?: string[]
  /** How the cell opens each content type. */
  contentMode?: Partial<MediaPreviewContentMode>
  /**
   * Preview display mode.
   *
   * - `'auto'` — popup on desktop, fullscreen on mobile.
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
    // @ts-expect-error
    label: ({ t }) => t('@seshuk/payload-plugin-media-preview:label'),
    ...overrides,
    name: 'mediaPreview',
    type: 'ui',
    admin: {
      components: {
        ...overrides?.admin?.components,
        Cell: {
          clientProps: {
            contentMode,
            mode,
          },
          path: '@seshuk/payload-plugin-media-preview/rsc#MediaPreviewCell',
          serverProps: {
            adapterNames,
          },
        },
      },
      ...overrides?.admin,
    },
  }
}
