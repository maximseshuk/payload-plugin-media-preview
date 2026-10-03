'use client'

import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/translations/index.js'

import { useConfig, useTranslation } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import type { PreviewData } from '../MediaPreview.types.js'

import { SIGN_URL_PATH } from '../MediaPreview.constants.js'
import { getExternalViewerUrl } from '../MediaPreview.utils.js'
import { DownloadCard } from './DownloadCard.js'

export const ExternalViewer: React.FC<{ kind: 'google' | 'office'; preview: PreviewData }> = ({ kind, preview }) => {
  const { id, collectionSlug, filename } = preview
  const { config } = useConfig()
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()
  const [state, setState] = useState<{ error?: boolean; src?: string }>({})
  const endpoint = `${config.serverURL}${config.routes.api}${SIGN_URL_PATH}`

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ id: String(id), collection: collectionSlug })
    setState({})
    fetch(`${endpoint}?${query}`, { credentials: 'include', signal: controller.signal })
      .then((res) =>
        res.ok ? (res.json() as Promise<{ url: string }>) : Promise.reject(new Error(String(res.status))),
      )
      .then(({ url }) => setState({ src: getExternalViewerUrl(kind, url) }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ error: true })
        }
      })
    return () => controller.abort()
  }, [collectionSlug, endpoint, id, kind])

  if (state.error) {
    return <DownloadCard {...preview} hint="loadError" />
  }
  if (!state.src) {
    return <p className="media-preview-viewer__loading">{t('general:loading')}…</p>
  }
  return (
    <iframe
      className="media-preview-viewer__frame"
      referrerPolicy="no-referrer"
      src={state.src}
      title={filename ?? t('@seshuk/payload-plugin-media-preview:titleDocument')}
    />
  )
}
