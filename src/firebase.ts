import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Enable persistence to keep users logged in
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('[v0] Persistence setup warning:', error);
});

// Log Firebase initialization
console.log('[v0] Firebase initialized with project:', firebaseConfig.projectId);
console.log('[v0] Auth domain:', firebaseConfig.authDomain);

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("[v0] Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();
