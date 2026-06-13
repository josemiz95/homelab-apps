// Full repro: variant switching + user switching + typing, capturing JS errors.
const puppeteer = require('puppeteer-core')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickButtonByText(page, text) {
  const buttons = await page.$$('button')
  for (const b of buttons) {
    const t = (await b.evaluate((el) => el.textContent)).trim()
    if (t === text) { await b.click(); return true }
  }
  return false
}

async function snapshot(page, label) {
  const weights = await page.$$eval('input[placeholder="kg"]', (els) => els.map((e) => e.value))
  const reps = await page.$$eval('input[placeholder="reps"]', (els) => els.map((e) => e.value))
  const activePills = await page.$$eval('button', (els) =>
    els.filter((e) => e.className.includes('e8ff47')).map((e) => e.textContent.trim())
  )
  console.log(`${label}: weights=${JSON.stringify(weights)} reps=${JSON.stringify(reps)} active=${JSON.stringify(activePills)}`)
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()) })
  const posts = []
  page.on('requestfinished', async (req) => {
    if (req.url().includes('/api/sessions') && req.method() === 'POST') {
      const body = await req.response().json().catch(() => null)
      posts.push(`${body?.weight}kg/v${body?.variantId}/u${body?.userId}`)
    }
  })
  page.on('requestfailed', (req) => console.log('REQ FAILED:', req.method(), req.url(), req.failure()?.errorText))

  await page.goto('http://localhost:3333/routine/1', { waitUntil: 'networkidle0' })
  await sleep(500)
  await snapshot(page, '1. initial (Josemi, Barra)')

  // Switch variant on first card: Barra -> Mancuernas
  await clickButtonByText(page, 'Mancuernas')
  await sleep(600)
  await snapshot(page, '2. after variant -> Mancuernas (expect 32.5)')

  // Switch back to Barra
  await clickButtonByText(page, 'Barra')
  await sleep(600)
  await snapshot(page, '3. back to Barra (expect 80)')

  // Switch user to Alba
  await clickButtonByText(page, 'Alba')
  await sleep(1500)
  await snapshot(page, '4. after switch to Alba (expect 37.5)')

  // Switch variant as Alba
  await clickButtonByText(page, 'Mancuernas')
  await sleep(600)
  await snapshot(page, '5. Alba + Mancuernas (expect empty)')

  // Back to Josemi
  await clickButtonByText(page, 'Josemi')
  await sleep(1500)
  await snapshot(page, '6. back to Josemi (expect 80)')

  // Type as Josemi then switch variant quickly
  const input = await page.$('input[placeholder="kg"]')
  await input.click({ clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.keyboard.type('82.5', { delay: 30 })
  await sleep(100)
  await clickButtonByText(page, 'Mancuernas')
  await sleep(1500)
  await snapshot(page, '7. typed 82.5 then -> Mancuernas')
  await clickButtonByText(page, 'Barra')
  await sleep(800)
  await snapshot(page, '8. back to Barra (expect 82.5 saved)')

  console.log('POSTs:', JSON.stringify(posts))
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
