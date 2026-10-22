import { webkit, devices } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from './serve.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { server, url } = await serve(path.join(root, 'dist'))
const b = await webkit.launch(); let fail = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++ }
for (const [name, w, h] of [['se', 375, 667], ['14', 390, 844], ['promax', 430, 932]]) {
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: w, height: h } })
  const p = await ctx.newPage(); p.on('pageerror', (e) => ok(false, e.message))
  await p.goto(url + '#/more'); await p.click('[data-testid=sample-toggle]'); await p.waitForSelector('.sample-banner')
  await p.goto(url + '#/'); await p.waitForSelector('[data-testid=carousel]'); await p.waitForTimeout(400)
  const r = await p.evaluate(() => {
    const tabs = document.querySelector('.tabs').getBoundingClientRect().top
    const bottoms = [...document.querySelectorAll('main .top, main .summary, main .sec, .wcard, .wcard .wmeta, .wcard .next, main .note')].map((e) => e.getBoundingClientRect().bottom)
    const c = document.querySelector('.carousel'); c.scrollLeft = 300
    window.scrollTo(0, 500)
    return { sh: document.documentElement.scrollHeight, bsh: document.body.scrollHeight, ih: innerHeight, tabs, maxB: Math.max(...bottoms), sl: c.scrollLeft, sy: scrollY, cw: c.scrollWidth > c.clientWidth, wheel: document.querySelector('.wcard .wheel').getBoundingClientRect().width }
  })
  ok(r.sh <= r.ih && r.bsh <= r.ih && r.sy === 0, `${name}: no vertical scroll (sh ${r.sh}, ih ${r.ih}, scrollY ${r.sy})`)
  ok(r.cw && r.sl > 0, `${name}: carousel scrolls horizontally (scrollLeft ${r.sl})`)
  ok(r.maxB <= r.tabs + 0.5, `${name}: content bottom ${r.maxB.toFixed(0)} <= tab bar top ${r.tabs.toFixed(0)}; wheel ${r.wheel.toFixed(0)}px`)
  await p.evaluate(() => document.querySelector('.carousel').scrollLeft = 0); await p.waitForTimeout(300)
  await p.screenshot({ path: path.join(root, 'screens', `home-locked-${name}.png`) })
  for (const t of ['#/stats', '#/more']) {
    await p.goto(url + t); await p.waitForTimeout(300)
    const s = await p.evaluate(() => { scrollTo(0, 400); return { tall: document.documentElement.scrollHeight > innerHeight, y: scrollY, lock: document.documentElement.classList.contains('home-lock'), ov: getComputedStyle(document.body).overflow } })
    ok(!s.lock && s.ov !== 'hidden' && (s.tall ? s.y > 0 : true), `${name}: ${t} unlocked, ${s.tall ? 'scrolls (scrollY ' + s.y + ')' : 'content fits (nothing to scroll)'}`)
  }
  await p.goto(url + '#/'); await p.waitForSelector('.carousel'); await p.click('.wcard >> nth=0'); await p.waitForSelector('.next-card')
  ok(await p.evaluate(() => { scrollTo(0, 400); return scrollY > 0 }), `${name}: wheel detail scrolls after tap from home`)
  await p.click('[data-testid=add-trade]'); await p.waitForSelector('.sheet')
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.sheet')).overflowY === 'auto'), `${name}: add-trade sheet scrollable`)
  await ctx.close()
}
await b.close(); server.close(); console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0)
