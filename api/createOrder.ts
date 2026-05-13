import { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { db } from './firebase-admin';
import * as admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { project_id, buyer_email, buyer_name, buyer_phone } = req.body;

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_SojdpFjfALNMvp",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "o3jrSQSUAf9CA9kg4MdWcAyz",
    });

    const projectDoc = await db.collection("projects").doc(project_id).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
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
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      order_id: orderRef.id,
      razorpay_order_id: order.id,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_SojdpFjfALNMvp",
      amount,
      currency: "INR",
      project_title: project!.title
    });
  } catch (error: any) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
