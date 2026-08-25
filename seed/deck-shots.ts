// Screenshot key slides of the hackathon deck for visual review.
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto('file:///Users/sneb/sa-assist/decks/cubbycare-hackathon/index.html')
await page.waitForTimeout(2000)
for (const [slide, name] of [[1, '01-cover'], [4, '04-ladder'], [10, '10-arch'], [14, '14-recap']] as Array<[number, string]>) {
  await page.keyboard.press('Home')
  for (let i = 1; i < slide; i++) await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `/tmp/deck-${name}.png` })
}
await browser.close()
console.log('done')
