import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

// Auto-increment: find next available N
const existing = fs.readdirSync(screenshotDir)
  .filter(f => f.startsWith('screenshot-') && f.endsWith('.png'))
  .map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] ?? '0'))
  .filter(n => !isNaN(n));

const next = existing.length ? Math.max(...existing) + 1 : 1;
const filename = label
  ? `screenshot-${next}-${label}.png`
  : `screenshot-${next}.png`;

const outPath = path.join(screenshotDir, filename);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// Let initial animations settle
await new Promise(r => setTimeout(r, 1500));

// Scroll through the full page to trigger IntersectionObservers
const pageHeight = await page.evaluate(() => document.body.scrollHeight);
const viewH = 900;
for (let y = 0; y < pageHeight; y += viewH * 0.6) {
  await page.evaluate(yPos => window.scrollTo(0, yPos), y);
  await new Promise(r => setTimeout(r, 200));
}
// Scroll back to top and wait for any final transitions
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise(r => setTimeout(r, 800));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`✓ Screenshot saved: ${outPath}`);
