import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import Order from "@/models/Order";
import {getSession} from "@/lib/auth";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await getSession();
    if(!session)return NextResponse.json({success:false,error:"Login required"},{status:401});
    await connectDB();
    const{id}=await params;
    const{rating,text}=await req.json();
    if(!rating||!text)return NextResponse.json({success:false,error:"Rating and text required"},{status:400});
    const order=await Order.findOne({goat:id,customer:session.user.id,status:"delivered"});
    if(!order)return NextResponse.json({success:false,error:"Purchase required to review"},{status:403});
    const goat=await Goat.findById(id);
    if(!goat)return NextResponse.json({success:false,error:"Not found"},{status:404});
    const already=goat.reviews.some(r=>r.user.toString()===session.user.id);
    if(already)return NextResponse.json({success:false,error:"Already reviewed"},{status:409});
    goat.reviews.push({user:session.user.id as any,userName:session.user.name,userAvatar:session.user.avatar||"",rating,text,createdAt:new Date()});
    const total=goat.reviews.reduce((a,r)=>a+r.rating,0);
    goat.averageRating=Math.round(total/goat.reviews.length*10)/10;
    goat.totalReviews=goat.reviews.length;
    await goat.save();
    await Order.findByIdAndUpdate(order._id,{reviewed:true});
    return NextResponse.json({success:true,message:"Review submitted!"});
  }catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
