'use client'

import { CodeEditorLazy, useTranslation } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import { TEXT_PREVIEW_MAX_SIZE } from '@/shared/constants.js'
import type { PreviewData } from '@/shared/types/preview.js'
import { formatText, getCodeLanguage, isCsv, parseCsv, readText } from '@/shared/utils.js'

import { DownloadCard } from './DownloadCard.js'

const EDITOR_OPTIONS = {
  contextmenu: false,
  domReadOnly: true,
  fontSize: 13,
  hover: { enabled: false },
  lineHeight: 20,
  occurrencesHighlight: 'off',
  overviewRulerLanes: 0,
  renderLineHighlight: 'none',
  renderValidationDecorations: 'off',
  selectionHighlight: false,
} as const

const CodeViewer: React.FC<{ language: string; text: string }> = ({ language, text }) => {
  const [ready, setReady] = useState(false)
  return (
    <div className={`media-preview-viewer__code${ready ? ' media-preview-viewer__code--ready' : ''}`}>
      {!ready && <pre className="media-preview-viewer__text">{text}</pre>}
      <div className="media-preview-viewer__editor">
        <CodeEditorLazy
          height="100%"
          language={language}
          onMount={() => setReady(true)}
          options={EDITOR_OPTIONS}
          readOnly
          value={text}
        />
      </div>
    </div>
  )
}

export const TextViewer: React.FC<{ preview: PreviewData }> = ({ preview }) => {
  const { credentials, filename, mimeType, url } = preview
  const { t } = useTranslation()
  const [state, setState] = useState<{ error?: boolean; text?: string }>({})

  useEffect(() => {
    if (!url) {
      return
    }
    const controller = new AbortController()
    fetch(url, { credentials, signal: controller.signal })
      .then((res) => (res.ok ? readText(res, TEXT_PREVIEW_MAX_SIZE) : Promise.reject(new Error(String(res.status)))))
      .then((text) => setState({ text }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ error: true })
        }
      })
    return () => controller.abort()
  }, [credentials, url])

  if (state.error) {
    return <DownloadCard {...preview} hint="loadError" />
  }
  if (state.text === undefined) {
    return <p className="media-preview-viewer__loading">{t('general:loading')}…</p>
  }

  if (isCsv(mimeType, filename)) {
    const [head = [], ...rows] = parseCsv(state.text)
    return (
      <div className="media-preview-viewer__table-wrap">
        <table className="media-preview-viewer__table">
          <thead>
            <tr>
              {head.map((cell, i) => (
                <th key={i}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const language = getCodeLanguage(mimeType, filename)
  return <CodeViewer language={language} text={formatText(state.text, language)} />
}
