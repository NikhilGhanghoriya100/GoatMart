import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import {getSession} from "@/lib/auth";
export async function GET(req:NextRequest){
  try{const session=await getSession();if(!session||session.user.role!=="admin")return NextResponse.json({success:false,error:"Admin only"},{status:403});await connectDB();const{searchParams}=new URL(req.url);const status=searchParams.get("status");const query:Record<string,unknown>={role:"seller"};if(status)query["sellerProfile.status"]=status;const sellers=await User.find(query).select("-password").sort({createdAt:-1}).lean();return NextResponse.json({success:true,data:sellers});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
