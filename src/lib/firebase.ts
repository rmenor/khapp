
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: 'finanzas-jw',
  appId: '1:857727640897:web:5ed8d3d20e9b2452afadc0',
  storageBucket: 'finanzas-jw.firebasestorage.app',
  apiKey: 'AIzaSyBW7N7R4YGnIArQNL_5Onewntgq25RKnVo',
  authDomain: 'finanzas-jw.firebaseapp.com',
  messagingSenderId: '857727640897',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);


export { app, db };
