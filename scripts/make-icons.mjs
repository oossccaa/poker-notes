// 由 public/icon.svg 產生 PWA 與 iOS 需要的 PNG icon：pnpm icons
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8')

// maskable / iOS：滿版底色、圖案縮小留安全區
const fullBleed = svg
  .replace('rx="112"', 'rx="0"')
  .replace(/(<rect[^>]*\/>)/, '$1<g transform="translate(256 256) scale(0.82) translate(-256 -256)">')
  .replace('</svg>', '</g></svg>')

const targets = [
  { file: 'pwa-192.png', size: 192, source: svg },
  { file: 'pwa-512.png', size: 512, source: svg },
  { file: 'maskable-512.png', size: 512, source: fullBleed },
  { file: 'apple-touch-icon.png', size: 180, source: fullBleed },
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const { file, size, source } of targets) {
  await page.setViewportSize({ width: size, height: size })
  const sized = source.replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`)
  await page.screenshot({ path: `public/${file}`, omitBackground: true })
  console.log(`public/${file}`)
}
await browser.close()
