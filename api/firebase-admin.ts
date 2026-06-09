import admin from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been already
if (!admin || !admin.apps || !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.log('Firebase admin initialization error', error?.stack || error);
  }
}

export const db = admin.firestore();
