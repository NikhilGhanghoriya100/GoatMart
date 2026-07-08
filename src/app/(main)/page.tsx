import HeroBanner from "@/components/HeroBanner";
import CategoryStrip from "@/components/CategoryStrip";
import GoatGrid from "@/components/GoatGrid";
import WhySection from "@/components/WhySection";
import StatsStrip from "@/components/StatsStrip";
import SellerCTA from "@/components/SellerCTA";
import connectDB from "@/lib/db";
import GoatModel from "@/models/Goat";
import type {Goat} from "@/types";
async function getFeaturedGoats():Promise<Goat[]>{
  try{await connectDB();const goats=await GoatModel.find({status:"sale"}).sort({createdAt:-1}).limit(8).lean();return JSON.parse(JSON.stringify(goats));}
  catch{return[];}
}
export default async function HomePage(){
  const featuredGoats=await getFeaturedGoats();
  return(<><HeroBanner/><div className="max-w-[1280px] mx-auto px-3 py-7"><h2 className="text-3xl font-bold tracking-tight font-serif mb-5">Categories</h2><CategoryStrip/></div><div className="max-w-[1280px] mx-auto px-3 pb-14"><div className="flex items-center justify-between mb-5"><h2 className="text-3xl font-bold tracking-tight font-serif">Premium Listings</h2><a href="/shop" className="text-sm font-semibold text-[#c8a96e] border border-[#c8a96e] rounded-full px-4 py-2 hover:bg-[#c8a96e10] transition-colors font-sans">View All →</a></div><GoatGrid goats={featuredGoats}/></div><WhySection/><StatsStrip/></>);
}
