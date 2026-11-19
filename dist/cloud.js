import { convexUrl } from './cloud-config.js';

const planStore = 'poranny-rytm-plan-v3';
const linkStore = 'poranny-rytm-link-v1';
const dialog = document.querySelector('#sync-dialog');
const status = document.querySelector('#sync-status');
const field = document.querySelector('#sync-code');
const configReady = /^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(convexUrl);
let busy = false;
const getLink = () => JSON.parse(localStorage.getItem(linkStore));
const putLink = link => localStorage.setItem(linkStore, JSON.stringify(link));
const toHex = bytes => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');

async function call(method, args) {
  if (!configReady) throw new Error('Synchronizacja czeka na konfigurację serwera.');
  const response = await fetch(convexUrl + '/api/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'plans:' + (method === 'query' ? 'read' : 'save'), format: 'convex_encoded_json', args: [args] }),
  });
  const body = await response.json();
  if (!response.ok || body.status !== 'success') throw new Error('Nie udało się połączyć z bazą.');
  return body.value;
}

const keyFor = async code => toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)));

function apply(remote, code) {
  localStorage.setItem(planStore, JSON.stringify(remote.plan));
  putLink({ code, version: remote.version, dirty: false });
  window.dispatchEvent(new Event('plan-loaded'));
}

async function sync() {
  const link = getLink();
  if (!link || busy || !configReady) return;
  busy = true;
  try {
    const key = await keyFor(link.code);
    const snapshot = localStorage.getItem(planStore);
    if (link.dirty) {
      const result = await call('mutation', { key, plan: JSON.parse(snapshot), version: link.version });
      if (result.conflict) {
        status.textContent = 'Plan zmienił się na innym urządzeniu. Możesz pobrać wersję z chmury lub utworzyć nowy kod dla tej wersji.';
        return;
      }
      const dirty = snapshot !== localStorage.getItem(planStore);
      putLink({ ...link, version: result.version, dirty });
      if (dirty) setTimeout(sync, 0);
    } else {
      const remote = await call('query', { key });
      if (remote && remote.version > link.version && !getLink().dirty) apply(remote, link.code);
    }
    status.textContent = 'Plan jest zsynchronizowany.';
  } catch {
    status.textContent = 'Brak synchronizacji. Zmiany pozostają na urządzeniu.';
  } finally {
    busy = false;
  }
}

document.addEventListener('click', event => {
  if (!event.target.closest('#sync-open')) return;
  field.value = getLink()?.code ?? '';
  status.textContent = configReady ? '' : 'Synchronizacja czeka na konfigurację serwera.';
  dialog.showModal();
});

dialog.addEventListener('click', async event => {
  const action = event.target.dataset.sync;
  if (!action || busy) return;
  if (action === 'sync') return sync();
  busy = true;
  try {
    if (!configReady) throw new Error('Synchronizacja czeka na konfigurację serwera.');
    if (action === 'create') {
      const code = toHex(crypto.getRandomValues(new Uint8Array(16)));
      const snapshot = localStorage.getItem(planStore);
      const result = await call('mutation', { key: await keyFor(code), plan: JSON.parse(snapshot), version: 0 });
      if (result.conflict) throw new Error('Spróbuj utworzyć kod ponownie.');
      putLink({ code, version: result.version, dirty: false });
      field.value = code;
      status.textContent = 'Skopiuj kod i wklej go na drugim urządzeniu. Każdy z kodem może zmieniać plan.';
    } else if (action === 'join') {
      const code = field.value.trim().toLowerCase().replace(/[ -]/g, '');
      if (!/^[a-f0-9]{32}$/.test(code)) throw new Error('Wklej pełny kod z drugiego urządzenia.');
      if (!confirm('Zastąpić plan na tym urządzeniu planem przypisanym do kodu?')) return;
      const remote = await call('query', { key: await keyFor(code) });
      if (!remote) throw new Error('Nie znaleziono planu dla tego kodu.');
      apply(remote, code);
      status.textContent = 'Pobrano plan z chmury.';
    }
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
  }
});

window.addEventListener('plan-change', () => {
  const link = getLink();
  if (!link) return;
  putLink({ ...link, dirty: true });
  sync();
});
window.addEventListener('online', () => { if (getLink()?.dirty) sync(); });
// Refresh explicitly from the sync panel, so a remote pull cannot replace an open editor.
