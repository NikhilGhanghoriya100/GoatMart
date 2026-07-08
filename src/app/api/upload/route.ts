import {NextRequest,NextResponse} from "next/server";
import {uploadImage,uploadVideo} from "@/lib/cloudinary";
import {getSession} from "@/lib/auth";
export async function POST(req:NextRequest){
  try{
    const session=await getSession();
    if(!session||!["seller","admin"].includes(session.user.role))return NextResponse.json({success:false,error:"Unauthorized"},{status:401});
    const formData=await req.formData();
    const file=formData.get("file") as File;
    const type=(formData.get("type") as string)||"image";
    if(!file)return NextResponse.json({success:false,error:"No file provided"},{status:400});
    const bytes=await file.arrayBuffer();
    const buffer=Buffer.from(bytes);
    const base64=`data:${file.type};base64,${buffer.toString("base64")}`;
    const result=type==="video"?await uploadVideo(base64):await uploadImage(base64);
    return NextResponse.json({success:true,data:result});
  }catch(e){console.error(e);return NextResponse.json({success:false,error:"Upload failed"},{status:500});}
}
