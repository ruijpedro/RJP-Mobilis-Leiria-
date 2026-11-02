// Configuration is public; no credentials or private keys belong in this file.
import {initializeApp} from 'firebase/app';
import {getAuth,signInAnonymously} from 'firebase/auth';
import {getFunctions,httpsCallable} from 'firebase/functions';
import {initializeAppCheck,ReCaptchaEnterpriseProvider} from 'firebase/app-check';
import {firebaseConfig as config} from './firebaseConfig.js';
const env=import.meta.env;
export const crowdConfigured=Boolean(config.apiKey&&config.authDomain&&config.projectId&&config.appId);
let app,auth,functions;
export async function submitObservedPassage({stop,line,direction,lat,lon}){
 if(!crowdConfigured)throw new Error('Registos comunitários ainda não configurados no Firebase.');
 if(!app){app=initializeApp(config);auth=getAuth(app);functions=getFunctions(app,env.VITE_FIREBASE_FUNCTIONS_REGION||'europe-west1');if(env.VITE_FIREBASE_APPCHECK_SITE_KEY){initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(env.VITE_FIREBASE_APPCHECK_SITE_KEY),isTokenAutoRefreshEnabled:true})}}
 if(!auth.currentUser)await signInAnonymously(auth);
 const call=httpsCallable(functions,'submitObservedPassage');const r=await call({stopId:stop.stop_id,line,direction,latitude:lat,longitude:lon});return r.data;
}
