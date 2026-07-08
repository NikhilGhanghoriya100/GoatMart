import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import {getSession} from "@/lib/auth";
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{await connectDB();const{id}=await params;const goat=await Goat.findByIdAndUpdate(id,{$inc:{views:1}},{new:true}).lean();if(!goat)return NextResponse.json({success:false,error:"Not found"},{status:404});return NextResponse.json({success:true,data:goat});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{const session=await getSession();if(!session)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});await connectDB();const{id}=await params;const body=await req.json();const goat=await Goat.findById(id);if(!goat)return NextResponse.json({success:false,error:"Not found"},{status:404});if(goat.seller.toString()!==session.user.id&&session.user.role!=="admin")return NextResponse.json({success:false,error:"Forbidden"},{status:403});const updated=await Goat.findByIdAndUpdate(id,body,{new:true}).lean();return NextResponse.json({success:true,data:updated});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
export async function DELETE(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{const session=await getSession();if(!session)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});await connectDB();const{id}=await params;const goat=await Goat.findById(id);if(!goat)return NextResponse.json({success:false,error:"Not found"},{status:404});if(goat.seller.toString()!==session.user.id&&session.user.role!=="admin")return NextResponse.json({success:false,error:"Forbidden"},{status:403});await goat.deleteOne();return NextResponse.json({success:true,message:"Deleted"});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
