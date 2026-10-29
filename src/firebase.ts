import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyB5lET_WwD6gumlXD8eYFo9SV2-e8F6GFs",
  authDomain: "detabase-f6c7f.firebaseapp.com",
  projectId: "detabase-f6c7f",
  storageBucket: "detabase-f6c7f.firebasestorage.app",
  messagingSenderId: "255014424820",
  appId: "1:255014424820:web:1094016dd7168660540ea1",
  measurementId: "G-R1JLN6367Y"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
