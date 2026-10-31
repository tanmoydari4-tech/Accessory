import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyB5lET_WwD6gumlXD8eYFo9SV2-e8F6GFs",
  authDomain: "detabase-f6c7f.firebaseapp.com",
  projectId: "detabase-f6c7f",
  storageBucket: "detabase-f6c7f.firebasestorage.app",
  messagingSenderId: "255014424820",
  appId: "1:255014424820:web:1094016dd7168660540ea1",
  measurementId: "G-R1JLN6367Y"
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
  db = getFirestore(app);
  storage = getStorage(app);
} catch (err) {
  console.warn('Firebase initialization fallback active:', err);
}

export { app, auth, googleProvider, db, storage };
