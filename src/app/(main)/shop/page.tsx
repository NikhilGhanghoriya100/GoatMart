"use client";
import {useState} from "react";
import CategoryStrip from "@/components/CategoryStrip";
import GoatGrid from "@/components/GoatGrid";
import {useGoats} from "@/hooks/useGoats";
import {useStore} from "@/store/useStore";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
export default function ShopPage(){
  const{selectedBreed,priceRange,searchQuery}=useStore();
  const{goats,loading,page,setPage,totalPages}=useGoats({breed:selectedBreed,search:searchQuery,status:"all",...(priceRange?{minPrice:String(priceRange.min),maxPrice:String(priceRange.max)}:{})} as any);
  return(<div className="max-w-[1280px] mx-auto px-4 sm:px-5 py-8"><div className="flex items-center gap-3 mb-6"><Link href="/" className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors"><ArrowLeft size={16}/></Link><h1 className="flex-1 text-center text-2xl font-bold font-serif">Shop</h1><div className="w-9"/></div><div className="mb-6"><CategoryStrip/></div><p className="text-sm text-gray-400 font-sans mb-4">{loading?"Loading…":`${goats.length} goats found`}</p><GoatGrid goats={goats} loading={loading}/>{totalPages>1&&(<div className="flex items-center justify-center gap-3 mt-10"><button disabled={page===1} onClick={()=>setPage(page-1)} className="px-4 py-2 rounded-full border border-gray-200 text-sm font-sans disabled:opacity-40 hover:border-[#c8a96e] transition-colors">← Prev</button><span className="text-sm font-sans text-gray-500">Page {page} of {totalPages}</span><button disabled={page===totalPages} onClick={()=>setPage(page+1)} className="px-4 py-2 rounded-full border border-gray-200 text-sm font-sans disabled:opacity-40 hover:border-[#c8a96e] transition-colors">Next →</button></div>)}</div>);
}
