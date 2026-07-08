"use client";
import {useState} from "react";
import Link from "next/link";
import {Heart,Share2} from "lucide-react";
import {useSession} from "next-auth/react";
import {useRouter} from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import ImageGallery from "@/components/ImageGallery";
import {useStore} from "@/store/useStore";
import {fmt} from "@/lib/utils";
import type {Goat} from "@/types";
export default function GoatCard({goat}:{goat:Goat}){
  const{data:session}=useSession();const router=useRouter();const{wishlist,toggleWishlist}=useStore();const[wishLoading,setWishLoading]=useState(false);
  const sold=goat.status==="sold";const inWish=wishlist.includes(goat._id);
  const handleWishlist=async(e:React.MouseEvent)=>{e.preventDefault();e.stopPropagation();if(!session){router.push("/login");return;}setWishLoading(true);try{await axios.post("/api/user/wishlist",{goatId:goat._id});toggleWishlist(goat._id);toast.success(inWish?"Removed from wishlist":"Added to wishlist");}catch{toast.error("Failed");}finally{setWishLoading(false);};};
  const handleShare=async(e:React.MouseEvent)=>{e.preventDefault();e.stopPropagation();const url=`${window.location.origin}/goat/${goat._id}`;try{if(navigator.share)await navigator.share({title:goat.name,url});else{await navigator.clipboard.writeText(url);toast.success("Link copied!");}}catch{}};
  return(
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-200 flex flex-col">
      <div className="relative">
        <Link href={`/goat/${goat._id}`}><ImageGallery images={goat.images.length?goat.images:[""]} breed={goat.breed} height={165} rounded={false}/></Link>
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          <button onClick={handleWishlist} disabled={wishLoading} className="w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow hover:scale-110 transition-transform"><Heart size={13} className={inWish?"fill-red-500 text-red-500":"text-gray-500"}/></button>
          <button onClick={handleShare} className="w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow hover:scale-110 transition-transform"><Share2 size={12} className="text-gray-500"/></button>
        </div>
        <div className="absolute top-2.5 right-2.5 z-10"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans text-white ${sold?"bg-black/80":"bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a]"}`}>{sold?"SOLD":"FOR SALE"}</span></div>
      </div>
      <div className="p-2.5 flex flex-col flex-1">
        <div className="text-[10px] text-[#c8a96e] font-bold tracking-widest uppercase font-sans mb-1">{goat.breed}</div>
        <Link href={`/goat/${goat._id}`} className="text-sm font-bold leading-snug mb-1.5 hover:text-[#8b5e2a] transition-colors font-serif line-clamp-1">{goat.name}</Link>
        <div className="flex gap-1.5 flex-wrap mb-2">
          <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full font-sans">⚖️ {goat.weight}kg</span>
          <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full font-sans">📅 {goat.age}</span>
          {goat.vaccinated&&<span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-sans">💉 Vaccinated</span>}
        </div>
        <div className="text-lg font-bold font-serif mb-2.5 mt-auto">{fmt(goat.price)}</div>
        <Link href={`/goat/${goat._id}`} className={`block w-full py-2 rounded-xl text-center text-xs font-bold font-sans transition-opacity ${sold?"bg-gray-100 text-gray-400 pointer-events-none":"bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white hover:opacity-90"}`}>{sold?"Sold Out":"View Details"}</Link>
      </div>
    </div>
  );
}
