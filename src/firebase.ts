import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error('[v0] Invalid Firebase configuration. Please check firebase-applet-config.json');
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Enable persistence for auth state
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('[v0] Failed to set auth persistence:', error);
});

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[v0] Firebase connection successful');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("[v0] Firebase offline: Please check your internet connection or Firebase configuration.");
      } else if (error.message.includes('permission')) {
        console.warn("[v0] Firebase permissions issue - this is normal on first login before RLS rules are set.");
      } else {
        console.error('[v0] Firebase connection error:', error.message);
      }
    }
  }
}
testConnection();
