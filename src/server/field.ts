import type { UIField } from 'payload'

import type { MediaPreviewFieldOptions } from '@/shared/types/index.js'

/**
 * The list view preview column, to place by hand. It doesn't change the edit view.
 * Set `field: false` on the collection, so the plugin doesn't add a second column.
 */
export const mediaPreviewField = ({
  adapterNames,
  contentMode,
  mode = 'auto',
  overrides,
}: Omit<MediaPreviewFieldOptions, 'position'> & {
  /** Which adapters to try when resolving a preview (by name). */
  adapterNames?: string[]
} = {}): UIField => ({
  // @ts-expect-error
  label: ({ t }) => t('@seshuk/payload-plugin-media-preview:label'),
  ...overrides,
  name: 'mediaPreview',
  type: 'ui',
  admin: {
    ...overrides?.admin,
    components: {
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
      ...overrides?.admin?.components,
    },
  },
})
