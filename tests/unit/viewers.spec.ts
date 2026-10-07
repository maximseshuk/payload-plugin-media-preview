import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IframeViewer } from '@/client/Viewer/IframeViewer.js'

describe('IframeViewer', () => {
  it('always has the frame class', () => {
    expect(renderToStaticMarkup(createElement(IframeViewer, { src: 'https://example.com' }))).toContain(
      'class="media-preview-viewer__frame"',
    )
  })

  it('adds a custom class after the frame class', () => {
    expect(
      renderToStaticMarkup(createElement(IframeViewer, { className: 'my-player', src: 'https://example.com' })),
    ).toContain('class="media-preview-viewer__frame my-player"')
  })
})
