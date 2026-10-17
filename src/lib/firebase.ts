import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCFl74tWEF9qDKKmKAvc8asAXrhjMCzCBk',
  authDomain: 'rahoa-autht.firebaseapp.com',
  projectId: 'rahoa-autht',
  storageBucket: 'rahoa-autht.firebasestorage.app',
  messagingSenderId: '891159262144',
  appId: '1:891159262144:web:8b60f25016d2de39a40e25',
  measurementId: 'G-S8CSSJPNHS',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export { app };
