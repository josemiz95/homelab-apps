// Repro: switch user on the workout screen, inspect weight inputs and saving.
const puppeteer = require('puppeteer-core')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function readWeights(page) {
  return page.$$eval('input[placeholder="kg"]', (els) => els.map((e) => e.value))
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' })
  const page = await browser.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('PAGE ERROR:', m.text())
  })
  const posts = []
  page.on('requestfinished', async (req) => {
    if (req.url().includes('/api/sessions') && req.method() === 'POST') {
      const res = req.response()
      const body = await res.json().catch(() => null)
      posts.push({ status: res.status(), body })
    }
  })

  await page.goto('http://localhost:3333/routine/1', { waitUntil: 'networkidle0' })
  await sleep(500)
  console.log('Josemi weights:', await readWeights(page))

  // Click "Alba"
  const buttons = await page.$$('button')
  for (const b of buttons) {
    const t = await b.evaluate((el) => el.textContent)
    if (t.trim() === 'Alba') { await b.click(); break }
  }
  await sleep(1500)
  console.log('Alba weights:', await readWeights(page))

  // Type a weight as Alba in the first card
  const input = await page.$('input[placeholder="kg"]')
  await input.click({ clickCount: 3 })
  await input.type('41', { delay: 50 })
  await sleep(1800) // wait past debounce + request
  console.log('POSTs so far:', JSON.stringify(posts))

  // Switch back to Josemi
  const buttons2 = await page.$$('button')
  for (const b of buttons2) {
    const t = await b.evaluate((el) => el.textContent)
    if (t.trim() === 'Josemi') { await b.click(); break }
  }
  await sleep(1500)
  console.log('Josemi weights after switch back:', await readWeights(page))

  // Verify in DB who owns the 41kg save
  const check = await page.evaluate(async () => {
    const r1 = await fetch('/api/sessions?dayId=1&userId=1').then((r) => r.json())
    const r2 = await fetch('/api/sessions?dayId=1&userId=2').then((r) => r.json())
    return { josemi_v1: r1.variantSessions['1'][0], alba_v1: r2.variantSessions['1'][0] }
  })
  console.log('DB check:', JSON.stringify(check))

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
