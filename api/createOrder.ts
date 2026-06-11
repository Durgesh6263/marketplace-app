import { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin if it hasn't been already
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error in createOrder:', error);
  }
}

const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { project_id, buyer_email, buyer_name, buyer_phone } = req.body || {};
    
    if (!project_id || !buyer_email) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_SojdpFjfALNMvp",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "o3jrSQSUAf9CA9kg4MdWcAyz",
    });

    const projectRef = db.collection("projects").doc(project_id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const project = projectDoc.data();
    const amount = project!.price * 100;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    const orderRef = await db.collection("orders").add({
      project_id,
      project_title: project!.title,
      buyer_email,
      buyer_name,
      buyer_phone,
      amount: project!.price,
      status: "pending",
      razorpay_order_id: order.id,
      seller_id: project!.seller_id || "admin",
      created_at: FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      success: true,
      message: "Payment order created",
      data: {
        order_id: orderRef.id,
        razorpay_order_id: order.id,
        razorpay_key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_SojdpFjfALNMvp",
        amount,
        currency: "INR",
        project_title: project!.title
      }
    });
  } catch (error: any) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
}
