import { getAuthHeaders } from './api';

const API = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';
export const USAGE_POLICY = '2026-11-06.v1';
export interface UsagePreference { eligible:boolean;allowed:boolean;revision:number;policy_version:string;collection_enabled:boolean; }
type Scope = {org:string;user:string;campus:string;version:'v1'|'v2';revision:number;enabled:boolean};
type Interaction = {id:string;name:'screen_view'|'content_interaction';module:string;occurred_at:string;session_id:string;version:'v1'|'v2';content_type?:string;content_id?:string;event_type?:string;duration_seconds?:number;progress_percent?:number};
let current:Scope|null=null, events:Interaction[]=[], busy=false, timer:ReturnType<typeof setTimeout>|null=null, failures=0;
let lastView={key:'',at:0};
const localBlocks=new Set<string>();
const blockKey=(org:string,user:string)=>`faithhub_usage_block_v1:${org}:${user}`;
export function locallyBlocked(org:string,user:string){try{return localBlocks.has(blockKey(org,user))||localStorage.getItem(blockKey(org,user))==='1';}catch{return localBlocks.has(blockKey(org,user));}}
export function setLocalUsageBlock(org:string,user:string,blocked:boolean){
  const key=blockKey(org,user);
  if(blocked)localBlocks.add(key);else localBlocks.delete(key);
  try{if(blocked)localStorage.setItem(key,'1');else localStorage.removeItem(key);}catch{}
  if(blocked)configureUsage(null);
}
const keyFor=(scope:Scope)=>`faithhub_usage_v1:${scope.org}:${scope.user}:${scope.campus}`;
function cleanInteraction(input:any):Interaction{
  return {id:input.id,name:input.name,module:input.module,occurred_at:input.occurred_at,session_id:input.session_id,version:input.version,
    ...(input.name==='content_interaction'?{content_type:input.content_type,content_id:input.content_id,event_type:input.event_type,duration_seconds:input.duration_seconds,progress_percent:input.progress_percent}:{})};
}
const isPreview=()=>{
  if(location.pathname.startsWith('/__pwa-preview')||new URLSearchParams(location.search).get('demo')==='true')return true;
  try{return localStorage.getItem('faithhub_demo_auth')==='true';}catch{return false;}
};
function persist(){if(current?.enabled)try{localStorage.setItem(keyFor(current),JSON.stringify({revision:current.revision,events}));}catch{/* bounded in-memory queue still works */}}
function schedule(delay=3000){if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;void flushUsage();},delay);}
export function configureUsage(next:Scope|null){
  if(next?.enabled&&locallyBlocked(next.org,next.user))next={...next,enabled:false};
  const previous=current;
  const same=previous&&next&&keyFor(previous)===keyFor(next)&&previous.revision===next.revision;
  if(!same||!next?.enabled){
    if(previous)try{localStorage.removeItem(keyFor(previous));sessionStorage.removeItem(keyFor(previous)+':session');}catch{}
    if(next&&!next.enabled)try{localStorage.removeItem(keyFor(next));sessionStorage.removeItem(keyFor(next)+':session');}catch{}
    events=[];lastView={key:'',at:0};
  }
  current=next&&!isPreview()?next:null;
  if(timer)clearTimeout(timer);timer=null;
  if(current?.enabled){
    if(!same)try{
      const cached=JSON.parse(localStorage.getItem(keyFor(current))||'null');
      events=cached?.revision===current.revision&&Array.isArray(cached.events)?cached.events.filter((event:any)=>Date.parse(event.occurred_at)>Date.now()-86400000).slice(-200).map(cleanInteraction):[];
    }catch{events=[];}
    if(events.length)schedule();
    if(!same||!previous?.enabled)window.dispatchEvent(new Event('faithhub-usage-ready'));
  }
}
function session(scope:Scope){
  const key=keyFor(scope)+':session';
  let value:any;
  try{value=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  if(!value||!value.id||Date.now()-Number(value.last)>1800000)value={id:crypto.randomUUID(),last:Date.now()};
  value.last=Date.now();try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}
  return value.id;
}
export function recordUsage(input:Omit<Interaction,'id'|'session_id'|'occurred_at'|'version'>,expectedOrg?:string){
  try {
  if(!current?.enabled||isPreview()||document.visibilityState==='hidden')return;
  if(expectedOrg&&expectedOrg!==current.org)return;
  if(input.name==='screen_view'){
    const key=keyFor(current)+':'+input.module;
    if(lastView.key===key&&Date.now()-lastView.at<10000)return;
    lastView={key,at:Date.now()};
  }
  events=events.filter(event=>Date.parse(event.occurred_at)>Date.now()-86400000);
  events.push(cleanInteraction({...input,id:crypto.randomUUID(),session_id:session(current),occurred_at:new Date().toISOString(),version:current.version}));
  if(events.length>200)events=events.slice(-200);
  persist();schedule(events.length>=20?0:3000);
  }catch{/* Optional telemetry never interrupts the member's action. */}
}
export async function flushUsage(){
  if(busy||!current?.enabled||!events.length||!navigator.onLine)return;
  const scope=current, batch=events.slice(0,20);
  busy=true;
  try{
    const headers=await getAuthHeaders();
    if(current!==scope||!headers.Authorization)return;
    // Guard against a token changing before the React authentication state catches up.
    try{
      const payload=JSON.parse(atob(headers.Authorization.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      if(payload.sub!==scope.user)return;
    }catch{return;}
    const response=await fetch(`${API}/intelligence/events`,{method:'POST',headers,keepalive:true,
      body:JSON.stringify({organization_id:scope.org,campus_id:scope.campus,events:batch})});
    if(current!==scope)return;
    if(response.status===202){const ids=new Set(batch.map(event=>event.id));events=events.filter(event=>!ids.has(event.id));failures=0;persist();}
    else if([401,402,403,404].includes(response.status)){
      configureUsage({...scope,enabled:false});
      window.dispatchEvent(new Event('faithhub-usage-refresh'));
    }else if(response.status>=400&&response.status<500&&response.status!==429){const ids=new Set(batch.map(event=>event.id));events=events.filter(event=>!ids.has(event.id));persist();}
    else failures++;
  }catch{failures++;}finally{
    busy=false;
    if(current?.enabled&&events.length)schedule(Math.min(60000,3000*2**Math.min(failures,4)));
  }
}
export async function fetchUsagePreference(org:string,campus:string,signal?:AbortSignal):Promise<UsagePreference>{
  const response=await fetch(`${API}/intelligence/me/usage?organization_id=${encodeURIComponent(org)}&campus_id=${encodeURIComponent(campus)}`,{headers:await getAuthHeaders(),signal});
  if(!response.ok)throw Error('Não foi possível consultar sua preferência.');
  return response.json();
}
export async function changeUsagePreference(org:string,campus:string,allowed:boolean,revision:number):Promise<UsagePreference>{
  const response=await fetch(`${API}/intelligence/me/usage`,{method:'POST',headers:await getAuthHeaders(),body:JSON.stringify({organization_id:org,campus_id:campus,allowed,expected_revision:revision,policy_version:USAGE_POLICY})});
  const data=await response.json();if(!response.ok)throw Error(data.message||'Não foi possível salvar a preferência.');return data;
}
window.addEventListener('online',()=>void flushUsage());
window.addEventListener('pagehide',()=>void flushUsage());
