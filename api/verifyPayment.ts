import { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "o3jrSQSUAf9CA9kg4MdWcAyz")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const orderRef = doc(db, "orders", order_id);
    await updateDoc(orderRef, {
      status: "paid",
      razorpay_payment_id,
      updated_at: serverTimestamp()
    });

    const orderDoc = await getDoc(orderRef);
    const projectRef = doc(db, "projects", orderDoc.data()!.project_id);
    const projectDoc = await getDoc(projectRef);

    return res.status(200).json({
      success: true,
      order_id,
      project_title: projectDoc.data()!.title,
      download_url: projectDoc.data()!.download_url
    });
  } catch (error: any) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
