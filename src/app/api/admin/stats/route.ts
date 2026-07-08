import {NextResponse} from "next/server";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import Order from "@/models/Order";
import User from "@/models/User";
import {getSession} from "@/lib/auth";
export async function GET(){
  try{
    const session=await getSession();
    if(!session||session.user.role!=="admin")return NextResponse.json({success:false,error:"Admin only"},{status:403});
    await connectDB();
    const[totalGoats,activeGoats,soldGoats,totalOrders,deliveredOrders,totalCustomers,totalSellers,pendingSellers,revenueData]=await Promise.all([Goat.countDocuments(),Goat.countDocuments({status:"sale"}),Goat.countDocuments({status:"sold"}),Order.countDocuments(),Order.countDocuments({status:"delivered"}),User.countDocuments({role:"customer"}),User.countDocuments({role:"seller"}),User.countDocuments({role:"seller","sellerProfile.status":"pending"}),Order.aggregate([{$match:{"payment.status":"paid"}},{$group:{_id:null,total:{$sum:"$amount"}}}])]);
    return NextResponse.json({success:true,data:{totalGoats,activeGoats,soldGoats,totalOrders,deliveredOrders,totalCustomers,totalSellers,pendingSellers,totalRevenue:revenueData[0]?.total||0}});
  }catch{return NextResponse.json({success:false,error:"Server error"},{status:500});}
}
