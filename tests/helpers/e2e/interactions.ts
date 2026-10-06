import path from 'node:path'

import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

const fixturesDir = path.resolve(import.meta.dirname, '../../fixtures')

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export const uploadFile = async (
  page: Page,
  collectionSlug: string,
  options?: { extraFields?: Record<string, string>; fixture?: string },
): Promise<void> => {
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

export const openFullscreen = async (page: Page): Promise<Locator> => {
  await page.locator('.media-preview-file__fullscreen').click()
  const modal = page.locator('.media-preview-modal')
  await expect(modal).toBeVisible()
  return modal
}

export const openCellPreview = async (page: Page, collection: string, rowText?: string): Promise<Locator> => {
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
