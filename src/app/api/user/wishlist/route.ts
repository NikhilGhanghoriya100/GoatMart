import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Goat from "@/models/Goat";
import {getSession} from "@/lib/auth";
import mongoose from "mongoose";
export async function GET(){try{const session=await getSession();if(!session)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});await connectDB();const user=await User.findById(session.user.id).select("wishlist");const goats=await Goat.find({_id:{$in:user?.wishlist||[]}}).lean();return NextResponse.json({success:true,data:goats});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}}
export async function POST(req:NextRequest){try{const session=await getSession();if(!session)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});await connectDB();const{goatId}=await req.json();const user=await User.findById(session.user.id);if(!user)return NextResponse.json({success:false,error:"Not found"},{status:404});const id=new mongoose.Types.ObjectId(goatId);const idx=user.wishlist.findIndex(w=>w.toString()===goatId);if(idx>-1){user.wishlist.splice(idx,1);await Goat.findByIdAndUpdate(goatId,{$inc:{wishlistCount:-1}});}else{user.wishlist.push(id);await Goat.findByIdAndUpdate(goatId,{$inc:{wishlistCount:1}});}await user.save();return NextResponse.json({success:true,inWishlist:idx===-1});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}}
