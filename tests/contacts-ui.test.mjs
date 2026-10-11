import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

const root = 'src/app/admin/(panel)/';
const contact = { id: 'c1', name: 'Ana', email: 'ana@example.test', subject: 'Ajuda', message: '<script>unsafe</script>', source: 'email', createdAt: '2026-10-01T12:00:00Z', orderRef: null };
const integration = { sendingConfigured: true, webhookConfigured: false, historyNotice: 'Apenas registos disponíveis.' };
const initial = { ok: true, data: { messages: [contact, { ...contact, id: 'c2', name: 'Bruno' }], total: 2, page: 1, pageSize: 25, subscribers: 3, integration } };
const detail = { contact, orders: [], linkedOrder: null, emails: [], historyLimited: true };
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
function nodes(tree, fn) { if (!tree || typeof tree !== 'object') return []; return [...(fn(tree) ? [tree] : []), ...[tree.props?.children].flat(3).flatMap(x => nodes(x, fn))]; }
function text(tree) { return tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : [tree.props?.children].flat(3).map(text).join(''); }
function fixture(file, actions = {}, props = { initial }) {
  assert.ok(fs.existsSync(root + file), 'Interactive inbox component must exist');
  const slots = []; let cursor = 0, tree;
  const react = {
    useState(value) { const i = cursor++; slots[i] ??= { value: typeof value === 'function' ? value() : value }; return [slots[i].value, v => { slots[i].value = typeof v === 'function' ? v(slots[i].value) : v; }]; },
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useTransition() { return [false, fn => fn()]; }, startTransition(fn) { fn(); },
  };
  const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props: props || {} };
  const defaults = { loadContact: async () => ({ ok: true, data: detail }), loadContacts: async () => initial };
  const compiled = ts.transpileModule(fs.readFileSync(root + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (id === 'next/link') return { default: p => jsx('a', p) };
    if (id === '@/app/admin/email-actions') return { ...defaults, ...actions };
    if (id === '../contacts/contact-workspace') {
      const child = { exports: {} };
      const childCode = ts.transpileModule(fs.readFileSync(root + 'contacts/contact-workspace.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
      new Function('require', 'module', 'exports', childCode)(dep => dep === 'react' ? react : dep === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : {}, child, child.exports);
      return child.exports;
    }
    throw Error('Unexpected dependency: ' + id);
  }, compiledModule, compiledModule.exports);
  function render() { cursor = 0; tree = compiledModule.exports.default(props); return tree; }
  render();
  return { render, get tree() { return tree; }, find: (type, label) => nodes(render(), n => n.type === type && (n.props['aria-label'] === label || text(n) === label))[0], text: () => text(render()) };
}
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

test('reply requires explicit confirmation and retains per-contact draft UUID on ambiguous retry', async () => {
  const sent = [];
  const ui = fixture('contacts/contact-workspace.tsx', {
    loadContact: async id => ({ ok: true, data: { ...detail, contact: { ...contact, id, name: id === 'c1' ? 'Ana' : 'Bruno' } } }),
    replyToContact: async payload => { sent.push(payload); throw Error('network'); },
  });
  ui.find('button', 'Abrir contacto de Ana').props.onClick(); await settle();
  ui.find('textarea', 'Mensagem de resposta').props.onChange({ target: { value: 'Resposta para Ana' } });
  ui.find('button', 'Rever resposta').props.onClick();
  assert.match(ui.text(), /ana@example.test/);
  assert.equal(sent.length, 0);
  ui.find('button', 'Confirmar e enviar email').props.onClick(); await settle();
  ui.find('button', 'Confirmar e enviar email').props.onClick(); await settle();
  assert.equal(sent.length, 2);
  assert.match(sent[0].requestId, /^[0-9a-f-]{36}$/);
  assert.equal(sent[0].requestId, sent[1].requestId);
  ui.find('button', 'Abrir contacto de Bruno').props.onClick(); await settle();
  assert.equal(ui.find('textarea', 'Mensagem de resposta').props.value, '');
  ui.find('button', 'Abrir contacto de Ana').props.onClick(); await settle();
  assert.equal(ui.find('textarea', 'Mensagem de resposta').props.value, 'Resposta para Ana');
});

test('provider failures and retained reservations never announce acceptance or discard the draft', async () => {
  for (const status of ['failed', 'failed_or_uncertain', 'reserved']) {
    const requests = [];
    const email = { id: 'reply-record', direction: 'outbound', from: 'support@example.test', to: [contact.email], subject: 'Re: Ajuda', text: 'Resposta', createdAt: contact.createdAt, status, type: 'reply' };
    const ui = fixture('contacts/contact-workspace.tsx', {
      replyToContact: async payload => { requests.push(payload); return { ok: true, data: { email } }; },
    });
    ui.find('button', 'Abrir contacto de Ana').props.onClick(); await settle();
    ui.find('textarea', 'Mensagem de resposta').props.onChange({ target: { value: 'Resposta' } });
    ui.find('button', 'Rever resposta').props.onClick();
    ui.find('button', 'Confirmar e enviar email').props.onClick(); await settle();
    assert.equal(ui.find('textarea', 'Mensagem de resposta').props.value, 'Resposta', status);
    assert.doesNotMatch(ui.text(), /Email aceite para envio\./, status);
    assert.match(ui.text(), status === 'failed' ? /envio falhou/i : /não confirmado/i, status);
    assert.match(ui.text(), /Saída/, 'Direction must not imply that a failed or reserved message was sent');
    assert.equal(ui.find('textarea', 'Mensagem de resposta').props.disabled, true, status);
    if (status === 'failed') {
      ui.find('button', 'Preparar nova tentativa').props.onClick();
      ui.find('button', 'Rever resposta').props.onClick();
      ui.find('button', 'Confirmar e enviar email').props.onClick(); await settle();
      assert.notEqual(requests[0].requestId, requests[1].requestId);
    } else {
      ui.find('button', 'Confirmar e enviar email').props.onClick(); await settle();
      assert.equal(requests[0].requestId, requests[1].requestId);
    }
  }
});

test('accepted reply replaces its retained reservation instead of duplicating history', async () => {
  const email = { id: 'reply-record', direction: 'outbound', from: 'support@example.test', to: [contact.email], subject: 'Re: Ajuda', text: 'Resposta', createdAt: contact.createdAt, status: 'accepted', type: 'reply' };
  const ui = fixture('contacts/contact-workspace.tsx', {
    loadContact: async () => ({ ok: true, data: { ...detail, emails: [{ ...email, status: 'reserved' }] } }),
    replyToContact: async () => ({ ok: true, data: { email } }),
  });
  ui.find('button', 'Abrir contacto de Ana').props.onClick(); await settle();
  ui.find('textarea', 'Mensagem de resposta').props.onChange({ target: { value: 'Resposta' } });
  ui.find('button', 'Rever resposta').props.onClick();
  ui.find('button', 'Confirmar e enviar email').props.onClick(); await settle();
  assert.equal(ui.find('textarea', 'Mensagem de resposta').props.value, '');
  assert.match(ui.text(), /Email aceite para envio\./);
  assert.equal(nodes(ui.tree, n => n.type === 'h4' && text(n) === 'Re: Ajuda').length, 1);
});

test('manual linking requires explicit mismatch confirmation and supports unlink', async () => {
  const order = { id: 'o1', orderNumber: 'EC-123', email: 'other@example.test', customerName: 'Outro', createdAt: contact.createdAt, paidAt: null, total: '20.00', currency: 'EUR', status: 'PENDING', paymentStatus: 'UNPAID', trackingNumber: null, items: [{ name: 'Painel', quantity: 2 }] };
  const links = [];
  const ui = fixture('contacts/contact-workspace.tsx', { searchContactOrders: async () => ({ ok: true, data: [order] }), linkContactOrder: async input => { links.push(input); return { ok: true, data: { ...detail, linkedOrder: input.orderNumber ? order : null, contact: { ...contact, orderRef: input.orderNumber } } }; } });
  ui.find('button', 'Abrir contacto de Ana').props.onClick(); await settle();
  ui.find('input', 'Pesquisar encomendas').props.onChange({ target: { value: 'EC-123' } });
  ui.find('form', 'Pesquisa de encomendas').props.onSubmit({ preventDefault() {} }); await settle();
  ui.find('button', 'Associar EC-123').props.onClick();
  assert.equal(links.length, 0);
  assert.match(ui.text(), /email diferente/);
  assert.equal(ui.find('button', 'Confirmar associação').props.disabled, true);
  ui.find('input', 'Confirmo a associação a um email diferente').props.onChange({ target: { checked: true } });
  ui.find('button', 'Confirmar associação').props.onClick(); await settle();
  assert.equal(links[0].orderNumber, 'EC-123');
  assert.match(ui.text(), /Painel/);
  ui.find('button', 'Desassociar encomenda').props.onClick();
  ui.find('button', 'Confirmar desassociação').props.onClick(); await settle();
  assert.equal(links[1].orderNumber, null);
});

test('activity uses server filters and bounded explicit import cursor and distinguishes accepted from delivered', async () => {
  const requests = [], cursors = [];
  const email = { id: 'e1', direction: 'outbound', from: 'shop@example.test', to: [contact.email], subject: 'Resposta', text: '<b>Texto</b>', createdAt: contact.createdAt, status: 'accepted', type: 'reply' };
  const activity = { ok: true, data: { emails: [email], total: 30, page: 1, pageSize: 25, integration } };
  const ui = fixture('emails/email-activity.tsx', { loadEmailActivity: async input => { requests.push(input); return { ...activity, data: { ...activity.data, page: input.page } }; }, syncEmailInbox: async input => { cursors.push(input); return { ok: true, data: cursors.length === 1 ? { imported: 10, hasMore: true, nextCursor: 'next-1' } : { imported: 2, hasMore: false } }; } }, { initial: activity });
  assert.match(ui.text(), /Aceite para envio \(não confirma entrega\)/);
  assert.match(ui.text(), /Apenas registos disponíveis/);
  ui.find('input', 'Pesquisar emails').props.onChange({ target: { value: 'ana' } });
  ui.find('select', 'Estado do email').props.onChange({ target: { value: 'bounced' } });
  ui.find('form', 'Filtrar atividade').props.onSubmit({ preventDefault() {} }); await settle();
  assert.deepEqual(requests[0], { query: 'ana', status: 'bounced', page: 1 });
  ui.find('button', 'Seguinte').props.onClick(); await settle();
  assert.equal(requests[1].page, 2);
  ui.find('button', 'Importar emails recebidos').props.onClick(); await settle();
  assert.equal(cursors.length, 1);
  ui.find('button', 'Continuar importação').props.onClick(); await settle();
  assert.deepEqual(cursors[1], { cursor: 'next-1' });
  assert.match(ui.text(), /12 emails importados/);
  assert.match(ui.text(), /Importação concluída/);
  assert.equal(cursors.length, 2);
});

test('missing linked order can still be explicitly unlinked and unconfigured replies are disabled', async () => {
  const ui = fixture('contacts/contact-workspace.tsx', { loadContact: async () => ({ ok: true, data: { ...detail, contact: { ...contact, orderRef: 'OLD-123' } } }) }, { initial: { ...initial, data: { ...initial.data, integration: { ...integration, sendingConfigured: false } } } });
  ui.find('button', 'Abrir contacto de Ana').props.onClick(); await settle();
  assert.ok(ui.find('button', 'Desassociar encomenda'), 'A stored reference must be unlinkable even if the order no longer exists');
  ui.find('textarea', 'Mensagem de resposta').props.onChange({ target: { value: 'Texto' } });
  assert.equal(ui.find('button', 'Rever resposta').props.disabled, true);
});

test('activity exposes real tracked states and refuses unconfigured imports', () => {
  const activity = { ok: true, data: { emails: [], total: 0, page: 1, pageSize: 20, integration: { ...integration, sendingConfigured: false } } };
  const ui = fixture('emails/email-activity.tsx', {}, { initial: activity });
  const options = nodes(ui.tree, n => n.type === 'option').map(n => n.props.value);
  for (const status of ['reserved', 'failed_or_uncertain', 'scheduled', 'opened', 'clicked', 'complained', 'suppressed', 'provider_unknown']) assert.ok(options.includes(status), status);
  assert.equal(ui.find('button', 'Importar emails recebidos').props.disabled, true);
});

test('pages load server action data and navigation exposes separate email monitoring', () => {
  const contacts = fs.readFileSync(root + 'contacts/page.tsx', 'utf8');
  assert.match(contacts, /await loadContacts\(/);
  assert.match(contacts, /ContactWorkspace initial=/);
  assert.ok(fs.existsSync(root + 'emails/page.tsx'), 'Email monitoring page must exist');
  assert.match(fs.readFileSync(root + 'emails/page.tsx', 'utf8'), /await loadEmailActivity\(/);
  assert.match(fs.readFileSync(root + 'layout.tsx', 'utf8'), /\/admin\/emails/);
});

test('contact selection displays safe text and ignores stale detail responses', async () => {
  const first = deferred(), second = deferred(); let calls = 0;
  const ui = fixture('contacts/contact-workspace.tsx', { loadContact: () => (++calls === 1 ? first.promise : second.promise) });
  ui.find('button', 'Abrir contacto de Ana').props.onClick();
  ui.find('button', 'Abrir contacto de Bruno').props.onClick();
  second.resolve({ ok: true, data: { ...detail, contact: { ...contact, id: 'c2', name: 'Bruno' } } }); await settle();
  first.resolve({ ok: true, data: detail }); await settle();
  assert.match(ui.text(), /Bruno/);
  assert.equal(nodes(ui.tree, n => n.type === 'h2' && text(n) === 'Ana').length, 0);
  assert.match(ui.text(), /<script>unsafe<\/script>/);
  assert.equal(nodes(ui.tree, n => n.props.dangerouslySetInnerHTML).length, 0);
});
