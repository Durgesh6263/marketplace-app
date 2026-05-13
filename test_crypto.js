const crypto = require('crypto');
const body = "order_id" + "|" + "payment_id";
const expectedSignature = crypto
  .createHmac("sha256", "secret")
  .update(body.toString())
  .digest("hex");
console.log(expectedSignature);
