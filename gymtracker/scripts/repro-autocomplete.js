// Repro: exercise autocomplete in /manage — filter while typing, pick suggestion,
// verify the exercise is created in the day WITH its variants copied.
const puppeteer = require('puppeteer-core')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickButtonByText(page, text) {
  const buttons = await page.$$('button')
  for (const b of buttons) {
    const t = (await b.evaluate((el) => el.textContent)).trim()
    if (t === text || t.startsWith(text)) { await b.click(); return true }
  }
  return false
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))

  await page.goto('http://localhost:3333/manage', { waitUntil: 'networkidle0' })
  await sleep(400)

  // Select "Pull" day, open add-exercise form
  await clickButtonByText(page, 'Pull')
  await sleep(300)
  await clickButtonByText(page, '+ Añadir ejercicio')
  await sleep(300)

  // Type "pre" -> expect dropdown with Press Banca / Press Inclinado / Prensa
  await page.keyboard.type('pre', { delay: 40 })
  await sleep(300)
  const options = await page.$$eval('ul.absolute li button', (els) =>
    els.map((e) => e.textContent.trim())
  )
  console.log('Dropdown after typing "pre":', JSON.stringify(options))

  // Narrow filter: "press b"
  await page.keyboard.type('ss b', { delay: 40 })
  await sleep(300)
  const options2 = await page.$$eval('ul.absolute li button', (els) => els.map((e) => e.textContent.trim()))
  console.log('Dropdown after "press b":', JSON.stringify(options2))

  // Pick the suggestion
  const opt = await page.$('ul.absolute li button')
  await opt.click()
  await sleep(800)

  // Verify via API: Pull now contains Press Banca with both variants
  const pull = await page.evaluate(async () => {
    const days = await fetch('/api/days').then((r) => r.json())
    const d = days.find((x) => x.name === 'Pull')
    return d.exercises.map((e) => `${e.name} [${e.variants.map((v) => v.name).join(', ')}]`)
  })
  console.log('Pull exercises now:', JSON.stringify(pull, null, 0))

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
