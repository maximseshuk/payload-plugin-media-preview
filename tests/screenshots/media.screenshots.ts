import fs from 'node:fs/promises'
import path from 'node:path'

import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const root = path.resolve(import.meta.dirname, '../..')
const fixtures = path.join(root, 'tests/fixtures')
const outDir = path.join(root, 'media/screenshots')
const collection = 'media'

const code = `import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    defaultColumns: ['title', 'author', 'status', 'updatedAt'],
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', index: true, unique: true },
    { name: 'author', type: 'relationship', relationTo: 'users' },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'content', type: 'richText' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: ['draft', 'review', 'published'],
    },
  ],
}
`

const csv = `sku,product,category,price,stock,updated
PL-1001,Linen Shirt,Apparel,59.00,128,2026-10-02
PL-1002,Canvas Tote,Accessories,24.00,342,2026-10-03
PL-1003,Wool Beanie,Accessories,19.50,87,2026-10-03
PL-1004,Denim Jacket,Apparel,119.00,41,2026-10-04
PL-1005,Leather Belt,Accessories,45.00,63,2026-10-05
PL-1006,Cotton Hoodie,Apparel,74.00,156,2026-10-06
PL-1007,Trail Sneakers,Footwear,135.00,29,2026-10-07
PL-1008,Rain Shell,Outerwear,149.00,18,2026-10-08
PL-1009,Merino Socks,Apparel,16.00,410,2026-10-08
PL-1010,Weekender Bag,Accessories,189.00,12,2026-10-09
`

const files: { buffer: Buffer | string; mimeType: string; name: string }[] = [
  {
    buffer: await fs.readFile(path.join(fixtures, 'test-archive.zip')),
    mimeType: 'application/zip',
    name: 'brand-assets.zip',
  },
  {
    buffer: await fs.readFile(path.join(fixtures, 'test-document.pdf')),
    mimeType: 'application/pdf',
    name: 'pricing.pdf',
  },
  { buffer: await fs.readFile(path.join(fixtures, 'test-video.mp4')), mimeType: 'video/mp4', name: 'product-tour.mp4' },
  { buffer: csv, mimeType: 'text/csv', name: 'products.csv' },
  { buffer: code, mimeType: 'text/plain', name: 'posts.ts' },
  { buffer: await fs.readFile(path.join(root, 'media/og.png')), mimeType: 'image/png', name: 'launch-banner.png' },
]

const upload = async (request: APIRequestContext, file: (typeof files)[number]) => {
  const created = await request.post(`/api/${collection}`, {
    multipart: { file: { ...file, buffer: Buffer.from(file.buffer) } },
  })
  expect(created.ok()).toBe(true)
  const { doc } = (await created.json()) as { doc: { id: number | string } }
  return doc.id
}

const frame = async (page: Page, name: string) => {
  const shot = await page.screenshot()
  const url = new URL(page.url())
  const framePage = await page.context().newPage()
  await framePage.setViewportSize({ height: 960, width: 1408 })
  await framePage.setContent(`<!doctype html>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: #0a0c0e; }
  .stage {
    background:
      radial-gradient(60% 70% at 18% 20%, rgba(15, 143, 232, 0.28), transparent 70%),
      radial-gradient(50% 60% at 90% 100%, rgba(15, 143, 232, 0.12), transparent 70%),
      #0a0c0e;
    display: inline-block;
    padding: 64px;
  }
  .window {
    background: #141619;
    border-radius: 14px;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 40px 80px -20px rgba(0, 0, 0, 0.8), 0 0 120px rgba(15, 143, 232, 0.12);
    overflow: hidden;
    width: 1280px;
  }
  .bar {
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    position: relative;
  }
  .dot { border-radius: 50%; height: 12px; width: 12px; }
  .url {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.55);
    font: 13px/24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    left: 50%;
    padding: 0 16px;
    position: absolute;
    transform: translateX(-50%);
  }
  img { display: block; width: 1280px; }
</style>
<div class="stage">
  <div class="window">
    <div class="bar">
      <span class="dot" style="background:#ff5f57"></span>
      <span class="dot" style="background:#febc2e"></span>
      <span class="dot" style="background:#28c840"></span>
      <span class="url">${url.pathname}</span>
    </div>
    <img src="data:image/png;base64,${shot.toString('base64')}" />
  </div>
</div>`)
  await framePage.locator('img').evaluate((img: HTMLImageElement) => img.decode())
  await framePage.locator('.stage').screenshot({ path: path.join(outDir, `${name}.png`) })
  await framePage.close()
}

const open = async (page: Page, pathname: string) => {
  await page.goto(pathname)
  await page.addStyleTag({
    content: `nextjs-portal, nav *:has(> a[href^="/admin/collections/${collection}-"]) { display: none !important; }`,
  })
}

test.use({ colorScheme: 'dark', deviceScaleFactor: 2, viewport: { height: 660, width: 1280 } })

test.describe('screenshots', () => {
  const ids: Record<string, number | string> = {}

  test.beforeAll(async ({ request }) => {
    await fs.mkdir(outDir, { recursive: true })
    await request.delete(`/api/${collection}?where[id][exists]=true`)
    await fs.rm(path.join(root, 'tests/uploads', collection), { force: true, recursive: true })
    for (const file of files) {
      ids[file.name] = await upload(request, file)
    }
  })

  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: 'payload-theme', url: 'http://localhost:47391', value: 'dark' }])
  })

  test('list view popup', async ({ page }) => {
    await open(page, `/admin/collections/${collection}`)
    const row = page.locator('tr', { hasText: 'launch-banner-original.png' })
    await row.locator('.cell-mediaPreview button').click()
    await page.locator('.media-preview-popup img').evaluate((img: HTMLImageElement) => img.decode())
    await page.mouse.move(0, 0)
    await frame(page, 'list-popup')
  })

  test('code in the edit view', async ({ page }) => {
    await open(page, `/admin/collections/${collection}/${ids['posts.ts']}`)
    await expect(page.locator('.media-preview-viewer__code--ready .view-lines')).toContainText('CollectionConfig')
    await frame(page, 'edit-code')
  })

  test('csv in the fullscreen modal', async ({ page }) => {
    await open(page, `/admin/collections/${collection}/${ids['products.csv']}`)
    await page.locator('.media-preview-file__fullscreen').click()
    await expect(page.locator('.media-preview-modal .media-preview-viewer__table')).toBeVisible()
    await frame(page, 'csv-modal')
  })

  test('download card', async ({ page }) => {
    await open(page, `/admin/collections/${collection}/${ids['brand-assets.zip']}`)
    await expect(page.locator('.media-preview-file .media-preview-card')).toBeVisible()
    await frame(page, 'download-card')
  })
})
