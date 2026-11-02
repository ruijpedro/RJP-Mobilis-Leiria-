// Firebase Web configuration (public identifiers, not server credentials).
// Override with VITE_FIREBASE_* variables for another environment.
const defaults = {
  apiKey: 'AIzaSyByIUiAKU8LFFnFYrwRP7Sln_UiGjS7Wnw',
  authDomain: 'rjp-mobilis-leiria.firebaseapp.com',
  projectId: 'rjp-mobilis-leiria',
  storageBucket: 'rjp-mobilis-leiria.firebasestorage.app',
  messagingSenderId: '368486698698',
  appId: '1:368486698698:web:24d6ddae37c5203aa2ee33',
  measurementId: 'G-0E8D6LQXK5'
};
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaults.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaults.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaults.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaults.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaults.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaults.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaults.measurementId
};
