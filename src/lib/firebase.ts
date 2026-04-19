import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

// Connection test
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'settings', 'config'));
    console.log("Firebase connection established successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase is offline. Check configuration.");
    } else {
      console.error("Firebase connection error:", error);
    }
  }
}
