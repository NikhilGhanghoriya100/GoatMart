import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Goat from "@/models/Goat";
import {verifyPaymentSignature} from "@/lib/razorpay";
import {getSession} from "@/lib/auth";
export async function POST(req:NextRequest){
  try{
    const session=await getSession();
    if(!session)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});
    await connectDB();
    const{orderId,razorpayOrderId,razorpayPaymentId,razorpaySignature}=await req.json();
    const isValid=verifyPaymentSignature(razorpayOrderId,razorpayPaymentId,razorpaySignature);
    if(!isValid)return NextResponse.json({success:false,error:"Invalid payment signature"},{status:400});
    const order=await Order.findById(orderId);
    if(!order)return NextResponse.json({success:false,error:"Order not found"},{status:404});
    const now=new Date();
    const dateStr=now.toLocaleDateString("en-IN",{month:"short",day:"numeric"});
    order.status="payment_confirmed";
    order.payment.razorpayPaymentId=razorpayPaymentId;
    order.payment.razorpaySignature=razorpaySignature;
    order.payment.status="paid";
    order.payment.paidAt=now;
    order.timeline[1]={s:"Payment Confirmed",d:dateStr,done:true};
    await order.save();
    await Goat.findByIdAndUpdate(order.goat,{status:"sold"});
    return NextResponse.json({success:true,message:"Payment verified",data:{orderId:order.orderId}});
  }catch(e){console.error(e);return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
