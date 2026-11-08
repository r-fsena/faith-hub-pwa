// A monochrome interface must not desaturate content, including cross-document embeds.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const css = fs.readFileSync(path.join(__dirname, '../src/experience/experience.css'), 'utf8');
let browser;
(async () => {
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 320, deviceScaleFactor: 1 });
  for (const mode of ['light', 'dark']) {
    const bg = mode === 'light' ? '#ffffff' : '#000000';
    const text = mode === 'light' ? '#000000' : '#ffffff';
    const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path fill="#ff0000" d="M0 0h64v64H0z"/></svg>');
    await page.setContent(`<html data-pwa-experience="custom" data-pwa-color-mode="monochrome" data-theme="${mode}" style="--exp-background:${bg};--exp-text:${text};--exp-primary:${text};--exp-surface-muted:${bg};--exp-border:${text}"><body style="margin:0"><div style="display:flex;gap:16px"><img id="photo" width="64" height="64" src="${svg}"/><video id="video" muted playsinline width="64" height="64"></video><canvas id="canvas" width="64" height="64"></canvas><iframe id="embed" width="64" height="64" style="border:0" srcdoc="<body style='margin:0;background:rgb(0,0,255)'></body>"></iframe><img id="logo" data-brand-logo="true" width="64" height="64" src="${svg}"/><div class="experience-service-icon" style="width:64px;height:64px;background:red;color:red"><svg width="24" height="24" stroke="red"><path d="M0 0L24 24"/></svg></div></div></body></html>`);
    await page.addStyleTag({ content: css });
    await page.evaluate(async () => {
      await Promise.all([...document.images].map(i => i.decode()));
      const canvas = document.getElementById('canvas');
      canvas.getContext('2d').fillStyle = '#ff00ff';
      canvas.getContext('2d').fillRect(0, 0, 64, 64);
      const source = document.createElement('canvas'); source.width = source.height = 64;
      source.getContext('2d').fillStyle = '#00ff00'; source.getContext('2d').fillRect(0, 0, 64, 64);
      const video = document.getElementById('video');
      video.srcObject = source.captureStream(30);
      const frame = new Promise(resolve => video.requestVideoFrameCallback(resolve));
      await video.play();
      video.srcObject.getVideoTracks()[0].requestFrame();
      await Promise.race([frame, new Promise((_, reject) => setTimeout(() => reject(Error('Video frame timeout')), 8000))]);
    });
    await page.waitForFunction(() => document.getElementById('embed').contentDocument?.body?.style.backgroundColor === 'rgb(0, 0, 255)');
    const image = PNG.sync.read(Buffer.from(await page.screenshot()));
    for (const [id, expected] of [['photo', [255, 0, 0]], ['video', [0, 255, 0]], ['canvas', [255, 0, 255]], ['embed', [0, 0, 255]]]) {
      const point = await page.$eval('#' + id, el => { const r = el.getBoundingClientRect(); return { x: Math.floor(r.x + 32), y: Math.floor(r.y + 32) }; });
      const offset = (point.y * image.width + point.x) * 4;
      const pixel = [...image.data.subarray(offset, offset + 3)];
      assert(pixel.every((v, i) => Math.abs(v - expected[i]) <= 12), `${mode} ${id}: rendered ${pixel}, expected ${expected}`);
    }
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).filter), 'none');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), mode === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
    assert.equal(await page.$eval('.experience-service-icon', el => getComputedStyle(el).color), mode === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    assert.equal(await page.$eval('.experience-service-icon svg', el => getComputedStyle(el).stroke), mode === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    const logoFilter = await page.$eval('#logo', el => getComputedStyle(el).filter);
    assert(logoFilter.includes('contrast(20)'));
    assert.equal(logoFilter.includes('invert(1)'), mode === 'dark');
    await page.evaluate(() => document.getElementById('video').srcObject.getTracks().forEach(t => t.stop()));
    console.log(`PASS ${mode}: interface and logo themed; photo, actual video frames, canvas and iframe retain original RGB pixels`);
  }
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
