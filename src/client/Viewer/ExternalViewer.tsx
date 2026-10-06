'use client'

import { useConfig, useTranslation } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import { SIGN_URL_PATH } from '@/shared/constants.js'
import type { PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys } from '@/shared/translations/index.js'
import type { PreviewData, PreviewHint } from '@/shared/types/preview.js'
import { getExternalViewerUrl } from '@/shared/utils.js'

import { DownloadCard } from './DownloadCard.js'
import { FileActions } from './FileActions.js'

export const ExternalViewer: React.FC<{ kind: 'google' | 'office'; preview: PreviewData }> = ({ kind, preview }) => {
  const { id, collectionSlug, filename } = preview
  const { config } = useConfig()
  const { t } = useTranslation<PluginMediaPreviewTranslations, PluginMediaPreviewTranslationsKeys>()
  const [state, setState] = useState<{ hint?: PreviewHint; src?: string }>({})
  const endpoint = `${config.serverURL}${config.routes.api}${SIGN_URL_PATH}`

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ id: String(id), collection: collectionSlug })
    const load = async () => {
      let next: { hint?: PreviewHint; src?: string } = { hint: 'errorLoad' }
      try {
        const res = await fetch(`${endpoint}?${query}`, { credentials: 'include', signal: controller.signal })
        const body = (await res.json().catch(() => ({}))) as { hint?: PreviewHint; url?: string }
        next = res.ok && body.url ? { src: getExternalViewerUrl(kind, body.url) } : { hint: body.hint ?? 'errorLoad' }
      } catch {}
      if (!controller.signal.aborted) {
        setState(next)
      }
    }
    void load()
    return () => controller.abort()
  }, [collectionSlug, endpoint, id, kind])

  if (state.hint) {
    return <DownloadCard {...preview} hint={state.hint} />
  }
  if (!state.src) {
    return <p className="media-preview-viewer__loading">{t('general:loading')}…</p>
  }
  return (
    <div className="media-preview-viewer__external">
      <iframe
        className="media-preview-viewer__frame"
        referrerPolicy="no-referrer"
        src={state.src}
        title={filename ?? t('@seshuk/payload-plugin-media-preview:titleDocument')}
      />
      {preview.url && <FileActions filename={filename} url={preview.url} />}
    </div>
  )
}
