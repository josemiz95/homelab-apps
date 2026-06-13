// Repro: saving with one of weight/reps empty.
const puppeteer = require('puppeteer-core')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  const posts = []
  page.on('requestfinished', async (req) => {
    if (req.url().includes('/api/sessions') && req.method() === 'POST') {
      const body = await req.response().json().catch(() => null)
      posts.push({ status: req.response().status(), weight: body?.weight, reps: body?.reps, variantId: body?.variantId })
    }
  })

  // Push day: clear the reps field of the first card, keep weight
  await page.goto('http://localhost:3333/routine/1', { waitUntil: 'networkidle0' })
  await sleep(400)
  const repsInput = await page.$('input[placeholder="reps"]')
  await repsInput.click({ clickCount: 3 })
  await page.keyboard.press('Backspace')
  await sleep(1500)
  console.log('A) cleared reps (weight 80 kept):', JSON.stringify(posts))

  // Pull day: Dominadas (reps-only exercise) — type reps with weight empty
  posts.length = 0
  const days = await page.evaluate(() => fetch('/api/days').then((r) => r.json()))
  const pull = days.find((d) => d.name === 'Pull')
  await page.goto(`http://localhost:3333/routine/${pull.id}`, { waitUntil: 'networkidle0' })
  await sleep(400)
  const weights = await page.$$eval('input[placeholder="kg"]', (els) => els.map((e) => e.value))
  const reps = await page.$$eval('input[placeholder="reps"]', (els) => els.map((e) => e.value))
  console.log('B) Pull initial: weights=', JSON.stringify(weights), 'reps=', JSON.stringify(reps))
  const repsInputs = await page.$$('input[placeholder="reps"]')
  await repsInputs[0].click({ clickCount: 3 })
  await page.keyboard.type('15', { delay: 30 })
  await sleep(1500)
  console.log('B) typed 15 reps (weight empty):', JSON.stringify(posts))

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
