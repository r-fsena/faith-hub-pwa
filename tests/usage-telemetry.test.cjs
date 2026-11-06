const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/services/usageTelemetry.ts'),'utf8').replace('import.meta.env.VITE_API_URL','undefined');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(){
  const state={now:Date.parse('2026-11-06T15:00:00Z'),requests:[],status:202,tokenUser:'user-a',defer:null};
  class Clock extends Date{constructor(...args){super(...(args.length?args:[state.now]));}static now(){return state.now;}}
  const store=()=>{const data=new Map();return{data,getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};};
  const localStorage=store(),sessionStorage=store(),navigator={onLine:true},document={visibilityState:'visible'},location={pathname:'/',search:''};
  let uuid=0;
  const module={exports:{}};
  const sandbox={module,exports:module.exports,require:()=>({getAuthHeaders:async()=>{if(state.defer)await state.defer;return {Authorization:'Bearer head.'+Buffer.from(JSON.stringify({sub:state.tokenUser})).toString('base64url')+'.sig'};}}),
    localStorage,sessionStorage,navigator,document,location,Date:Clock,URLSearchParams,crypto:{randomUUID:()=>`id-${++uuid}`},
    setTimeout:()=>++uuid,clearTimeout:()=>{},Event:class{},window:{addEventListener:()=>{},dispatchEvent:()=>{}},atob:value=>Buffer.from(value,'base64').toString('utf8'),fetch:async(url,input)=>{state.requests.push({url,body:JSON.parse(input.body)});return{status:state.status};},
  };
  vm.runInNewContext(compiled,sandbox);
  const scope={org:'org-a',user:'user-a',campus:'campus-a',version:'v1',revision:1,enabled:true};
  return{...sandbox,state,scope,api:module.exports};
}
test('usage has no capture before consent or with an operational kill switch',async()=>{
  const f=fixture();f.api.recordUsage({name:'screen_view',module:'home'});await f.api.flushUsage();assert.equal(f.state.requests.length,0);
  f.api.configureUsage({...f.scope,enabled:false});f.api.recordUsage({name:'screen_view',module:'home'});await f.api.flushUsage();assert.equal(f.localStorage.data.size,0);
});
test('v1 and v2 events share the same payload and never carry arbitrary personal content',async()=>{
  for(const version of ['v1','v2']){
    const f=fixture();f.api.configureUsage({...f.scope,version});f.api.recordUsage({name:'screen_view',module:'home',email:'private@example.test',note:'private note'});await f.api.flushUsage();
    assert.equal(f.state.requests.length,1);const event=f.state.requests[0].body.events[0];assert.equal(event.version,version);assert.equal(event.email,undefined);assert.equal(event.note,undefined);assert.equal(f.state.requests[0].body.organization_id,'org-a');
  }
});
test('offline retry preserves IDs and acknowledges only successfully accepted events',async()=>{
  const f=fixture();f.api.configureUsage(f.scope);f.navigator.onLine=false;f.api.recordUsage({name:'screen_view',module:'home'});await f.api.flushUsage();assert.equal(f.state.requests.length,0);
  f.navigator.onLine=true;f.state.status=503;await f.api.flushUsage();const first=f.state.requests[0].body.events[0].id;
  f.state.status=202;await f.api.flushUsage();assert.equal(f.state.requests[1].body.events[0].id,first);
  assert.equal(JSON.parse(f.localStorage.getItem('faithhub_usage_v1:org-a:user-a:campus-a')).events.length,0);
});
test('session rotates after thirty minutes, and hidden or duplicate screen renders do not inflate usage',async()=>{
  const f=fixture();f.api.configureUsage(f.scope);f.api.recordUsage({name:'screen_view',module:'home'});f.api.recordUsage({name:'screen_view',module:'home'});
  f.api.recordUsage({name:'screen_view',module:'profile'});await f.api.flushUsage();const events=f.state.requests[0].body.events;assert.equal(events.length,2);assert.equal(events[0].session_id,events[1].session_id);
  f.document.visibilityState='hidden';f.api.recordUsage({name:'screen_view',module:'cells'});await f.api.flushUsage();assert.equal(f.state.requests.length,1);
  f.document.visibilityState='visible';f.state.now+=1800001;f.api.recordUsage({name:'screen_view',module:'cells'});await f.api.flushUsage();assert.notEqual(f.state.requests[1].body.events[0].session_id,events[0].session_id);
});
test('tenant, campus and user switches clear pending records; stale component events are ignored',async()=>{
  const f=fixture();f.api.configureUsage(f.scope);f.api.recordUsage({name:'screen_view',module:'home'});
  f.api.configureUsage({...f.scope,org:'org-b'});await f.api.flushUsage();assert.equal(f.state.requests.length,0);assert.equal(f.localStorage.getItem('faithhub_usage_v1:org-a:user-a:campus-a'),null);
  f.api.recordUsage({name:'content_interaction',module:'home',content_type:'BROADCAST',content_id:'old',event_type:'OPENED'},'org-a');await f.api.flushUsage();assert.equal(f.state.requests.length,0);
  f.api.configureUsage(null);assert.equal(f.sessionStorage.data.size,0);
});
test('an authentication token changing during capture cannot attribute the previous user events to a new user',async()=>{
  const f=fixture();f.api.configureUsage(f.scope);f.api.recordUsage({name:'screen_view',module:'home'});f.state.tokenUser='user-b';await f.api.flushUsage();assert.equal(f.state.requests.length,0);
});
test('withdrawal remains blocked locally even if the server preference could not yet be updated',async()=>{
  const f=fixture();f.api.configureUsage(f.scope);f.api.recordUsage({name:'screen_view',module:'home'});f.api.setLocalUsageBlock('org-a','user-a',true);
  f.api.configureUsage(f.scope);f.api.recordUsage({name:'screen_view',module:'cells'});await f.api.flushUsage();assert.equal(f.state.requests.length,0);
  f.api.setLocalUsageBlock('org-a','user-a',false);f.api.configureUsage({...f.scope,revision:3});f.api.recordUsage({name:'screen_view',module:'cells'});await f.api.flushUsage();assert.equal(f.state.requests.length,1);
});
test('cached events from a previous consent revision or beyond the offline window are not replayed',async()=>{
  const f=fixture();f.localStorage.setItem('faithhub_usage_v1:org-a:user-a:campus-a',JSON.stringify({revision:0,events:[{occurred_at:new Date(f.state.now).toISOString(),id:'old'}]}));f.api.configureUsage(f.scope);await f.api.flushUsage();assert.equal(f.state.requests.length,0);
  f.api.configureUsage(null);f.localStorage.setItem('faithhub_usage_v1:org-a:user-a:campus-a',JSON.stringify({revision:1,events:[{occurred_at:'2020-01-01',id:'expired'}]}));f.api.configureUsage(f.scope);await f.api.flushUsage();assert.equal(f.state.requests.length,0);
});
test('a withdrawn server preference removes a cached queue even after a full reload',()=>{
  const f=fixture();f.localStorage.setItem('faithhub_usage_v1:org-a:user-a:campus-a',JSON.stringify({revision:1,events:[{id:'old',occurred_at:new Date(f.state.now).toISOString()}]}));
  f.api.configureUsage({...f.scope,enabled:false});assert.equal(f.localStorage.getItem('faithhub_usage_v1:org-a:user-a:campus-a'),null);
});
test('preview and demo never collect events, and unauthorized responses purge pending usage',async()=>{
  const f=fixture();f.location.pathname='/__pwa-preview';f.api.configureUsage(f.scope);f.api.recordUsage({name:'screen_view',module:'home'});await f.api.flushUsage();assert.equal(f.state.requests.length,0);
  f.location.pathname='/';f.api.configureUsage(f.scope);f.api.recordUsage({name:'screen_view',module:'home'});f.state.status=403;await f.api.flushUsage();assert.equal(f.localStorage.getItem('faithhub_usage_v1:org-a:user-a:campus-a'),null);
});
