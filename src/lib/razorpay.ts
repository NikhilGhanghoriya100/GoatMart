import Razorpay from "razorpay";
import crypto from "crypto";
export const razorpay=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID!,key_secret:process.env.RAZORPAY_KEY_SECRET!});
export async function createRazorpayOrder(amount:number,receipt:string){
  return razorpay.orders.create({amount:amount*100,currency:"INR",receipt,notes:{platform:"GoatMart"}});
}
export function verifyPaymentSignature(razorpayOrderId:string,razorpayPaymentId:string,razorpaySignature:string):boolean{
  const body=razorpayOrderId+"|"+razorpayPaymentId;
  const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET!).update(body).digest("hex");
  return expected===razorpaySignature;
}
