import { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';
import { db } from './firebase-admin';
import * as admin from 'firebase-admin';

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

    await db.collection("orders").doc(order_id).update({
      status: "paid",
      razorpay_payment_id,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const orderDoc = await db.collection("orders").doc(order_id).get();
    const projectDoc = await db.collection("projects").doc(orderDoc.data()!.project_id).get();

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
