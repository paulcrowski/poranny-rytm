const $=s=>document.querySelector(s);
const STORE='poranny-rytm-v1';
const defaults={workout:[{name:'Pajacyki',seconds:30,note:'W swoim tempie. Możesz też odstawiać nogi na boki bez podskoku.',pose:'jump'},{name:'Przysiady',seconds:30,note:'Cofnij biodra i zegnij kolana do wygodnej głębokości.',pose:'squat'},{name:'Pompki',seconds:20,note:'Wybierz wygodny wariant: przy ścianie, na kolanach lub klasycznie.',pose:'push'},{name:'Brzuszki',seconds:30,note:'Unoś lekko barki nad podłogę. Nie ciągnij głowy rękami.',pose:'crunch'},{name:'Deska',seconds:20,note:'Oprzyj się na przedramionach. Oddychaj swobodnie.',pose:'plank'},{name:'Rozciąganie ramion',seconds:30,note:'Delikatnie przyciągnij ramię przed klatką piersiową. W połowie zmień stronę.',pose:'stretch'}],calm:[{name:'Usiądź wygodnie',seconds:30,note:'Oprzyj stopy lub usiądź na poduszce. Rozluźnij ramiona.',pose:'calm'},{name:'Spokojny oddech',seconds:120,note:'Oddychaj naturalnie, bez zatrzymywania oddechu. Obserwuj każdy wdech i wydech.',pose:'calm'},{name:'Chwila dla siebie',seconds:30,note:'Poczuj kontakt z podłożem. Powoli wróć uwagą do otoczenia.',pose:'calm'}],rest:10};
function validList(a){return Array.isArray(a)&&a.length<=100&&a.every(e=>e&&typeof e.name==='string'&&e.name.trim()&&e.name.length<=60&&Number.isInteger(e.seconds)&&e.seconds>=5&&e.seconds<=3600&&typeof e.note==='string'&&e.note.length<=240)}
let data=structuredClone(defaults),storageAvailable=true;
try{const raw=localStorage.getItem(STORE);if(raw){const parsed=JSON.parse(raw);if(validList(parsed.workout)&&validList(parsed.calm)&&[0,5,10,15,20,30].includes(parsed.rest))data=parsed;}}catch{storageAvailable=false}
const PLAN_STORE = 'poranny-rytm-plan-v3';
const EXTRA_STORE = 'poranny-rytm-programs-v1';
const restOptions = [0, 5, 10, 15, 20, 30];
const programs = { warmup: 'Rozgrzewka poranna', workout: 'Trening siłowy', calm: 'Medytacja' };
const oldDefault = [...defaults.workout, ...defaults.calm.map(item => ({ ...item, restBefore: false }))];
const defaultWorkout = defaults.workout.filter(item => ['squat', 'push', 'crunch', 'plank'].includes(item.pose));
function workoutItems(items) {
  return JSON.stringify(items) === JSON.stringify(oldDefault) ? structuredClone(defaultWorkout) : items;
}
data.warmup = [
  { name: 'Marsz w miejscu', seconds: 30, note: 'Zacznij spokojnie i rozruszaj ręce.', pose: 'custom' },
  { name: 'Krążenia ramion', seconds: 30, note: 'Zacznij od małych kół. W połowie zmień kierunek.', pose: 'stretch' },
  { name: 'Pajacyki', seconds: 30, note: 'Możesz odstawiać nogi na boki bez podskoku.', pose: 'jump' },
];
if (JSON.stringify(data.workout) === JSON.stringify(defaults.workout)) data.workout = structuredClone(defaultWorkout);
const extraRest = { warmup: 5, calm: 0 };
function loadWorkout() {
  try {
    const plan = JSON.parse(localStorage.getItem(PLAN_STORE));
    if (plan && validList(plan.items) && restOptions.includes(plan.rest)) {
      data.workout = workoutItems(plan.items);
      data.rest = plan.rest;
    }
  } catch {}
}
loadWorkout();
try {
  const saved = JSON.parse(localStorage.getItem(EXTRA_STORE));
  for (const key of ['warmup', 'calm']) {
    if (validList(saved?.[key]?.items) && restOptions.includes(saved[key].rest)) {
      data[key] = saved[key].items;
      extraRest[key] = saved[key].rest;
    }
  }
} catch {}
function currentRest() {
  return mode === 'workout' ? data.rest : extraRest[mode];
}
let mode='warmup',session=null,editing=-1,editMode='workout',audioContext,wakeLock,installPrompt;
let wakeRequest = null;
let wakeRetry = null;
let installed = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function save() {
  try {
    if (mode === 'workout') {
      localStorage.setItem(PLAN_STORE, JSON.stringify({ items: data.workout, rest: data.rest }));
      window.dispatchEvent?.(new Event('plan-change'));
    } else {
      const extras = Object.fromEntries(['warmup', 'calm'].map(key => [key, { items: data[key], rest: extraRest[key] }]));
      localStorage.setItem(EXTRA_STORE, JSON.stringify(extras));
    }
    storageAvailable = true;
    return true;
  } catch {
    storageAvailable = false;
    toast('Brak dostępu do zapisu. Zmiany znikną po zamknięciu aplikacji.');
    return false;
  }
}
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>$('#toast').style.display='none',4500)}
const sun='<svg class="sun" viewBox="0 0 120 120" fill="none" aria-hidden="true"><circle cx="60" cy="60" r="23" stroke="currentColor" stroke-width="3"/><path d="M60 5v15M60 100v15M5 60h15M100 60h15M21 21l11 11M88 88l11 11M99 21L88 32M32 88L21 99" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
function art(pose,large=false){const poses={jump:'M100 62v48m0-35L65 45m35 30l35-30m-35 65l-32 40m32-40l32 40',squat:'M100 62l-10 35m0-20l35 8m-35 12l35 12-23 37m-12-49l-25 18 10 30',push:'M55 94l90 25m-70-19l-4 38m62-22l22 22',plank:'M55 94l90 25m-70-19l-4 38h-20m82-22l22 22',crunch:'M57 111l35-29m-16 14l28 14m-47 1l49 10 20-37 22 49',stretch:'M100 62v48m0-34l-35 1m35 0l-20 16-10-17m30 34l-16 40m16-40l16 40',calm:'M100 62v43m0-28L76 103H58m42-26l24 26h18m-42 2l-29 27 59 0-30-27',custom:'M100 62v48m0-34L74 93m26-17l26 17m-26 17l-16 40m16-40l16 40'};const head={push:[42,87],plank:[42,87],crunch:[102,73]};const [cx,cy]=head[pose]||[100,45];return `<svg viewBox="0 0 200 170" fill="none" aria-hidden="true" class="${pose==='calm'&&large?'breathing':''}"><ellipse cx="100" cy="153" rx="74" ry="8" fill="#c9d8b8"/><circle cx="${cx}" cy="${cy}" r="11" fill="currentColor"/><path d="${poses[pose]||poses.custom}" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
function header(){return `<header><div class="brand"><span class="brand-mark">☀</span> poranny rytm</div>${!installed&&!session?'<button class="install" data-action="install">Dodaj do ekranu</button>':''}</header>`}
function total(){return data[mode].reduce((sum,e)=>sum+e.seconds,0)+data[mode].slice(1).filter(e=>e.restBefore!==false).length*currentRest()}
function home() {
  session = null;
  const list = data[mode];
  $('#app').innerHTML = `${header()}
    <section class="hero">
      <div class="eyebrow">Ćwiczenia i medytacja</div>
      <h1>${programs[mode]}</h1>
      <div class="stats"><span>${clock(total())}</span><span>${list.length} etapów</span></div>
    </section>
    <nav class="programs" aria-label="Wybór treningu">
      ${Object.entries(programs).map(([key, label]) => `<button class="secondary" data-action="program" data-program="${key}" aria-pressed="${mode === key}">${label}</button>`).join('')}
    </nav>
    <div class="section-heading"><h2>Kroki</h2>${mode === 'workout' ? '<button class="install" id="sync-open">Połącz urządzenia</button>' : ''}</div>
    <section aria-label="Lista etapów">
      ${list.map((e,i) => `<div class="exercise">
        <div class="mini-art">${art(e.pose)}</div>
        <button class="exercise-info" data-action="edit" data-index="${i}">
          <strong>${esc(e.name)}</strong><small>${clock(e.seconds)}${e.pose==='calm'?' · Medytacja':''}</small>
        </button>
        <div class="reorder">
          <button data-action="up" data-index="${i}" aria-label="Przenieś wyżej: ${esc(e.name)}" ${i===0?'disabled':''}>▲</button>
          <button data-action="down" data-index="${i}" aria-label="Przenieś niżej: ${esc(e.name)}" ${i===list.length-1?'disabled':''}>▼</button>
        </div>
      </div>`).join('')}
    </section>
    <div class="add-row"><button class="add" data-action="add">${mode === 'calm' ? 'Dodaj etap' : 'Dodaj ćwiczenie'}</button></div>
    <label class="settings" for="rest">Przerwa między etapami
      <select id="rest">${restOptions.map(n=>`<option value="${n}" ${currentRest()===n?'selected':''}>${n ? n+' s' : 'Bez przerwy'}</option>`).join('')}</select>
    </label>
    <div class="bottom"><div class="bottom-inner"><button class="primary" data-action="start" ${!list.length?'disabled':''}>Rozpocznij · ${clock(total())}</button></div></div>`;
}
window.addEventListener('plan-loaded', () => {
  if ($('#editor').open && editMode === 'workout') return;
  loadWorkout();
  if (mode === 'workout' && !session) home();
});
let meditation = false;
function openEditor(index=-1, calm=false){meditation=calm;editing=index;editMode=mode;const e=data[mode][index];$('#edit-title').textContent=e?'Edytuj etap':calm?'Dodaj etap':'Dodaj ćwiczenie';$('#exercise-name').value=e?.name||'';$('#exercise-time').value=e?.seconds||(calm?120:30);$('#exercise-note').value=e?.note||'';$('#delete-exercise').hidden=!e;$('#editor').showModal();}
$('#edit-form').addEventListener('submit',event=>{event.preventDefault();const name=$('#exercise-name').value.trim(),seconds=Number($('#exercise-time').value),note=$('#exercise-note').value.trim();if(!name||!Number.isInteger(seconds)||seconds<5||seconds>3600)return;const list=data[editMode];if(editing<0&&list.length>=100){toast('Plan może mieć maksymalnie 100 ćwiczeń.');return}const exercise={name,seconds,note,pose:list[editing]?.pose||(meditation?'calm':'custom'),restBefore:list[editing]?.restBefore ?? true};if(editing>=0)list[editing]=exercise;else list.push(exercise);const saved=save();$('#editor').close();home();if(saved)toast('Plan zapisany');});
$('#close-editor').onclick=()=>$('#editor').close();
$('#delete-exercise').onclick = () => {
  if (editing < 0) return;
  const [removed] = data[editMode].splice(editing, 1);
  const saved = save();
  $('#editor').close();
  home();
  if (saved) toast(`Usunięto: ${removed.name}`);
};
document.addEventListener('change',event=>{if(event.target.id==='rest'){const rest=Number(event.target.value);if(mode==='workout')data.rest=rest;else extraRest[mode]=rest;save();home()}});
function cue(kind, delay = 0) {
  if (!audioContext || audioContext.state !== 'running') return;
  const at = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = kind === 'start' ? 587 : 392;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(.04, at + .035);
  gain.gain.exponentialRampToValueAtTime(.001, at + .23);
  oscillator.start(at);
  oscillator.stop(at + .24);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}

async function keepAwake() {
  if (!session || document.hidden || wakeLock || wakeRequest || !navigator.wakeLock) return;
  const request = navigator.wakeLock.request('screen');
  wakeRequest = request;

  try {
    const lock = await request;
    if (wakeRequest !== request || !session || document.hidden) {
      await lock.release();
      return;
    }
    wakeLock = lock;
    lock.addEventListener('release', () => {
      if (wakeLock !== lock) return;
      wakeLock = null;
      if (session && !document.hidden) wakeRetry = setTimeout(keepAwake, 1000);
    }, { once: true });
  } catch {
    // The OS may deny a lock, for example in low power mode.
  } finally {
    if (wakeRequest === request) wakeRequest = null;
  }
}

function releaseWake() {
  clearTimeout(wakeRetry);
  wakeRequest = null;
  const lock = wakeLock;
  wakeLock = null;
  lock?.release().catch(() => {});
}
function start(){try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(() => {})}catch{}const list=structuredClone(data[mode]);if(!list.length)return;session={list,index:0,rest:currentRest(),phase:'prepare',duration:5,remaining:5,deadline:performance.now()+5000,paused:false,completed:0};keepAwake();renderSession()}
function current(){return session.list[session.index]}
function renderSession(){if(!session)return;const s=session,e=current(),prepare=s.phase==='prepare',rest=s.phase==='rest';$('#app').innerHTML=`${header()}<section class="session"><div class="session-top"><button class="secondary" data-action="exit">Zakończ</button><span class="eyebrow">${mode==='calm'?'Etap':'Ćwiczenie'} ${s.index+1} z ${s.list.length}</span></div><div class="large-art">${art(prepare||rest?'calm':e.pose,true)}</div><h1>${prepare?'Przygotuj się':rest?'Chwila przerwy':esc(e.name)}</h1><div class="timer" style="--progress:0%"><div class="timer-inner"><span class="digits" role="timer" aria-label="Pozostały czas">${clock(Math.ceil(s.remaining))}</span><span class="timer-label">${s.paused?'Pauza':prepare?'Zaraz zaczynamy':rest?'Odpocznij':'Pozostało'}</span></div></div><p class="session-note">${prepare?'Znajdź trochę miejsca i ustaw telefon w zasięgu wzroku.':rest?'Rozluźnij ciało. Za chwilę kolejne ćwiczenie.':esc(e.note)}</p><div class="session-controls"><button class="primary" data-action="pause">${s.paused?'Wznów':'Pauza'}</button><button class="secondary" data-action="skip">${prepare?'Zacznij teraz':'Pomiń'}</button></div><div class="next">${prepare||rest?'Za chwilę':s.index<s.list.length-1?'Następnie':'Na koniec'}<strong>${prepare||rest?esc(e.name)+' · '+clock(e.seconds):s.index<s.list.length-1?esc(s.list[s.index+1].name)+' · '+clock(s.list[s.index+1].seconds):'Gotowe. Czas na resztę dnia.'}</strong></div></section>`;updateTimer()}
function updateTimer(){if(!session)return;$('.digits').textContent=clock(Math.max(0,Math.ceil(session.remaining)));$('.timer').style.setProperty('--progress',`${Math.min(100,Math.max(0,100*(1-session.remaining/session.duration)))}%`)}
function advance(skipped = false) {
  if (!session) return;
  const s = session;
  const ended = s.phase === 'exercise' && !skipped;
  if (ended) {
    s.completed++;
    if (!s.paused) cue('end');
  }
  if (s.phase === 'exercise' && s.index === s.list.length - 1) {
    finish();
    return;
  }
  let rest = 0;
  if (s.phase === 'exercise') {
    s.index++;
    rest = current().restBefore === false ? 0 : s.rest;
  }
  s.phase = rest ? 'rest' : 'exercise';
  s.duration = rest || current().seconds;
  s.remaining = s.duration;
  if (!s.paused && s.phase === 'exercise') cue('start', ended ? .28 : 0);
  s.deadline = performance.now() + s.duration * 1000;
  renderSession();
}

function pause() {
  if (!session) return;
  if (!session.paused) {
    session.remaining = Math.max(0, (session.deadline - performance.now()) / 1000);
  } else {
    session.deadline = performance.now() + session.remaining * 1000;
  }
  session.paused = !session.paused;
  if (!document.hidden) keepAwake();
  renderSession();
}
function finish(){const s=session;releaseWake();session=null;$('#app').innerHTML=`${header()}<section class="finish"><div class="finish-mark">✓</div><div class="eyebrow">Chwila dla siebie za Tobą</div><h1>${s.completed?'Dobry początek dnia.':'Sesja zakończona.'}</h1><p>Ukończone ${mode==='calm'?'etapy':'ćwiczenia'}: ${s.completed} z ${s.list.length}.</p><button class="primary" data-action="home" style="max-width:380px;margin-top:25px">Wróć do planu</button></section>`}
setInterval(()=>{if(!session||session.paused)return;session.remaining=Math.max(0,(session.deadline-performance.now())/1000);if(session.remaining<=0)advance();else updateTimer()},100);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    releaseWake();
    if (session && !session.paused) pause();
  } else {
    keepAwake();
  }
});
window.addEventListener('pagehide', releaseWake);
window.addEventListener('pageshow', keepAwake);
document.addEventListener('click',async event=>{const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action,index=Number(button.dataset.index);if(action==='edit')openEditor(index);if(action==='add')openEditor(-1,mode==='calm');if(action==='program'){const next=button.dataset.program;if(!session&&Object.hasOwn(programs,next)){mode=next;home();document.querySelector('[data-program="'+mode+'"]')?.focus();}}if(action==='up'||action==='down'){const list=data[mode],to=index+(action==='up'?-1:1);if(to>=0&&to<list.length){[list[index],list[to]]=[list[to],list[index]];save();home()}}if(action==='start')start();if(action==='pause')pause();if(action==='skip')advance(true);if(action==='exit'){if(!session)return;const wasPaused=session.paused;if(!wasPaused)pause();if(confirm('Zakończyć tę sesję i wrócić do planu?')){releaseWake();home()}else if(!wasPaused)pause()}if(action==='home')home();if(action==='install')await installApp()});
async function installApp() {
  if (installed) return;
  const prompt = installPrompt;
  installPrompt = null;
  if (prompt) {
    try {
      await prompt.prompt();
      return;
    } catch {
      // The browser can invalidate the saved prompt.
    }
  }
  $('#install-help').showModal();
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('appinstalled', () => {
  installed = true;
  installPrompt = null;
  $('#install-help').close();
  if (!session && $('[data-action="start"]')) home();
});
window.addEventListener('beforeunload',event=>{if(session){event.preventDefault();event.returnValue=''}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
try {
  if (!localStorage.getItem(PLAN_STORE)) {
    localStorage.setItem(PLAN_STORE, JSON.stringify({items: data.workout, rest: data.rest}));
  }
} catch {}
home();
