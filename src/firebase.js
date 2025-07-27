import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAVA6ClWm3ZepoeZuyFbBMsKBGsGjKj75Q",
  authDomain: "erolledph.firebaseapp.com",
  projectId: "erolledph",
  storageBucket: "erolledph.firebasestorage.app",
  messagingSenderId: "1003557516267",
  appId: "1:1003557516267:web:746a425d5bc15967d1dfae"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;