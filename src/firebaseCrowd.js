import {initializeApp,getApps,getApp} from 'firebase/app';
import {getAuth,signInAnonymously} from 'firebase/auth';
import {getFunctions,httpsCallable} from 'firebase/functions';
import {initializeAppCheck,ReCaptchaEnterpriseProvider,getToken} from 'firebase/app-check';
import {firebaseConfig as config} from './firebaseConfig.js';

// The site key is public. Do not add service account credentials here.
export const APPCHECK_SITE_KEY=import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || '6Le4Eg0uAAAAAN9dv6NI81aTf2LL85yDot127NdH';
const isNative=()=>typeof window!=='undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
export const crowdConfigured=Boolean(config.apiKey&&config.authDomain&&config.projectId&&config.appId&&APPCHECK_SITE_KEY);
export const crowdAvailable=()=>crowdConfigured&&!isNative();
let servicesPromise;
async function getServices(){
 if(!crowdConfigured)throw new Error('Firebase ou App Check por configurar.');
 if(isNative())throw new Error('Registos comunitários na APK pendentes de App Check nativo (Play Integrity). Os horários e o mapa continuam disponíveis.');
 if(!servicesPromise){
  servicesPromise=(async()=>{
   const app=getApps().length?getApp():initializeApp(config);
   const check=initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(APPCHECK_SITE_KEY),isTokenAutoRefreshEnabled:true});
   const auth=getAuth(app);
   const functions=getFunctions(app,import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION||'europe-west1');
   return {auth,functions,check};
  })().catch(e=>{servicesPromise=undefined;throw e});
 }
 return servicesPromise;
}
export async function testCommunityConnection(){
 const {auth,check}=await getServices();
 if(!auth.currentUser)await signInAnonymously(auth);
 const token=await getToken(check,false);
 if(!token?.token)throw new Error('O App Check não devolveu um token válido.');
 return {authenticated:true,appCheck:true};
}
export async function submitObservedPassage({stop,line,direction='',lat,lon}){
 const {functions}=await getServices();
 await testCommunityConnection();
 const call=httpsCallable(functions,'submitObservedPassage');
 const result=await call({stopId:stop.stop_id,line,direction,latitude:lat,longitude:lon});
 return result.data;
}
