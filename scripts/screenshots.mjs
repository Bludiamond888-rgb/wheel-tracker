// WebKit iPhone screenshots using the clearly-labelled SAMPLE data toggle.
import { webkit, devices } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from './serve.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { server, url } = await serve(path.join(root, 'dist'))
const out = (f) => path.join(root, 'screens', f)
const b = await webkit.launch()
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York' })
const p = await ctx.newPage()
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message))
await p.goto(url + '#/more'); await p.click('[data-testid=sample-toggle]'); await p.waitForSelector('.sample-banner')
await p.goto(url + '#/'); await p.waitForSelector('[data-testid=carousel]'); await p.waitForTimeout(400)
await p.screenshot({ path: out('1-home.png') })
await p.addStyleTag({ content: '.tabs{position:static!important}' }); await p.screenshot({ path: out('1-home-full.png'), fullPage: true }); await p.reload(); await p.waitForSelector('[data-testid=carousel]')
await p.click('.wcard:has-text("AAPL")'); await p.waitForSelector('.next-card'); await p.waitForTimeout(400)
await p.screenshot({ path: out('2-wheel-detail.png') })
await p.click('.seg >> nth=2'); await p.waitForTimeout(300); await p.addStyleTag({ content: '.tabs{position:static!important}' }); await p.screenshot({ path: out('2b-wheel-stage-tapped.png'), fullPage: true })
await p.goto(url + '#/'); await p.click('.wcard:has-text("AMD")'); await p.click('[data-testid=add-trade]'); await p.click('.chip:has-text("Roll")'); await p.fill('input[placeholder="0.00"] >> nth=1', '1.25'); await p.waitForTimeout(400); await p.screenshot({ path: out('3-add-trade.png') }); await p.click('button:has-text("Cancel")')
await p.goto(url + '#/'); await p.click('.wcard:has-text("AAPL")')
await p.click('[data-testid=add-trade]'); await p.waitForSelector('[data-testid=trade-form]')
// log "called away" to show the spin: capture mid-animation
await p.click('.chip:has-text("Called away")'); await p.click('button:has-text("Save trade")'); await p.waitForTimeout(500)
await p.screenshot({ path: out('3b-spin-mid.png') }); await p.waitForTimeout(1600); await p.screenshot({ path: out('3c-after-spin.png') })
await p.goto(url + '#/stats'); await p.waitForTimeout(400); await p.screenshot({ path: out('4-stats.png') })
await b.close(); server.close(); console.log('done')
