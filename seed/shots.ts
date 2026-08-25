// Demo-pass helper: renders the PWA icon and captures desktop + iPhone screenshots.
// Usage: npx tsx seed/shots.ts [outdir]
import { chromium, devices } from 'playwright-core'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = process.argv[2] ?? '/tmp/cubby-shots'
const BASE = 'http://localhost:5173'

const browser = await chromium.launch({ channel: 'chrome' })

// 1. PWA icon at exact size
const iconPage = await browser.newPage({ viewport: { width: 512, height: 512 } })
await iconPage.goto('file://' + path.join(ROOT, 'web/public/icon.html'))
await iconPage.screenshot({ path: path.join(ROOT, 'web/public/icon-512.png') })
await iconPage.close()

// 2. Desktop shots
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const shots: Array<[string, string, number]> = [
  ['/', 'desktop-search', 2500],
  ['/#/p/1', 'desktop-detail', 3500],
  ['/#/register', 'desktop-register', 1500],
]
for (const [route, name, wait] of shots) {
  await desktop.goto(BASE + route)
  await desktop.waitForTimeout(wait)
  await desktop.screenshot({ path: path.join(OUT, `${name}.png`) })
}
await desktop.close()

// 3. iPhone shots
const iphone = await browser.newPage({ ...devices['iPhone 14'] })
for (const [route, name, wait] of [
  ['/', 'iphone-search', 2500],
  ['/#/p/1', 'iphone-detail', 3500],
] as Array<[string, string, number]>) {
  await iphone.goto(BASE + route)
  await iphone.waitForTimeout(wait)
  await iphone.screenshot({ path: path.join(OUT, `${name}.png`) })
}
await iphone.close()

await browser.close()
console.log('shots written to', OUT)
