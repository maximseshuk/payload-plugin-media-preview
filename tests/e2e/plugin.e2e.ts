import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.resolve(__dirname, '../fixtures')
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
  'media-stream',
  'media-async',
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const uploadFile = async (
  page: Page,
  collectionSlug: string,
  options?: { extraFields?: Record<string, string>; fixture?: string },
) => {
  const fixture = options?.fixture ?? 'test-image.png'

  await page.goto(`/admin/collections/${collectionSlug}/create`)

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Select a file').click()
  const fileChooser = await fileChooserPromise
  await wait(1000)
  await fileChooser.setFiles(path.join(fixturesDir, fixture))

  if (options?.extraFields) {
    for (const [id, value] of Object.entries(options.extraFields)) {
      await page.locator(`#field-${id}`).fill(value)
    }
  }

  await page.waitForSelector('button#action-save')
  await page.locator('button#action-save').click()
  await expect(page.locator('.payload-toast-container')).toContainText('successfully', { timeout: 10000 })
  await wait(1000)
}

const openFullscreen = async (page: Page) => {
  await page.locator('.media-preview-file__fullscreen').click()
  const modal = page.locator('.media-preview-modal')
  await expect(modal).toBeVisible()
  return modal
}

const openCellPreview = async (page: Page, collection: string, rowText?: string) => {
  await page.goto(`/admin/collections/${collection}`)

  const row = rowText ? page.locator('tr', { hasText: rowText }).first() : page.locator('.cell-mediaPreview').first()

  await expect(row).toBeVisible({ timeout: 10000 })
  await page.waitForLoadState('networkidle')
  const btn = row.locator(rowText ? '.cell-mediaPreview button' : 'button')
  await btn.click()

  const popup = page.locator('.media-preview-popup')
  await expect(popup).toBeAttached({ timeout: 10000 })
  return popup
}

