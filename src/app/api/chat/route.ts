import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import Goat from "@/models/Goat";
import {getSession} from "@/lib/auth";
export async function GET(){
  try{const session=await getSession();if(!session)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});await connectDB();const query=session.user.role==="seller"?{seller:session.user.id}:session.user.role==="admin"?{}:{customer:session.user.id};const chats=await Chat.find(query).sort({lastMessageAt:-1}).select("-messages").lean();return NextResponse.json({success:true,data:chats});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
export async function POST(req:NextRequest){
  try{
    const session=await getSession();
    if(!session)return NextResponse.json({success:false,error:"Login required"},{status:401});
    await connectDB();
    const{goatId}=await req.json();
    const goat=await Goat.findById(goatId).populate("seller","name");
    if(!goat)return NextResponse.json({success:false,error:"Goat not found"},{status:404});
    let chat=await Chat.findOne({goat:goatId,customer:session.user.id});
    if(!chat)chat=await Chat.create({goat:goatId,goatName:goat.name,goatImage:goat.images[0]||"",customer:session.user.id,customerName:session.user.name,seller:(goat.seller as any)._id,sellerName:goat.sellerName,messages:[],unreadCount:{customer:0,seller:0}});
    return NextResponse.json({success:true,data:chat});
  }catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
