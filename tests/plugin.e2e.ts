import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.resolve(__dirname, 'fixtures')
const BASE_URL = 'http://localhost:3000'
const ALL_COLLECTIONS = ['media-default', 'media-fullscreen', 'media-newtab', 'media-position', 'media-adapter', 'media-custom', 'media-adapter-newtab', 'media-standalone']

// Helpers

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

const openFieldPreview = async (page: Page) => {
  await page.locator('.media-preview__button-wrapper button').click()
  const modal = page.locator('.media-preview-modal--fullscreen')
  await expect(modal).toBeVisible()
  return modal
}

const openCellPreview = async (page: Page, collection: string, rowText?: string) => {
  await page.goto(`/admin/collections/${collection}`)

  const row = rowText
    ? page.locator('tr', { hasText: rowText }).first()
    : page.locator('.cell-mediaPreview').first()

  await expect(row).toBeVisible({ timeout: 10000 })
  await page.waitForLoadState('networkidle')
  const btn = row.locator(rowText ? '.cell-mediaPreview button' : 'button')
  await btn.click()

  const popup = page.locator('.media-preview-modal--popup')
  await expect(popup).toBeAttached({ timeout: 10000 })
  return popup
}

// Tests

test.describe('Media Preview Plugin', () => {
  test.describe.configure({ mode: 'serial' })

  test.afterEach(async () => {
    await Promise.all(
      ALL_COLLECTIONS.map((slug) =>
        fetch(`${BASE_URL}/api/${slug}?where[id][exists]=true`, { method: 'DELETE' }),
      ),
    )
  })

  // Image

  test('image: shows preview button after upload', async ({ page }) => {
    await uploadFile(page, 'media-default')
    await expect(page.locator('.media-preview__button-wrapper button')).toBeVisible()
  })

  test('image: opens fullscreen modal', async ({ page }) => {
    await uploadFile(page, 'media-default')
    const modal = await openFieldPreview(page)
    await expect(modal.locator('img')).toBeVisible()
  })

  test('image: closes modal on close button', async ({ page }) => {
    await uploadFile(page, 'media-default')
    const modal = await openFieldPreview(page)
    await page.locator('button.media-preview-modal__close').click()
    await expect(modal).not.toBeVisible()
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
    const popup = page.locator('.media-preview-modal--popup')
    await expect(popup).toBeAttached({ timeout: 10000 })

    await cell.locator('button').click()
    await expect(popup).not.toBeAttached({ timeout: 10000 })
  })

  // Video

  test('video: shows player in modal', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-video.mp4' })
    const modal = await openFieldPreview(page)
    await expect(modal.locator('video')).toBeVisible()
  })

  test('video: shows player in cell popup', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-video.mp4' })
    const popup = await openCellPreview(page, 'media-default', '.mp4')
    await expect(popup.locator('video')).toBeAttached()
  })

  // Audio

  test('audio: shows player in modal', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-audio.mp3' })
    const modal = await openFieldPreview(page)
    await expect(modal.locator('audio')).toBeAttached()
  })

  test('audio: shows player in cell popup', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-audio.mp3' })
    const popup = await openCellPreview(page, 'media-default', '.mp3')
    await expect(popup.locator('audio')).toBeAttached()
  })

  // Document

  test('document: shows iframe in modal', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-document.pdf' })
    const modal = await openFieldPreview(page)
    await expect(modal.locator('iframe')).toBeVisible()
  })

  test('document: shows iframe in cell popup', async ({ page }) => {
    await uploadFile(page, 'media-default', { fixture: 'test-document.pdf' })
    const popup = await openCellPreview(page, 'media-default', '.pdf')
    await expect(popup.locator('iframe')).toBeAttached()
  })

  // Modes

  test('fullscreen mode when configured', async ({ page }) => {
    await uploadFile(page, 'media-fullscreen')
    await openFieldPreview(page)
  })

  test('newTab mode renders link for video', async ({ page }) => {
    await uploadFile(page, 'media-newtab', { fixture: 'test-video.mp4' })
    await expect(page.locator('.media-preview__button-wrapper a[target="_blank"]')).toBeVisible()
  })

  // Field position

  test('position: shows preview after alt field', async ({ page }) => {
    await uploadFile(page, 'media-position', { extraFields: { alt: 'test alt' } })
    await expect(page.locator('.media-preview__button-wrapper button')).toBeVisible()
  })

  // Built-in adapter (IframeViewer)

  test('adapter: renders iframe when externalVideoId is set', async ({ page }) => {
    await uploadFile(page, 'media-adapter', { extraFields: { externalVideoId: 'abc123' } })
    const modal = await openFieldPreview(page)
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()
    await expect(iframe).toHaveAttribute('src', 'https://example.com/embed/abc123')
  })

  test('adapter: falls back to default viewer when resolve returns null', async ({ page }) => {
    await uploadFile(page, 'media-adapter')
    const modal = await openFieldPreview(page)
    await expect(modal.locator('img')).toBeVisible()
  })

  // Custom adapter

  test('custom adapter: renders in field modal', async ({ page }) => {
    await uploadFile(page, 'media-custom', { extraFields: { embedId: 'dQw4w9WgXcQ', provider: 'youtube' } })
    const modal = await openFieldPreview(page)

    const viewer = modal.locator('[data-testid="custom-viewer"]')
    await expect(viewer).toBeVisible()
    await expect(viewer).toHaveAttribute('data-provider', 'youtube')
    await expect(viewer).toHaveAttribute('data-embed-id', 'dQw4w9WgXcQ')
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
    const modal = await openFieldPreview(page)
    await expect(modal.locator('[data-testid="custom-viewer"]')).not.toBeVisible()
    await expect(modal.locator('img')).toBeVisible()
  })

  // Adapter newTab

  test('adapter newTab: renders link button in field when externalUrl is set', async ({ page }) => {
    await uploadFile(page, 'media-adapter-newtab', { extraFields: { externalUrl: 'https://example.com/preview' } })
    const link = page.locator('.media-preview__button-wrapper a[target="_blank"]')
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', 'https://example.com/preview')
  })

  test('adapter newTab: falls back to default viewer when resolve returns null', async ({ page }) => {
    await uploadFile(page, 'media-adapter-newtab')
    const modal = await openFieldPreview(page)
    await expect(modal.locator('img')).toBeVisible()
  })

  // Standalone field (field: false)

  test('standalone: shows preview button with manually inserted field', async ({ page }) => {
    await uploadFile(page, 'media-standalone')
    await expect(page.locator('.media-preview__button-wrapper button')).toBeVisible()
  })

  test('standalone: opens fullscreen modal with image', async ({ page }) => {
    await uploadFile(page, 'media-standalone')
    const modal = await openFieldPreview(page)
    await expect(modal.locator('img')).toBeVisible()
  })

  test('standalone: adapter works with manually inserted field', async ({ page }) => {
    await uploadFile(page, 'media-standalone', { extraFields: { externalVideoId: 'xyz789' } })
    const modal = await openFieldPreview(page)
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()
    await expect(iframe).toHaveAttribute('src', 'https://example.com/embed/xyz789')
  })

  test('standalone: shows preview in list view cell', async ({ page }) => {
    await uploadFile(page, 'media-standalone')
    await page.goto('/admin/collections/media-standalone')
    await expect(page.locator('.cell-mediaPreview').first()).toBeVisible({ timeout: 10000 })
  })

  test('adapter newTab: renders link in cell', async ({ page }) => {
    await uploadFile(page, 'media-adapter-newtab', { extraFields: { externalUrl: 'https://example.com/preview' } })
    await page.goto('/admin/collections/media-adapter-newtab')
    const link = page.locator('.cell-mediaPreview a[target="_blank"]').first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await expect(link).toHaveAttribute('href', 'https://example.com/preview')
  })
})
