import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import {getSession} from "@/lib/auth";
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{const session=await getSession();if(!session||session.user.role!=="admin")return NextResponse.json({success:false,error:"Admin only"},{status:403});await connectDB();const{id}=await params;const{status}=await req.json();if(!["approved","suspended","pending"].includes(status))return NextResponse.json({success:false,error:"Invalid status"},{status:400});const seller=await User.findByIdAndUpdate(id,{"sellerProfile.status":status},{new:true}).select("-password");if(!seller)return NextResponse.json({success:false,error:"Not found"},{status:404});return NextResponse.json({success:true,data:seller,message:`Seller ${status}`});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
