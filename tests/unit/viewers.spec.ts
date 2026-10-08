import type { FC } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AudioViewer } from '@/client/Viewer/AudioViewer.js'
import { IframeViewer } from '@/client/Viewer/IframeViewer.js'
import { ImageViewer } from '@/client/Viewer/ImageViewer.js'
import { VideoViewer } from '@/client/Viewer/VideoViewer.js'

const src = 'https://example.com/file'

describe.each<[string, FC<{ className?: string; src: string }>, string]>([
  ['AudioViewer', AudioViewer, 'media-preview-viewer__audio'],
  ['IframeViewer', IframeViewer, 'media-preview-viewer__frame'],
  ['ImageViewer', ImageViewer, 'media-preview-viewer__media'],
  ['VideoViewer', VideoViewer, 'media-preview-viewer__media'],
])('%s', (_, Viewer, baseClass) => {
  it('always has the plugin class', () => {
    expect(renderToStaticMarkup(createElement(Viewer, { src }))).toContain(`class="${baseClass}"`)
  })

  it('adds a custom class after the plugin class', () => {
    expect(renderToStaticMarkup(createElement(Viewer, { className: 'my-player', src }))).toContain(
      `class="${baseClass} my-player"`,
    )
  })
})
