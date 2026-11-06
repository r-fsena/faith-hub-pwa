import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {useAuth} from './AuthContext';
import {useBranding} from './BrandingContext';
import {useFeatureFlags} from './FeatureFlagContext';
import {getActiveCampusId} from '../services/api';
import {changeUsagePreference,configureUsage,fetchUsagePreference,recordUsage,locallyBlocked,setLocalUsageBlock,type UsagePreference} from '../services/usageTelemetry';

interface UsageState{preference:UsagePreference|null;loading:boolean;error:string;visible:boolean;pendingWithdrawal:boolean;choose:(allowed:boolean)=>Promise<void>;refresh:()=>void;}
const UsageContext=createContext<UsageState>({preference:null,loading:false,error:'',visible:false,pendingWithdrawal:false,choose:async()=>{},refresh:()=>{}});
export function UsageProvider({children}:{children:React.ReactNode}){
  const {user,isAuthenticated}=useAuth(),{branding}=useBranding(),{isFeatureEnabled,isLoading:flagsLoading}=useFeatureFlags();
  const enabled=isFeatureEnabled('intelligence.usage_collection',false);
  const [campus,setCampus]=useState(getActiveCampusId),[preference,setPreference]=useState<UsagePreference|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [pendingWithdrawal,setPendingWithdrawal]=useState(false);
  const org=branding.organization_id||'',owner=`${org}:${user?.userId||''}:${campus}`;
  const currentOwner=useRef(owner),request=useRef(0),[loadedOwner,setLoadedOwner]=useState('');
  currentOwner.current=owner;
  useEffect(()=>{
    const change=()=>setCampus(getActiveCampusId());window.addEventListener('pwa-campus-changed',change);
    return()=>window.removeEventListener('pwa-campus-changed',change);
  },[]);
  const refresh=useCallback(async()=>{
    if(!isAuthenticated||!user||!org||flagsLoading)return;
    const thisOwner=owner,id=++request.current;
    setLoading(true);setError('');
    try{
      const data=await fetchUsagePreference(org,campus);
      if(currentOwner.current===thisOwner&&request.current===id){setPreference(data);setLoadedOwner(thisOwner);setPendingWithdrawal(data.allowed&&locallyBlocked(org,user.userId));}
    }catch(e){if(currentOwner.current===thisOwner&&request.current===id)setError((e as Error).message);}
    finally{if(currentOwner.current===thisOwner&&request.current===id)setLoading(false);}
  },[owner,org,campus,isAuthenticated,user?.userId,flagsLoading]);
  useEffect(()=>{
    setPreference(null);setLoadedOwner('');setError('');setPendingWithdrawal(false);configureUsage(null);
    if(isAuthenticated&&!flagsLoading)void refresh();
    return()=>{request.current++;configureUsage(null);};
  },[owner,isAuthenticated,flagsLoading]);
  useEffect(()=>{
    if(!isAuthenticated||!user||loadedOwner!==owner){configureUsage(null);return;}
    const version=new URLSearchParams(location.search).get('v')==='1'||!isFeatureEnabled('pwa.v2_experience',true)?'v1':'v2';
    configureUsage({org,user:user.userId,campus,version,revision:preference?.revision||0,enabled:enabled&&!!preference?.collection_enabled&&!!preference?.eligible&&!!preference?.allowed});
  },[owner,loadedOwner,user?.userId,isAuthenticated,enabled,preference,isFeatureEnabled]);
  useEffect(()=>{
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    const changed=()=>void refresh();
    const storageChanged=(event:StorageEvent)=>{
      if(user&&event.key===`faithhub_usage_block_v1:${org}:${user.userId}`){configureUsage(null);void refresh();}
    };
    document.addEventListener('visibilitychange',visible);window.addEventListener('faithhub-usage-refresh',changed);
    window.addEventListener('storage',storageChanged);
    const interval=setInterval(visible,60000);
    return()=>{document.removeEventListener('visibilitychange',visible);window.removeEventListener('faithhub-usage-refresh',changed);window.removeEventListener('storage',storageChanged);clearInterval(interval);};
  },[refresh]);
  const choose=async(allowed:boolean)=>{
    if(!user||loadedOwner!==owner||!preference)return;
    const thisOwner=owner;
    setLoading(true);setError('');
    // Stop local collection immediately on withdrawal; the server also invalidates queued messages.
    if(!allowed){setLocalUsageBlock(org,user.userId,true);setPendingWithdrawal(true);}
    try{
      const data=await changeUsagePreference(org,campus,allowed,preference.revision);
      if(currentOwner.current===thisOwner){
        if(allowed)setLocalUsageBlock(org,user.userId,false);
        setPendingWithdrawal(false);setPreference({...data,collection_enabled:enabled});
      }
    }catch(e){if(currentOwner.current===thisOwner)setError((e as Error).message);throw e;}
    finally{if(currentOwner.current===thisOwner)setLoading(false);}
  };
  return <UsageContext.Provider value={{preference:loadedOwner===owner?preference:null,loading,error,pendingWithdrawal:loadedOwner===owner&&pendingWithdrawal,visible:isAuthenticated&&(enabled||(loadedOwner===owner&&!!preference?.allowed)),choose,refresh:()=>void refresh()}}>{children}</UsageContext.Provider>;
}
export const useUsage=()=>useContext(UsageContext);
export function useUsageScreen(screen:string,version:'v1'|'v2'){
  const {preference}=useUsage();
  const {isAuthenticated}=useAuth();
  useEffect(()=>{
    if(!isAuthenticated||!preference?.allowed)return;
    const track=()=>recordUsage({name:'screen_view',module:screen});
    track();document.addEventListener('visibilitychange',track);window.addEventListener('faithhub-usage-ready',track);
    return()=>{document.removeEventListener('visibilitychange',track);window.removeEventListener('faithhub-usage-ready',track);};
  },[screen,version,isAuthenticated,preference?.allowed,preference?.revision]);
}
