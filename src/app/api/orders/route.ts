import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Goat from "@/models/Goat";
import {createRazorpayOrder} from "@/lib/razorpay";
import {getSession} from "@/lib/auth";
export async function GET(){
  try{const session=await getSession();if(!session)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});await connectDB();const query=session.user.role==="seller"?{seller:session.user.id}:session.user.role==="admin"?{}:{customer:session.user.id};const orders=await Order.find(query).sort({createdAt:-1}).lean();return NextResponse.json({success:true,data:orders});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
export async function POST(req:NextRequest){
  try{
    const session=await getSession();
    if(!session)return NextResponse.json({success:false,error:"Login required"},{status:401});
    await connectDB();
    const{goatId,delivery}=await req.json();
    const goat=await Goat.findById(goatId).populate("seller","name");
    if(!goat)return NextResponse.json({success:false,error:"Goat not found"},{status:404});
    if(goat.status!=="sale")return NextResponse.json({success:false,error:"Goat not available"},{status:400});
    const rzpOrder=await createRazorpayOrder(goat.price,`goat_${goatId}`);
    const order=await Order.create({goat:goatId,goatName:goat.name,goatBreed:goat.breed,goatImage:goat.images[0]||"",seller:(goat.seller as any)._id,sellerName:goat.sellerName,customer:session.user.id,customerName:session.user.name,amount:goat.price,status:"pending",payment:{razorpayOrderId:rzpOrder.id,status:"pending"},delivery,timeline:[{s:"Order Placed",d:new Date().toLocaleDateString("en-IN",{month:"short",day:"numeric"}),done:true},{s:"Payment Confirmed",d:"",done:false},{s:"Dispatched",d:"",done:false},{s:"Out for Delivery",d:"",done:false},{s:"Delivered",d:"",done:false}]});
    await Goat.findByIdAndUpdate(goatId,{status:"reserved"});
    return NextResponse.json({success:true,data:{orderId:order._id,razorpayOrderId:rzpOrder.id,amount:goat.price,keyId:process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}});
  }catch(e){console.error(e);return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
