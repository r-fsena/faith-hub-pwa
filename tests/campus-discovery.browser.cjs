const fs = require('fs'), path = require('path'), assert = require('node:assert/strict'), { spawn } = require('child_process'), puppeteer = require('puppeteer-core');
const root = path.resolve(__dirname, '..'), port = 5223, origin = `http://127.0.0.1:${port}`, api = 'https://campus-api.example.test', out = '/tmp/faith-campus-proximity';
const files = ['.campus-test.html', '.campus-test.tsx'].map(f => path.join(root, f));
let server, browser; const errors = [], requests = [], held = []; const delay = ms => new Promise(r => setTimeout(r, ms));
const units = org => [
  { id: 'home', name: 'Minha unidade distante', latitude: 40, longitude: -74 },
  { id: 'far', name: 'A distante', latitude: -30, longitude: -50, is_headquarters: 1 },
  { id: 'near', name: 'Z próxima', latitude: -27.6, longitude: -48.6 },
  { id: 'missing', name: 'Sem ponto', latitude: null, longitude: null }
].map(c => ({ ...c, organization_id: org, address: 'Endereço público da unidade' }));
const ids = page => page.$$eval('[data-campus-id]', els => els.map(e => e.dataset.campusId));
async function respond(req, data, status = 200) { await req.respond({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,authorization,x-organization-id', 'Access-Control-Allow-Methods': 'GET,OPTIONS' }, body: JSON.stringify({ data }) }); }
(async () => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(files[0], '<html><body style="margin:0"><div id="root"></div><script type="module" src="/.campus-test.tsx"></script></body></html>');
  fs.writeFileSync(files[1], `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{CampusPicker}from'/src/components/CampusPicker';import{AuthContext}from'/src/context/AuthContext';import{FeatureFlagContext}from'/src/context/FeatureFlagContext';
  function Test(){const[state,set]=useState({org:'org-a',authenticated:true,selected:'near',enabled:true,open:true});window.testCampus=(patch)=>set(s=>({...s,...patch}));return <main style={{maxWidth:420,padding:20,background:'var(--bg-card)',color:'var(--text-main)',fontFamily:'Arial',minHeight:'100vh'}}><h2>Escolha sua unidade</h2><AuthContext.Provider value={{user:state.authenticated?{userId:'same-user',email:'fixture@example.test'}:null,isAuthenticated:state.authenticated,isLoading:false} as any}><FeatureFlagContext.Provider value={{isFeatureEnabled:()=>state.enabled}as any}><CampusPicker campuses={(${units.toString()})(state.org)} organizationId={state.org} selectedId={state.selected} isOpen={state.open} onSelect={id=>set(s=>({...s,selected:id}))}/></FeatureFlagContext.Provider></AuthContext.Provider></main>}document.documentElement.style.cssText='--bg-card:#ffffff;--text-main:#121212;--text-secondary:#444;--panel-border:#ccc;--accent-primary:#000;--accent-primary-light:#eee';createRoot(document.getElementById('root')!).render(<Test/>);`);
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, env: { ...process.env, VITE_API_URL: api }, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin)).ok) break; } catch {} await delay(100); }
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844 }); page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(() => { window.gpsMode = 'ready'; window.gpsRequests = 0; Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition(ok, fail) { window.gpsRequests++; setTimeout(() => window.gpsMode === 'denied' ? fail({ code: 1 }) : window.gpsMode === 'error' ? fail({ code: 2 }) : ok({ coords: { latitude: -27.6, longitude: -48.6 } }), 30); } } }); });
  let hold = false, foreign = false, failProfile = false;
  await page.setRequestInterception(true); page.on('request', async req => {
    if (!req.url().startsWith(api)) return req.continue();
    if (req.method() === 'OPTIONS') return respond(req, {});
    const url = new URL(req.url()), org = url.searchParams.get('organization_id');
    requests.push({ url: req.url(), org, headerOrg: req.headers()['x-organization-id'], method: req.method(), body: req.postData() });
    if (hold) { held.push(req); return; }
    await respond(req, { id: 'same-user', organization_id: foreign ? 'org-other' : org, campus_id: 'home' }, failProfile ? 503 : 200);
  });
  await page.goto(`${origin}/.campus-test.html`);
  await page.waitForFunction(() => document.body.innerText.includes('Minha unidade') && document.body.innerText.includes('de você'));
  await page.waitForFunction(() => document.querySelector('[data-campus-id]')?.getAttribute('data-campus-id') === 'home');
  assert.deepEqual(await ids(page), ['home', 'near', 'far', 'missing']);
  assert.equal(await page.$eval('[data-campus-id="near"]', e => e.getAttribute('aria-pressed')), 'true');
  await page.click('[data-campus-id="far"]');
  assert.equal(await page.$eval('[data-campus-id="far"]', e => e.getAttribute('aria-pressed')), 'true');
  assert.equal((await ids(page))[0], 'home', 'visiting selection must not redefine membership');
  assert.equal(await page.evaluate(() => window.gpsRequests), 1);
  await page.evaluate(() => window.testCampus({ open: false })); await delay(30);
  await page.evaluate(() => window.testCampus({ open: true })); await delay(100);
  assert.equal(await page.evaluate(() => window.gpsRequests), 1, 'recent position is reused without another GPS request');
  await page.evaluate(() => { window.testCampus({ open: false }); const now = Date.now; Date.now = () => now() + 180000; }); await delay(30);
  await page.evaluate(() => window.testCampus({ open: true }));
  await page.waitForFunction(() => window.gpsRequests === 2);
  await page.waitForFunction(() => document.querySelector('[data-campus-id]')?.getAttribute('data-campus-id') === 'home');
  assert((await page.$eval('[data-campus-id="missing"]', e => e.innerText)).includes('não cadastrada'));
  await page.screenshot({ path: `${out}/campus-picker-light.png` });
  await page.evaluate(() => document.documentElement.style.cssText = '--bg-card:#000;--text-main:#fff;--text-secondary:#ddd;--panel-border:#777;--accent-primary:#fff;--accent-primary-light:#222');
  await page.screenshot({ path: `${out}/campus-picker-dark.png` });
  hold = true; await page.evaluate(() => window.testCampus({ org: 'org-held' }));
  for (let i = 0; i < 100 && !held.length; i++) await delay(20); assert(held.length);
  hold = false; foreign = true; await page.evaluate(() => window.testCampus({ org: 'org-b' }));
  await page.waitForFunction(() => document.querySelector('[data-campus-id]')?.getAttribute('data-campus-id') === 'near');
  for (const req of held.splice(0)) await respond(req, { organization_id: 'org-held', campus_id: 'home' });
  await delay(100); assert.equal((await ids(page))[0], 'near');
  assert(!(await page.$eval('main', e => e.innerText)).includes('Minha unidade\n'));
  foreign = false; await page.evaluate(() => { window.gpsMode = 'denied'; window.testCampus({ org: 'org-denied' }); });
  await page.waitForFunction(() => document.body.innerText.includes('não autorizada'));
  await page.waitForFunction(() => document.querySelector('[data-campus-id]')?.getAttribute('data-campus-id') === 'home');
  assert.deepEqual(await ids(page), ['home', 'far', 'missing', 'near']);
  await page.evaluate(() => { window.gpsMode = 'error'; window.testCampus({ org: 'org-error' }); });
  await page.waitForFunction(() => document.body.innerText.includes('Não foi possível obter'));
  await page.evaluate(() => { window.gpsMode = 'ready'; });
  await page.$$eval('button', bs => bs.find(b => b.textContent.includes('Usar minha localização')).click());
  await page.waitForFunction(() => document.body.innerText.includes('em linha reta'));
  assert.deepEqual(await ids(page), ['home', 'near', 'far', 'missing']);
  failProfile = true; await page.evaluate(() => window.testCampus({ org: 'org-retry' }));
  await page.waitForFunction(() => document.body.innerText.includes('Não foi possível consultar'));
  failProfile = false; await page.$$eval('button', bs => bs.find(b => b.textContent.includes('Tentar novamente')).click());
  await page.waitForFunction(() => document.querySelector('[data-campus-id]')?.getAttribute('data-campus-id') === 'home');
  await page.evaluate(() => window.testCampus({ authenticated: false }));
  await page.waitForFunction(() => document.querySelector('[data-campus-id]')?.getAttribute('data-campus-id') === 'near');
  const requestCount = requests.length;
  await page.evaluate(() => window.testCampus({ enabled: false })); await delay(100);
  assert(!(await page.$eval('main', e => e.innerText)).includes('de você'));
  assert.equal(requests.length, requestCount);
  assert(requests.every(r => r.org && r.headerOrg === r.org && !/latitude|longitude/.test(r.url) && !r.body)); assert.deepEqual(errors, []);
  fs.writeFileSync(`${out}/browser-results.json`, JSON.stringify({ passed: true, membershipFirst: true, distanceOrder: true, foreignMembershipRejected: true, staleResponseDiscarded: true, selectedUnitNotMembership: true, deniedAndFailedGeolocation: true, profileRetry: true, anonymousProximity: true, coordinatesNotTransmitted: true, refreshesOldLocationOnReopen: true, featureFlag: true, requests }, null, 2));
  console.log('PASS campus discovery: home first, distance, tenant isolation, stale response, GPS denial/retry, anonymous and flag');
})().catch(async e => { console.error(e); console.error(errors); console.error(requests); if(browser)for(const p of await browser.pages())console.error((await p.evaluate(()=>document.body.innerText).catch(()=>'' )).slice(0,1600)); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) server.kill(); for (const file of files) fs.rmSync(file, { force: true }); });
