// Element screenshots of the trust-check swarm panel: mid-run (parallel) and final report.
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } })
await page.goto('http://localhost:5173/#/p/1')
await page.waitForTimeout(3000)
const panel = page.locator('section', { hasText: 'Trust check' }).last()
await panel.scrollIntoViewIfNeeded()
await page.getByRole('button', { name: 'Run the swarm' }).click()
await page.waitForTimeout(4500)
await panel.screenshot({ path: '/tmp/swarm-running.png' })
await page.waitForSelector('text=Trust report:', { timeout: 200000 })
await page.waitForTimeout(600)
await panel.screenshot({ path: '/tmp/swarm-done.png' })
await browser.close()
console.log('done')
