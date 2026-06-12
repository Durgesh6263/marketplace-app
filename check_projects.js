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

async function checkProjects() {
  const snapshot = await db.collection('projects').get();
  console.log(`Found ${snapshot.size} projects in total.`);
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}, title: ${data.title}, status: ${data.status}, seller_id: ${data.seller_id}`);
  });
}

checkProjects().catch(console.error);
