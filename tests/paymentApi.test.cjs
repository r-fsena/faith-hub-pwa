const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function loadApi(fetch) {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8').replaceAll('import.meta.env', '({ VITE_API_URL: "https://api.example" })');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: () => ({ fetchAuthSession: async () => ({ tokens: {} }) }), fetch, Headers,
    localStorage: { getItem: key => key === 'faithhub_pwa_active_campus_id' ? 'campus-a' : 'org-a' }, console, URLSearchParams });
  return exports;
}
const ticket = { event_id: 'event-a', attendee_name: 'Pessoa', attendee_whatsapp: '11999999999', payment_method: 'PIX' };
const order = { user_name: 'Pessoa', delivery_method: 'church', delivery_details: 'Balcão', payment_method: 'PIX', items_json: [{ id: 'product-a', name: 'Livro', qty: 1, price: 10 }], total_price: 10 };
test('PWA never fabricates an order or a paid admission after network or HTTP errors', async () => {
  for (const fetch of [async () => { throw new Error('offline'); }, async () => ({ ok: false, json: async () => ({ message: 'Recusado' }) })]) {
    const api = loadApi(fetch);
    await assert.rejects(api.checkoutTicket(ticket));
    await assert.rejects(api.createPdvOrder(order));
  }
});
test('PWA rejects incomplete responses and preserves pending status returned by the server', async () => {
  const invalid = loadApi(async () => ({ ok: true, json: async () => ({}) }));
  await assert.rejects(invalid.checkoutTicket(ticket)); await assert.rejects(invalid.createPdvOrder(order));
  let sent;
  const api = loadApi(async (_url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ ticket_id: 'real-ticket', qrcode_token: 'real-token', status: 'PENDING' }) }; });
  assert.equal((await api.checkoutTicket(ticket)).status, 'PENDING');
  assert.equal(sent.organization_id, 'org-a');
});
test('PWA checkout always sends the active organization and campus for stock reservation', async () => {
  let sent;
  const api = loadApi(async (_url, options) => {
    sent = JSON.parse(options.body);
    return { ok: true, json: async () => ({ id: 'order-a', payment_status: 'PENDING', total_price: 10 }) };
  });
  await api.createPdvOrder(order);
  assert.equal(sent.organization_id, 'org-a');
  assert.equal(sent.campus_id, 'campus-a');
});
