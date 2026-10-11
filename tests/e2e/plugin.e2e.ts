import type { Locator, Page, Route } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { openCellPreview, openFullscreen, uploadFile } from '../helpers/e2e/interactions.js'

const BASE_URL = 'http://localhost:47391'
const ALL_COLLECTIONS = [
  'media-default',
  'media-fullscreen',
  'media-newtab',
  'media-position',
  'media-adapter',
  'media-custom',
  'media-adapter-newtab',
  'media-standalone',
  'media-external',
  'media-signed',
  'media-stream',
  'media-async',
]

const fileUrl = (collection: string, fixture: string) => {
  const [name, ext] = fixture.split('.')
  return new RegExp(`/api/${collection}/file/${name}.*\\.${ext}$`)
}

test.describe('Media Preview Plugin', () => {
  test.describe.configure({ mode: 'serial' })

  test.afterEach(async () => {
    await Promise.all(
      ALL_COLLECTIONS.map((slug) => fetch(`${BASE_URL}/api/${slug}?where[id][exists]=true`, { method: 'DELETE' })),
    )
  })

  const payloadPreviews = [
    ['image', 'test-image.png', 'img'],
    ['pdf', 'test-document.pdf', 'iframe.pdf-preview'],
    ['video', 'test-video.mp4', 'video.video-preview'],
    ['audio', 'test-audio.mp3', 'audio'],
  ]

  for (const [kind, fixture, selector] of payloadPreviews) {
    test(`${kind}: keeps the Payload preview in the edit view`, async ({ page }) => {
      await uploadFile(page, 'media-default', { fixture })
      await expect(page.locator(`.file-preview ${selector}`)).toBeVisible()
      await expect(page.locator('.media-preview-file')).toHaveCount(0)
    })
  }

  test('text: renders as plain text in the edit view', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-text.txt' })
    await expect(page.locator('.media-preview-file .view-lines')).toContainText('<b>markup</b>')
    await expect(page.locator('.media-preview-file b')).toHaveCount(0)
  })

  test('text: shows the load error when the file request fails', async ({ page }) => {
    await page.route('**/api/media-default/file/test-text*', (route) => route.fulfill({ body: 'Error', status: 500 }))
    await uploadFile(page, 'media-default', { fixture: 'test-text.txt' })
    await expect(page.locator('.media-preview-file .media-preview-card')).toContainText(
      'The preview could not be loaded.',
    )
    await expect(page.locator('.media-preview-file .view-lines')).toHaveCount(0)
  })

  test('ts: detects code by extension and highlights it', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-code.ts' })
    const code = page.locator('.media-preview-file .media-preview-viewer__code--ready')
    await expect(code.locator('.view-lines')).toContainText('export const greet')
    await expect(code.locator('.view-lines span[class*="mtk"]:not(.mtk1)').first()).toBeAttached()
    await expect(code.locator('.minimap')).toBeHidden()
  })

  test('zip: shows the download card in the edit view', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-archive.zip' })
    const card = page.locator('.media-preview-file .media-preview-card')
    await expect(card).toContainText('No preview for this file type.')
    await expect(card.locator('.media-preview-card__meta')).toHaveText('204 bytes · application/zip')
    const download = card.locator('a[download]')
    await expect(download).toBeVisible()
    await expect(download).toHaveAttribute('href', fileUrl('media-default', 'test-archive.zip'))
    await expect(download).toHaveAttribute('download', 'test-archive-original.zip')
    await expect(page.locator('.file-preview .thumbnail')).toHaveCount(0)
    await expect(page.locator('.media-preview-file__fullscreen')).toHaveCount(0)
  })

  test('text: opens fullscreen modal', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-text.txt' })
    const modal = await openFullscreen(page)
    await expect(modal.locator('.media-preview-modal__title')).toHaveText('test-text-original.txt')
    await expect(modal.locator('.view-lines')).toContainText('Second line')
    await page.locator('button.media-preview-modal__close').click()
    await expect(modal).not.toBeVisible()
  })

  test('json: renders pretty-printed', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-data.json' })
    await expect(page.locator('.media-preview-file .view-lines')).toContainText('"nested": {')
  })

  test('csv: renders as a table', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-table.csv' })
    const table = page.locator('.media-preview-file table')
    await expect(table.locator('tr')).toHaveCount(3)
    await expect(table).toContainText('says "hi"')
  })

  test('docx: shows the private server hint on localhost', async ({ page }) => {
    await uploadFile(page, 'media-external', { fixture: 'test-document.docx' })
    await expect(page.locator('.media-preview-file .media-preview-card')).toContainText(
      'Preview needs a public server address.',
    )
  })

  const viewerResponses: [string, (route: Route) => Promise<void> | void][] = [
    ['a blank page', (route) => route.fulfill({ body: '', contentType: 'text/html' })],
    ['an error page', (route) => route.fulfill({ body: 'Error', contentType: 'text/html', status: 500 })],
    ['a network error', (route) => route.abort('failed')],
    ['no response', () => {}],
  ]

  const uploadSignedDocx = async (page: Page, respond: (route: Route) => Promise<void> | void) => {
    await page.route('https://view.officeapps.live.com/**', respond)
    await uploadFile(page, 'media-signed', {
      extraFields: { signedUrl: 'https://files.example.com/test-document.docx' },
      fixture: 'test-document.docx',
    })
  }

  const expectViewerWithActions = async (scope: Locator) => {
    const viewer = scope.locator('.media-preview-viewer__external')
    const frame = viewer.locator('iframe')
    const download = viewer.locator('a[download]')
    await expect(frame).toHaveAttribute(
      'src',
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent('https://files.example.com/test-document.docx')}`,
    )
    await expect(download).toBeVisible()
    await expect(download).toHaveAttribute('href', /\/api\/media-signed\/file\/test-document.*\.docx$/)
    await expect(viewer.locator('a[target="_blank"]')).toBeVisible()

    const frameBox = (await frame.boundingBox())!
    const downloadBox = (await download.boundingBox())!
    expect(frameBox.height).toBeGreaterThan(100)
    expect(downloadBox.y).toBeGreaterThanOrEqual(frameBox.y + frameBox.height)
  }

  for (const [name, respond] of viewerResponses) {
    test(`docx: shows download and open links under the external viewer on ${name}`, async ({ page }) => {
      await uploadSignedDocx(page, respond)
      await expectViewerWithActions(page.locator('.media-preview-file'))
    })
  }

  test('docx: shows download and open links under the external viewer in fullscreen', async ({ page }) => {
    await uploadSignedDocx(page, () => {})
    await expectViewerWithActions(await openFullscreen(page))
  })

  test('docx: shows download and open links under the external viewer in cell popup', async ({ page }) => {
    await uploadSignedDocx(page, () => {})
    await expectViewerWithActions(await openCellPreview(page, 'media-signed'))
  })

  test('docx: shows the hint the sign endpoint returns', async ({ page }) => {
    await uploadFile(page, 'media-signed', { fixture: 'test-document.docx' })
    const card = page.locator('.media-preview-file .media-preview-card')
    await expect(card).toContainText('Preview needs a public server address.')
    await expect(card.locator('a[download]')).toBeVisible()
  })

  const signFailures: [string, (route: Route) => Promise<void>][] = [
    ['an error without a hint', (route) => route.fulfill({ body: 'Error', status: 500 })],
    ['a network error', (route) => route.abort('failed')],
  ]

  for (const [name, respond] of signFailures) {
    test(`docx: shows the load error when the sign endpoint returns ${name}`, async ({ page }) => {
      await page.route('**/api/media-preview/url**', respond)
      await uploadSignedDocx(page, () => {})
      await expect(page.locator('.media-preview-file .media-preview-card')).toContainText(
        'The preview could not be loaded.',
      )
      await expect(page.locator('.media-preview-file iframe')).toHaveCount(0)
    })
  }

  test('stream adapter: falls back to the native player that fills the preview and autoplays only in fullscreen', async ({
    page,
  }) => {
    await uploadFile(page, 'media-stream', { fixture: 'test-video.mp4' })
    await expect(page.locator('.media-preview-file video')).toHaveJSProperty('autoplay', false)
    const fileBox = (await page.locator('.media-preview-file').boundingBox())!
    const videoBox = (await page.locator('.media-preview-file video').boundingBox())!
    expect(videoBox.width).toBeCloseTo(fileBox.width, 0)
    expect(videoBox.height).toBeCloseTo(fileBox.height, 0)
    const modal = await openFullscreen(page)
    await expect(modal.locator('video')).toHaveJSProperty('autoplay', true)
  })

  test('async adapter: renders iframe in the edit view', async ({ page }) => {
    await uploadFile(page, 'media-async', { extraFields: { assetId: 'a1' }, fixture: 'test-video.mp4' })
    const iframe = page.locator('.media-preview-file iframe')
    await expect(iframe).toHaveAttribute('src', 'https://example.com/async/a1')
    await expect(iframe).toHaveAttribute('title', 'Asset a1')
  })

  test('async adapter: renders iframe in cell popup', async ({ page }) => {
    await uploadFile(page, 'media-async', { extraFields: { assetId: 'a2' }, fixture: 'test-video.mp4' })
    const popup = await openCellPreview(page, 'media-async')
    await expect(popup.locator('iframe')).toHaveAttribute('src', 'https://example.com/async/a2')
  })

  const cellPopups: [string, string, string, string, RegExp | string][] = [
    ['image', 'test-image.png', 'test-image-original.png', 'img', fileUrl('media-default', 'test-image.png')],
    ['video', 'test-video.mp4', 'test-video-original.mp4', 'video source', fileUrl('media-default', 'test-video.mp4')],
    ['audio', 'test-audio.mp3', 'test-audio-original.mp3', 'audio source', fileUrl('media-default', 'test-audio.mp3')],
    ['pdf', 'test-document.pdf', 'test-document-original.pdf', 'iframe', fileUrl('media-default', 'test-document.pdf')],
    ['text', 'test-text.txt', 'test-text-original.txt', '.view-lines', 'Second line'],
  ]

  for (const [kind, fixture, filename, selector, expected] of cellPopups) {
    test(`${kind}: shows the file in cell popup`, async ({ page }) => {
      await uploadFile(page, 'media-default', { fixture })
      const preview = (await openCellPreview(page, 'media-default', filename)).locator(selector)
      await (typeof expected === 'string'
        ? expect(preview).toContainText(expected)
        : expect(preview).toHaveAttribute('src', expected))
    })
  }

  test('video: unmounts the cell popup player on second click', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-video.mp4' })
    const popup = await openCellPreview(page, 'media-default', 'test-video-original.mp4')
    await expect(popup.locator('video')).toHaveJSProperty('autoplay', true)
    await page.locator('.cell-mediaPreview button').click()
    await expect(popup).not.toBeAttached()
    await expect(page.locator('video')).toHaveCount(0)
  })

  test('zip: opens the download card from the cell', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-archive.zip' })
    const popup = await openCellPreview(page, 'media-default', '.zip')
    await expect(popup.locator('.media-preview-card')).toContainText('No preview for this file type.')
    await page.keyboard.press('Escape')
    await expect(popup).not.toBeAttached()
  })

  test('fullscreen: opens the cell preview in a modal that reopens after each close', async ({ page }) => {
    await uploadFile(page, 'media-fullscreen')
    const modal = await openCellPreview(page, 'media-fullscreen', 'test-image-original.png', '.media-preview-modal')
    await expect(modal.locator('.media-preview-modal__title')).toHaveText('test-image-original.png')
    await expect(modal.locator('img')).toHaveAttribute('src', fileUrl('media-fullscreen', 'test-image.png'))
    await expect(page.locator('.media-preview-popup')).toHaveCount(0)

    const closes = [
      () => modal.locator('button.media-preview-modal__close').click(),
      () => page.keyboard.press('Escape'),
      () => modal.locator('.media-preview-modal__backdrop').click({ position: { x: 5, y: 5 } }),
    ]
    for (const close of closes) {
      await close()
      await expect(modal).not.toBeAttached()
      await page.locator('.cell-mediaPreview button').click()
      await expect(modal).toBeVisible()
    }
  })

  test('fullscreen: opens only the modal of the clicked row', async ({ page }) => {
    await uploadFile(page, 'media-fullscreen')
    await uploadFile(page, 'media-fullscreen', { fixture: 'test-image.jpg' })
    const modal = await openCellPreview(page, 'media-fullscreen', 'test-image-original.jpg', '.media-preview-modal')
    await expect(modal).toHaveCount(1)
    await expect(modal.locator('.media-preview-modal__title')).toHaveText('test-image-original.jpg')
    await expect(modal.locator('img')).toHaveAttribute('src', fileUrl('media-fullscreen', 'test-image.jpg'))
  })

  for (const [kind, fixture] of [
    ['video', 'test-video.mp4'],
    ['pdf', 'test-document.pdf'],
  ]) {
    test(`newTab: renders a link for ${kind}`, async ({ page }) => {
      await uploadFile(page, 'media-newtab', { fixture })
      await page.goto('/admin/collections/media-newtab')
      const cell = page.locator('.cell-mediaPreview').first()
      const link = cell.locator('a[target="_blank"]')
      await expect(link).toBeVisible({ timeout: 10000 })
      await expect(link).toHaveAttribute('href', fileUrl('media-newtab', fixture))
      await expect(cell.locator('button')).toHaveCount(0)
    })
  }

  test('newTab: keeps the popup for an image', async ({ page }) => {
    await uploadFile(page, 'media-newtab')
    const popup = await openCellPreview(page, 'media-newtab')
    await expect(popup.locator('img')).toHaveAttribute('src', fileUrl('media-newtab', 'test-image.png'))
    await expect(page.locator('.cell-mediaPreview a')).toHaveCount(0)
  })

  test('position: shows the column after alt', async ({ page }) => {
    await uploadFile(page, 'media-position', { extraFields: { alt: 'test alt' } })
    await page.goto('/admin/collections/media-position')
    await expect(page.locator('.cell-alt + .cell-mediaPreview').first()).toBeVisible({ timeout: 10000 })
  })

  test('adapter: renders iframe when externalVideoId is set', async ({ page }) => {
    await uploadFile(page, 'media-adapter', { extraFields: { externalVideoId: 'abc123' } })
    const popup = await openCellPreview(page, 'media-adapter')
    await expect(popup.locator('iframe')).toHaveAttribute('src', 'https://example.com/embed/abc123')
  })

  test('custom adapter: renders in cell popup', async ({ page }) => {
    await uploadFile(page, 'media-custom', { extraFields: { embedId: '123456', provider: 'vimeo' } })

    const popup = await openCellPreview(page, 'media-custom', 'vimeo')

    const viewer = popup.locator('[data-testid="custom-viewer"]')
    await expect(viewer).toBeAttached({ timeout: 10000 })
    await expect(viewer).toHaveAttribute('data-provider', 'vimeo')
    await expect(viewer).toHaveAttribute('data-embed-id', '123456')
  })

  test('custom adapter: falls back to default viewer', async ({ page }) => {
    await uploadFile(page, 'media-custom')
    const popup = await openCellPreview(page, 'media-custom')
    await expect(popup.locator('[data-testid="custom-viewer"]')).toHaveCount(0)
    await expect(popup.locator('img')).toHaveAttribute('src', fileUrl('media-custom', 'test-image.png'))
  })

  test('adapter newTab: renders a link in the edit view and the cell', async ({ page }) => {
    await uploadFile(page, 'media-adapter-newtab', {
      extraFields: { externalUrl: 'https://example.com/preview' },
      fixture: 'test-text.txt',
    })
    const fileLink = page.locator('.media-preview-file a[target="_blank"]')
    await expect(fileLink).toHaveAttribute('href', 'https://example.com/preview')
    await expect(page.locator('.media-preview-file .view-lines')).toHaveCount(0)

    await page.goto('/admin/collections/media-adapter-newtab')
    const link = page.locator('.cell-mediaPreview a[target="_blank"]').first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await expect(link).toHaveAttribute('href', 'https://example.com/preview')
  })

  test('standalone: adapter works with manually inserted field', async ({ page }) => {
    await uploadFile(page, 'media-standalone', { extraFields: { externalVideoId: 'xyz789' } })
    const modal = await openCellPreview(page, 'media-standalone', undefined, '.media-preview-modal')
    await expect(modal.locator('iframe')).toHaveAttribute('src', 'https://example.com/embed/xyz789')
  })

  test.describe('on a touch device', () => {
    test.use({ hasTouch: true })

    test('auto mode opens the cell preview in a modal', async ({ page }) => {
      await uploadFile(page, 'media-default')
      const modal = await openCellPreview(page, 'media-default', 'test-image-original.png', '.media-preview-modal')
      await expect(modal.locator('img')).toHaveAttribute('src', fileUrl('media-default', 'test-image.png'))
      await expect(page.locator('.media-preview-popup')).toHaveCount(0)
    })
  })
})
