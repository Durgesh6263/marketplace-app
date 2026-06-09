import { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';
import admin from 'firebase-admin';
import { db } from './firebase-admin';

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

    const orderRef = db.collection("orders").doc(order_id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }
    const orderData = orderDoc.data();

    const projectRef = db.collection("projects").doc(orderData!.project_id);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }
    const projectData = projectDoc.data();

    // Compute commission split: 40% seller, 60% platform
    const price = orderData!.amount || projectData?.price || 0;
    const seller_id = projectData?.seller_id || "admin";
    const seller_earning = price * 0.4;
    const platform_earning = price * 0.6;

    // Update order with paid state and earnings details
    await orderRef.update({
      status: "paid",
      razorpay_payment_id,
      seller_id,
      seller_earning,
      platform_earning,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Increment sales count on the project
    const currentSales = projectData?.total_sales || 0;
    await projectRef.update({
      total_sales: currentSales + 1,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Write a notification for the seller
    if (seller_id && seller_id !== "admin") {
      try {
        await db.collection("seller_notifications").add({
          seller_id,
          title: "Project Sold! 💰",
          message: `Great news! Your project "${projectData?.title || "Unknown"}" has been purchased. You earned ₹${seller_earning.toLocaleString()}.`,
          type: "sold",
          read: false,
          project_id: orderData!.project_id,
          project_title: projectData?.title || "Unknown Project",
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.error("Error creating seller notification:", err);
      }
    }

    return res.status(200).json({
      success: true,
      order_id,
      project_title: projectData?.title || "Project",
      download_url: projectData?.download_url || ""
    });
  } catch (error: any) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