test.describe('Media Preview Plugin', () => {
  test.describe.configure({ mode: 'serial' })

  test.afterEach(async () => {
    await Promise.all(
      ALL_COLLECTIONS.map((slug) => fetch(`${BASE_URL}/api/${slug}?where[id][exists]=true`, { method: 'DELETE' })),
    )
  })

  test('image: keeps the Payload preview in the edit view', async ({ page }) => {
    await uploadFile(page, 'media-default')
    await expect(page.locator('.file-preview img')).toBeVisible()
    await expect(page.locator('.media-preview-file')).toHaveCount(0)
  })

  test('text: renders as plain text in the edit view', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-text.txt' })
    await expect(page.locator('.media-preview-file .view-lines')).toContainText('<b>markup</b>')
    await expect(page.locator('.media-preview-file b')).toHaveCount(0)
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
    await expect(card.locator('a[download]')).toBeVisible()
    await expect(page.locator('.file-preview .thumbnail')).toHaveCount(0)
  })

  test('text: opens fullscreen modal', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-text.txt' })
    const modal = await openFullscreen(page)
    await expect(modal.locator('.media-preview-modal__title')).toHaveText('test-text.txt')
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

  test('docx: shows the download card when external viewers are off', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-document.docx' })
    const card = page.locator('.media-preview-file .media-preview-card')
    await expect(card).toContainText('No preview for this file type.')
    await expect(card.locator('a[download]')).toBeVisible()
    await expect(page.locator('.media-preview-file__fullscreen')).toHaveCount(0)
  })

  test('docx: shows the private server hint on localhost', async ({ page }) => {
    await uploadFile(page, 'media-external', { fixture: 'test-document.docx' })
    await expect(page.locator('.media-preview-card')).toContainText('Preview needs a public server address.')
  })

  test('stream adapter: renders iframe in the edit view', async ({ page }) => {
    await uploadFile(page, 'media-stream', { extraFields: { streamId: 'abc123' }, fixture: 'test-video.mp4' })
    const iframe = page.locator('.media-preview-file iframe')
    await expect(iframe).toHaveAttribute('src', 'https://example.com/stream/abc123')
  })

  test('stream adapter: falls back to the native player', async ({ page }) => {
    await uploadFile(page, 'media-stream', { fixture: 'test-video.mp4' })
    await expect(page.locator('.media-preview-file video')).toBeAttached()
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

  test('image: shows preview in list view cell', async ({ page }) => {
    await uploadFile(page, 'media-default')
    await page.goto('/admin/collections/media-default')
    await expect(page.locator('.cell-mediaPreview').first()).toBeVisible({ timeout: 10000 })
  })

  test('image: opens cell popup with image', async ({ page }) => {
    await uploadFile(page, 'media-default')
    const popup = await openCellPreview(page, 'media-default')
    await expect(popup.locator('img')).toBeAttached()
  })

  test('image: closes cell popup on second click', async ({ page }) => {
    await uploadFile(page, 'media-default')
    await page.goto('/admin/collections/media-default')

    const cell = page.locator('.cell-mediaPreview').first()
    await expect(cell).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    await cell.locator('button').click()
    const popup = page.locator('.media-preview-popup')
    await expect(popup).toBeAttached({ timeout: 10000 })

    await cell.locator('button').click()
    await expect(popup).not.toBeAttached({ timeout: 10000 })
  })

  test('video: shows player in cell popup', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-video.mp4' })
    const popup = await openCellPreview(page, 'media-default', '.mp4')
    await expect(popup.locator('video')).toBeAttached()
  })

  test('audio: shows player in cell popup', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-audio.mp3' })
    const popup = await openCellPreview(page, 'media-default', '.mp3')
    await expect(popup.locator('audio')).toBeAttached()
  })

  test('pdf: shows iframe in cell popup', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-document.pdf' })
    const popup = await openCellPreview(page, 'media-default', '.pdf')
    await expect(popup.locator('iframe')).toBeAttached()
  })

  test('text: shows text in cell popup', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-text.txt' })
    const popup = await openCellPreview(page, 'media-default', '.txt')
    await expect(popup.locator('.view-lines')).toContainText('Second line')
  })

  test('zip: opens the download card from the cell', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-archive.zip' })
    const popup = await openCellPreview(page, 'media-default', '.zip')
    await expect(popup.locator('.media-preview-card')).toContainText('No preview for this file type.')
    await page.keyboard.press('Escape')
    await expect(popup).not.toBeAttached()
  })

  test('fullscreen mode when configured', async ({ page }) => {
    await uploadFile(page, 'media-fullscreen')
    await page.goto('/admin/collections/media-fullscreen')
    await page.locator('.cell-mediaPreview button').first().click()
    await expect(page.locator('.media-preview-modal')).toBeVisible()
  })

  test('newTab mode renders link for video', async ({ page }) => {
    await uploadFile(page, 'media-newtab', { fixture: 'test-video.mp4' })
    await page.goto('/admin/collections/media-newtab')
    await expect(page.locator('.cell-mediaPreview a[target="_blank"]').first()).toBeVisible({ timeout: 10000 })
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

  test('adapter: falls back to default viewer when resolve returns null', async ({ page }) => {
    await uploadFile(page, 'media-adapter')
    const popup = await openCellPreview(page, 'media-adapter')
    await expect(popup.locator('img')).toBeAttached()
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
    await expect(popup.locator('img')).toBeAttached()
  })

  test('adapter newTab: renders link in cell', async ({ page }) => {
    await uploadFile(page, 'media-adapter-newtab', { extraFields: { externalUrl: 'https://example.com/preview' } })
    await page.goto('/admin/collections/media-adapter-newtab')
    const link = page.locator('.cell-mediaPreview a[target="_blank"]').first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await expect(link).toHaveAttribute('href', 'https://example.com/preview')
  })

  test('standalone: shows preview in list view cell', async ({ page }) => {
    await uploadFile(page, 'media-standalone')
    await page.goto('/admin/collections/media-standalone')
    await expect(page.locator('.cell-mediaPreview').first()).toBeVisible({ timeout: 10000 })
  })

  test('standalone: adapter works with manually inserted field', async ({ page }) => {
    await uploadFile(page, 'media-standalone', { extraFields: { externalVideoId: 'xyz789' } })
    await page.goto('/admin/collections/media-standalone')
    await page.locator('.cell-mediaPreview button').first().click()
    const modal = page.locator('.media-preview-modal')
    await expect(modal.locator('iframe')).toHaveAttribute('src', 'https://example.com/embed/xyz789')
  })
})
