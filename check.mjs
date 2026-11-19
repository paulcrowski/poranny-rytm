import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const nodes=new Map();
const storage=new Map();
function node(selector){if(!nodes.has(selector))nodes.set(selector,{value:'',style:{setProperty(){}},addEventListener(){},showModal(){},close(){},textContent:'',innerHTML:''});return nodes.get(selector)}
const context=vm.createContext({console,structuredClone,setTimeout,clearTimeout,setInterval(){},performance:{now:()=>0},navigator:{},window:{addEventListener(){}},document:{querySelector:node,addEventListener(){}},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},confirm:()=>true});
vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
vm.runInContext(`
if(total()!==100)throw Error('Incorrect warmup total');
mode='workout';
if(total()!==130)throw Error('Incorrect strength total');
const cues = [];
cue = (kind, delay = 0) => cues.push([kind, delay]);
start();if(session.phase!=='prepare')throw Error('Missing preparation');
advance();if(session.phase!=='exercise'||session.remaining!==30)throw Error('Incorrect first exercise');
pause();if(!session.paused)throw Error('Pause failed');
pause();if(session.paused)throw Error('Resume failed');
advance();if(session.phase!=='rest'||session.remaining!==10||session.completed!==1)throw Error('Rest failed');
advance();if(session.phase!=='exercise'||session.index!==1)throw Error('Next exercise failed');
advance(true);if(session.completed!==1)throw Error('Skipped exercise counted as completed');
while(session)advance();
if(completionTotals().get('przysiady')?.count!==1 || completionTotals().has('pompki')) throw Error('History must record completions and exclude skips');
recordCompletion({name:'Przysiady'},new Date(2000,0,1,23,59));
recordCompletion({name:'PRZYSIADY'},new Date(2000,0,2,0,1));
if(readHistory()['2000-01-01']['przysiady'].count!==1 || completionTotals().get('przysiady').count!==3) throw Error('Incorrect daily history or total');
if(!document.querySelector('#app').innerHTML.includes('Dobry początek dnia'))throw Error('Finish failed');
if (JSON.stringify(cues.slice(0, 3)) !== JSON.stringify([['start',0],['end',0],['start',0]])) throw Error('Incorrect audio cues with rest');
mode='calm'; start(); advance(); advance();
if(session.phase!=='exercise'||session.index!==1)throw Error('Unexpected meditation rest');
if (JSON.stringify(cues.slice(-2)) !== JSON.stringify([['end',0],['start',.28]])) throw Error('Incorrect cues for consecutive steps');
if(workoutItems(oldDefault).some(item=>item.pose==='calm') || workoutItems([{name:'Custom'}])[0].name!=='Custom') throw Error('Legacy migration changed custom steps');
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
