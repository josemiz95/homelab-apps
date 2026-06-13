// Repro A redo: clear reps via Ctrl+A + Backspace, keep weight -> must autosave.
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

  await page.goto('http://localhost:3333/routine/1', { waitUntil: 'networkidle0' })
  await sleep(400)
  const repsInput = await page.$('input[placeholder="reps"]')
  await repsInput.focus()
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control')
  await page.keyboard.press('Backspace')
  const val = await repsInput.evaluate((el) => el.value)
  console.log('reps input now:', JSON.stringify(val))
  await sleep(1600)
  console.log('POSTs (expect weight 80, reps null):', JSON.stringify(posts))
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
