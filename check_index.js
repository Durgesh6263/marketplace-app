import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkIndex() {
  try {
    const snapshot = await db.collection('projects')
      .where("seller_id", "==", "ry1zb9FXo0cCfm4sZYMxhnXvHdo2")
      .orderBy("created_at", "desc")
      .get();
    console.log(`Query succeeded! Found ${snapshot.size} projects.`);
  } catch (err) {
    console.error("Query failed:", err.message);
  }
}

checkIndex().catch(console.error);
