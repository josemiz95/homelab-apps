// Repro: edit a weight and switch user BEFORE the debounce fires (A),
// and switch user while the save request is in flight (B).
const puppeteer = require('puppeteer-core')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickUser(page, name) {
  const buttons = await page.$$('button')
  for (const b of buttons) {
    const t = await b.evaluate((el) => el.textContent)
    if (t.trim() === name) { await b.click(); return }
  }
}

async function setWeight(page, value) {
  const input = await page.$('input[placeholder="kg"]')
  await input.evaluate((el) => { el.value = '' })
  await input.focus()
  await page.keyboard.type(value, { delay: 30 })
}

async function readWeights(page) {
  return page.$$eval('input[placeholder="kg"]', (els) => els.map((e) => e.value))
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' })
  const page = await browser.newPage()
  const posts = []
  page.on('requestfinished', async (req) => {
    if (req.url().includes('/api/sessions') && req.method() === 'POST') {
      const body = await req.response().json().catch(() => null)
      posts.push(body)
    }
  })

  // --- Scenario A: edit as Josemi, switch to Alba within debounce window ---
  await page.goto('http://localhost:3333/routine/1', { waitUntil: 'networkidle0' })
  await sleep(400)
  await setWeight(page, '99')        // Josemi press banca = 99
  await sleep(200)                   // < 800ms debounce
  await clickUser(page, 'Alba')
  await sleep(2000)
  console.log('A) POSTs after quick switch:', JSON.stringify(posts))
  console.log('A) Alba weights:', await readWeights(page))
  await clickUser(page, 'Josemi')
  await sleep(1200)
  console.log('A) Josemi weights after switch back (typed 99):', await readWeights(page))

  // --- Scenario B: edit as Josemi, switch right as save fires (in flight) ---
  posts.length = 0
  await setWeight(page, '77')
  await sleep(810)                   // just past debounce: request likely in flight
  await clickUser(page, 'Alba')
  await sleep(2000)
  console.log('B) POSTs:', JSON.stringify(posts))
  console.log('B) Alba weights (should be 37.5-ish, NOT 77):', await readWeights(page))

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
