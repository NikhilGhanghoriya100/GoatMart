import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import {z} from "zod";
const schema=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(6),phone:z.string().optional(),role:z.enum(["customer","seller"]).default("customer"),farmName:z.string().optional(),farmLocation:z.string().optional()});
export async function POST(req:NextRequest){
  try{
    await connectDB();
    const body=await req.json();
    const parsed=schema.safeParse(body);
    if(!parsed.success)return NextResponse.json({success:false,error:parsed.error.errors[0].message},{status:400});
    const{name,email,password,phone,role,farmName,farmLocation}=parsed.data;
    const existing=await User.findOne({email});
    if(existing)return NextResponse.json({success:false,error:"Email already registered"},{status:409});
    const userData:Record<string,unknown>={name,email,password,phone,role};
    if(role==="seller")userData.sellerProfile={farmName:farmName||name+"'s Farm",description:"",location:farmLocation||"",status:"pending",rating:0,totalReviews:0,totalSales:0,joinedAt:new Date()};
    const user=await User.create(userData);
    return NextResponse.json({success:true,message:role==="seller"?"Seller application submitted. Admin will review within 24-48 hours.":"Account created successfully!",user:{id:user._id,email:user.email,name:user.name,role:user.role}},{status:201});
  }catch(error){console.error(error);return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
