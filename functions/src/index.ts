import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

// Initialize Razorpay (store these in Firebase environment config or Secret Manager)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_SojdpFjfALNMvp",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "o3jrSQSUAf9CA9kg4MdWcAyz",
});

export const createOrder = functions.https.onCall(async (request: any) => {
  const data = request.data || request;
  const { project_id, buyer_email, buyer_name, buyer_phone } = data;

  try {
    // 1. Fetch project price
    const projectDoc = await db.collection("projects").doc(project_id).get();
    if (!projectDoc.exists) throw new functions.https.HttpsError("not-found", "Project not found");
    
    const project = projectDoc.data();
    const amount = project!.price * 100; // Razorpay expects paise

    // 2. Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    // 3. Save pending order in Firestore
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

    return {
      order_id: orderRef.id,
      razorpay_order_id: order.id,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_SojdpFjfALNMvp",
      amount,
      currency: "INR",
      project_title: project!.title
    };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const verifyPayment = functions.https.onCall(async (request: any) => {
  const data = request.data || request;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = data;

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "o3jrSQSUAf9CA9kg4MdWcAyz")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid signature");
    }

    // Payment is valid, update order status
    await db.collection("orders").doc(order_id).update({
      status: "paid",
      razorpay_payment_id,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get the download URL for the project
    const orderDoc = await db.collection("orders").doc(order_id).get();
    const projectDoc = await db.collection("projects").doc(orderDoc.data()!.project_id).get();

    return {
      success: true,
      order_id,
      project_title: projectDoc.data()!.title,
      download_url: projectDoc.data()!.download_url
    };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
