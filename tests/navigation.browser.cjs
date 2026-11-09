const fs = require('fs'), path = require('path'), assert = require('node:assert/strict'), { spawn } = require('child_process'), puppeteer = require('puppeteer-core'), ts = require('typescript');
require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { defaultExperience } = require('../src/config/pwaExperience.ts');
const root = path.resolve(__dirname, '..'), port = 5231, origin = `http://127.0.0.1:${port}`, api = 'https://navigation-api.example.test', out = '/tmp/faith-navigation-20261109';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser, server; const errors = [], results = [];
const branding = { organization_id: 'org-navigation', pwa_slug: 'navegacao', church_name: 'Comunidade Navegação', status: 'ACTIVE', logo_icon_url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Cpath d="M8 16h16M16 8v16" stroke="white"/%3E%3C/svg%3E' };
const config = defaultExperience(branding);
for (const key of ['bible', 'prayers', 'events', 'volunteers']) config.copy[`${key}.title`] = { bible: 'Bíblia Sagrada', prayers: 'Mural de Oração', events: 'Eventos & Cursos', volunteers: 'Escalas & Voluntariado' }[key];
branding.pwa_experience = { enabled: true, customized: true, config };
async function clickText(page, selector, text) {
  const clicked = await page.$$eval(selector, (elements, text) => { const el = elements.find(e => e.getClientRects().length && e.textContent.includes(text)); el?.click(); return !!el; }, text);
  assert(clicked, `Missing visible ${selector}: ${text}`);
}
const visibleBacks = page => page.$$eval('button', buttons => buttons.filter(b => b.getClientRects().length && (/Voltar/.test(b.textContent) || b.textContent.trim() === '←')).length);
async function home(page) {
  await clickText(page, 'nav button', 'Início');
  await page.waitForFunction(() => ![...document.querySelectorAll('header button')].some(b => b.textContent.includes('Voltar')) && window.scrollY === 0);
  assert.equal(await visibleBacks(page), 0);
  const params = new URL(page.url()).searchParams; assert.equal(params.get('tab'), 'home'); assert.equal(params.get('view'), null); assert.equal(params.get('live'), null);
}
async function prepare(page) {
  await page.setViewport({ width: 390, height: 844 }); page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(() => { sessionStorage.setItem('faithhub_guest_explored', 'true'); window.navScrollCalls = []; const scroll = window.scrollTo.bind(window); window.scrollTo = (...args) => { window.navScrollCalls.push({ options: args[0], header: document.querySelector('header')?.innerText }); return scroll(...args); }; });
  await page.setRequestInterception(true);
  page.on('request', async req => {
    const u = new URL(req.url());
    if (u.origin === origin) {
      if (u.pathname.startsWith('/bible/')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify([{ name: 'Gênesis', abbrev: 'gn', chapters: [['No princípio criou Deus os céus e a terra.']] }]) });
      return req.continue();
    }
    if (u.origin !== api) return req.abort();
    if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
    let data = [], status = 200;
    if (req.method() !== 'GET') data = {};
    else if (u.pathname === '/church-settings') { data = branding; if (u.searchParams.has('format')) status = 503; }
    else if (u.pathname === '/pwa-experience/published') data = branding.pwa_experience;
    else if (u.pathname === '/feature-flags') data = { flags: { 'pwa.v2_experience': true, 'system.saas_pwa_customization': true, 'bible.module_enabled': true, 'prayers.module_enabled': true, 'events.module_enabled': true, 'volunteers.module_enabled': true } };
    else if (u.pathname === '/campuses') data = { data: [{ id: 'campus_sede', name: 'Unidade de teste', organization_id: branding.organization_id }] };
    else if (u.pathname === '/members/me') data = { id: 'test-member', name: 'Membro de teste', role: 'MEMBER', status: 'ACTIVE', organization_id: branding.organization_id, campus_id: 'campus_sede', created_at: '2024-01-01' };
    else if (u.pathname.includes('broadcast') || u.pathname.includes('/today')) data = null;
    else if (u.pathname.includes('/swaps')) data = { incoming: [], outgoing: [] };
    return req.respond({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) });
  });
}
(async () => {
  fs.mkdirSync(out, { recursive: true }); fs.rmSync(`${out}/browser-results.json`, { force: true });
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, env: { ...process.env, VITE_API_URL: api }, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin)).ok) break; } catch {} await delay(100); }
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  for (const version of [1, 2]) for (const theme of ['light', 'dark']) for (const member of [true, false]) {
    const page = await browser.newPage(); await prepare(page);
    if (theme === 'light') await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(`${origin}/navegacao/?v=${version}&theme=${theme}&tab=home${member ? '&demo=true' : ''}`);
    await page.waitForFunction(() => !document.getElementById('initial-splash'));
    const cases = [['Bíblia Sagrada', 'Bíblia Sagrada'], ['Mural de Oração', 'Mural de Oração'], ['Eventos & Cursos', 'Eventos & Cursos']];
    if (version === 2) cases.push(['Escalas & Servir', 'Escalas & Voluntariado']);
    for (const [shortcut, title] of cases) {
      await clickText(page, 'main button', shortcut);
      await page.waitForFunction(title => document.querySelector('header')?.textContent.includes(title), {}, title);
      assert.equal(await visibleBacks(page), 1, `one back: ${version}/${theme}/${member}/${title}`);
      const contrast = await page.$eval('header', (header, title) => {
        const text = [...header.querySelectorAll('span')].find(el => el.textContent.trim() === title);
        const luminance = color => (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        const layers = []; for (let el = header; el; el = el.parentElement) layers.unshift((getComputedStyle(el).backgroundColor.match(/[\d.]+/g) || []).map(Number));
        let rgb = [255, 255, 255]; for (const layer of layers) { const alpha = layer.length === 4 ? layer[3] : 1; rgb = rgb.map((value, i) => (layer[i] || 0) * alpha + value * (1 - alpha)); }
        const foreground = luminance(getComputedStyle(text).color), background = luminance(`rgb(${rgb.join(',')})`);
        return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
      }, title);
      assert(contrast >= 4.5, `top bar title contrast: ${version}/${theme}/${title}/${contrast}`);
      const headings = await page.$$eval('main h1, main h2', nodes => nodes.filter(n => n.getClientRects().length).map(n => n.textContent.trim()));
      assert(!headings.includes(title), `module title must be owned by the top bar: ${title}`);
      if (member && title === 'Mural de Oração') assert(await page.$$eval('button', bs => bs.some(b => b.textContent.includes('Pedir Oração'))));
      if (member && title === 'Eventos & Cursos') {
        assert(await page.$$eval('button', bs => bs.some(b => b.textContent.includes('Portaria'))));
        await clickText(page, 'main button', 'Meus Ingressos');
        assert((await page.$eval('main', e => e.innerText)).includes('Meus Passaportes & Carteira'));
      }
      if (member && title === 'Bíblia Sagrada') assert(await page.$('main select'), 'Bible version selector preserved');
      await delay(300);
      if (member && title === 'Eventos & Cursos') await page.screenshot({ path: `${out}/events-v${version}-${theme}.png` });
      if (member && title === 'Escalas & Voluntariado') await page.screenshot({ path: `${out}/volunteers-v${version}-${theme}.png` });
      if (title === 'Bíblia Sagrada') {
        await clickText(page, 'header button', 'Voltar');
        await page.waitForFunction(() => ![...document.querySelectorAll('header button')].some(b => b.textContent.includes('Voltar')));
        assert.equal(await visibleBacks(page), 0);
        await clickText(page, 'main button', shortcut);
        await page.waitForFunction(() => document.querySelector('header')?.textContent.includes('Bíblia Sagrada'));
      }
      await home(page);
      results.push({ version, theme, member, title, singleBack: true, homeFromSubview: true });
    }
    await page.evaluate(() => window.scrollTo({ top: 650, behavior: 'instant' })); await page.waitForFunction(() => window.scrollY > 100);
    await home(page); assert.equal(await page.evaluate(() => window.scrollY), 0, 'repeated Home returns to top');
    await clickText(page, 'nav button', 'Palavra'); await home(page);
    const scrolls = await page.evaluate(() => window.navScrollCalls);
    assert(scrolls.some(call => call.header?.includes('Comunidade Navegação') && call.options?.top === 0 && call.options?.behavior === (theme === 'light' ? 'instant' : 'smooth')), 'scroll runs after Home has committed and respects reduced motion');
    console.log('PASS navigation', version, theme, member ? 'member' : 'guest'); await page.close();
  }
  const deepLink = await browser.newPage(); await prepare(deepLink);
  await deepLink.goto(`${origin}/navegacao/?v=2&theme=dark&demo=true&tab=profile&view=bible`);
  await deepLink.waitForFunction(() => !document.getElementById('initial-splash') && document.querySelector('header')?.textContent.includes('Bíblia Sagrada'));
  await home(deepLink); await deepLink.reload();
  await deepLink.waitForFunction(() => !document.getElementById('initial-splash') && document.querySelector('header')?.textContent.includes('Comunidade Navegação'));
  assert.equal(await visibleBacks(deepLink), 0); await deepLink.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${out}/browser-results.json`, JSON.stringify({ results, repeatedHomeReturnsToTop: true, deepLinkClearedOnHomeAndReload: true, globalBackWorks: true, homeFromOtherTab: true, reducedMotionRespected: true, moduleControlsPreserved: true, pageErrors: errors }, null, 2));
})().catch(async e => { console.error(e); console.error(errors); if (browser) for (const p of await browser.pages()) console.error((await p.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 1600)); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) server.kill(); });
