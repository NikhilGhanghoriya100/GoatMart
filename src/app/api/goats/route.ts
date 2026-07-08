import {NextRequest,NextResponse} from "next/server";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import {getSession} from "@/lib/auth";
export async function GET(req:NextRequest){
  try{
    await connectDB();
    const{searchParams}=new URL(req.url);
    const page=parseInt(searchParams.get("page")||"1");
    const limit=parseInt(searchParams.get("limit")||"12");
    const breed=searchParams.get("breed");
    const status=searchParams.get("status")||"sale";
    const minPrice=searchParams.get("minPrice");
    const maxPrice=searchParams.get("maxPrice");
    const search=searchParams.get("search");
    const seller=searchParams.get("seller");
    const sort=searchParams.get("sort")||"newest";
    const query:Record<string,unknown>={};
    if(breed&&breed!=="All")query.breed=breed;
    if(status!=="all")query.status=status;
    if(seller)query.seller=seller;
    if(minPrice||maxPrice){query.price={};if(minPrice)(query.price as any).$gte=parseInt(minPrice);if(maxPrice)(query.price as any).$lte=parseInt(maxPrice);}
    if(search)query.$text={$search:search};
    const sortMap:Record<string,any>={newest:{createdAt:-1},oldest:{createdAt:1},price_asc:{price:1},price_desc:{price:-1},popular:{views:-1}};
    const total=await Goat.countDocuments(query);
    const goats=await Goat.find(query).sort(sortMap[sort]||{createdAt:-1}).skip((page-1)*limit).limit(limit).lean();
    return NextResponse.json({success:true,data:goats,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});
  }catch(e){console.error(e);return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
export async function POST(req:NextRequest){
  try{
    const session=await getSession();
    if(!session||!["seller","admin"].includes(session.user.role))return NextResponse.json({success:false,error:"Unauthorized"},{status:401});
    await connectDB();
    const body=await req.json();
    const goat=await Goat.create({...body,seller:session.user.id,sellerName:session.user.name,sellerImg:session.user.avatar||""});
    return NextResponse.json({success:true,data:goat},{status:201});
  }catch(e){console.error(e);return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
