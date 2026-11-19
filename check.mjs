import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const nodes=new Map();
function node(selector){if(!nodes.has(selector))nodes.set(selector,{value:'',style:{setProperty(){}},addEventListener(){},showModal(){},close(){},textContent:'',innerHTML:''});return nodes.get(selector)}
const context=vm.createContext({console,structuredClone,setTimeout,clearTimeout,setInterval(){},performance:{now:()=>0},navigator:{},window:{addEventListener(){}},document:{querySelector:node,addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},confirm:()=>true});
vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
vm.runInContext(`
if(total()!==390)throw Error('Incorrect workout total');
start();if(session.phase!=='prepare')throw Error('Missing preparation');
advance();if(session.phase!=='exercise'||session.remaining!==30)throw Error('Incorrect first exercise');
pause();if(!session.paused)throw Error('Pause failed');
pause();if(session.paused)throw Error('Resume failed');
advance();if(session.phase!=='rest'||session.remaining!==10||session.completed!==1)throw Error('Rest failed');
advance();if(session.phase!=='exercise'||session.index!==1)throw Error('Next exercise failed');
advance(true);if(session.completed!==1)throw Error('Skipped exercise counted as completed');
while(session)advance();
if(!document.querySelector('#app').innerHTML.includes('Dobry początek dnia'))throw Error('Finish failed');
start();advance();session.index=5;advance();if(session.phase!=='exercise'||session.index!==6)throw Error('Unexpected meditation rest');
home();mode='workout';openEditor();
document.querySelector('#exercise-name').value='Własne ćwiczenie';
`,context);
const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));
let grantWakeLock;
const firstLock = { released: false, async release() { this.released = true; } };
context.navigator.wakeLock = {
  request: () => new Promise(resolve => { grantWakeLock = resolve; }),
};
vm.runInContext('start(); pause();', context);
assert.ok(grantWakeLock, 'Starting requests a screen lock');
vm.runInContext('finish()', context);
grantWakeLock(firstLock);
await new Promise(resolve => setImmediate(resolve));
assert.ok(firstLock.released, 'Late screen lock is released after finishing');

let onRelease;
const secondLock = {
  addEventListener(event, callback) { if (event === 'release') onRelease = callback; },
  async release() {},
};
vm.runInContext('start();', context);
grantWakeLock(secondLock);
await new Promise(resolve => setImmediate(resolve));
vm.runInContext('pause();', context);
assert.ok(vm.runInContext('Boolean(wakeLock)', context), 'Manual pause keeps the screen on');
onRelease();
assert.ok(vm.runInContext('Boolean(wakeRetry)', context), 'OS release schedules one retry');
vm.runInContext('finish()', context);

for(const icon of manifest.icons)assert.ok(fs.existsSync('dist/'+icon.src));
assert.equal(manifest.display,'standalone');
assert.ok(fs.readFileSync('dist/index.html','utf8').includes('lang="pl"'));
console.log('OK: workout timing and transitions, screen lock lifecycle, meditation, PWA assets.');
