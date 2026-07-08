import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import {getSession} from "@/lib/auth";
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{const session=await getSession();if(!session)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});await connectDB();const{id}=await params;const chat=await Chat.findById(id).lean();if(!chat)return NextResponse.json({success:false,error:"Not found"},{status:404});return NextResponse.json({success:true,data:chat});}catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await getSession();
    if(!session)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});
    await connectDB();
    const{id}=await params;
    const{text}=await req.json();
    if(!text?.trim())return NextResponse.json({success:false,error:"Message required"},{status:400});
    const chat=await Chat.findById(id);
    if(!chat)return NextResponse.json({success:false,error:"Chat not found"},{status:404});
    const message={from:session.user.id as any,fromName:session.user.name,fromRole:session.user.role as "customer"|"seller"|"admin",text:text.trim(),read:false};
    chat.messages.push(message as any);
    chat.lastMessage=text.trim();
    chat.lastMessageAt=new Date();
    if(session.user.role==="customer")chat.unreadCount.seller+=1;
    else chat.unreadCount.customer+=1;
    await chat.save();
    const newMsg=chat.messages[chat.messages.length-1];
    return NextResponse.json({success:true,data:newMsg});
  }catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
