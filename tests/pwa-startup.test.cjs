const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const workerScript=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
async function lifecycle(existingController){
 const handlers={},events={};let reloads=0,updates=0;
 const navigator={serviceWorker:{controller:existingController,register:async()=>({update:()=>updates++,addEventListener:()=>{}}),addEventListener:(name,cb)=>{handlers[name]=cb}}};
 vm.runInNewContext(workerScript,{navigator,window:{location:{hostname:'app.faithhubs.com',reload:()=>reloads++},addEventListener:(name,cb)=>{events[name]=cb}},console});events.load();await Promise.resolve();navigator.serviceWorker.controller={};handlers.controllerchange();handlers.controllerchange();return{reloads,updates};
}
test('first service worker activation does not reload an already loading application',async()=>assert.deepEqual(await lifecycle(null),{reloads:0,updates:1}));
test('an update of an already controlled application reloads at most once',async()=>assert.deepEqual(await lifecycle({}),{reloads:1,updates:1}));
