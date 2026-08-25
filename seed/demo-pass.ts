// Full demo run-through: drives the real UI (including a live concierge chat) and screenshots each beat.
// Usage: npx tsx seed/demo-pass.ts [outdir]
import { chromium, devices } from 'playwright-core'
import path from 'node:path'

const OUT = process.argv[2] ?? '/tmp/cubby-demo'
const BASE = 'http://localhost:5173'
const shot = (name: string) => path.join(OUT, `${name}.png`)

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

// Beat 1 — parent search with filters
await page.goto(BASE)
await page.waitForTimeout(2500)
await page.selectOption('select >> nth=0', 'mission')
await page.getByTitle('Outdoor play').click()
await page.waitForTimeout(1500)
await page.screenshot({ path: shot('1-search-filtered') })

// Beat 2 — provider detail
await page.goto(BASE + '/#/p/1')
await page.waitForTimeout(3000)
await page.screenshot({ path: shot('2-detail') })

// Beat 3 — concierge live chat (real Bedrock + tools)
await page.getByRole('button', { name: /Ask the concierge/ }).click()
await page.waitForTimeout(400)
await page.getByPlaceholder('What kind of care do you need?').fill(
  'Find a Saturday sitter near the Mission for my 2-year-old who loves art',
)
await page.keyboard.press('Enter')
await page.waitForTimeout(20000) // let the tool loop finish
await page.screenshot({ path: shot('3-concierge') })

// Beat 4 — register wizard
await page.goto(BASE + '/#/register')
await page.waitForTimeout(800)
await page.screenshot({ path: shot('4-register') })

await page.close()

// Beat 5 — iPhone detail re-check after header fix
const iphone = await browser.newPage({ ...devices['iPhone 14'] })
await iphone.goto(BASE + '/#/p/1')
await iphone.waitForTimeout(3000)
await iphone.screenshot({ path: shot('5-iphone-detail') })
await iphone.close()

await browser.close()
console.log('demo pass written to', OUT)
