"use client";
import GoatCard from "@/components/GoatCard";
import {GoatCardSkeleton} from "@/components/ui/Skeleton";
import type {Goat} from "@/types";
interface Props{goats:Goat[];loading?:boolean;skeletonCount?:number}
export default function GoatGrid({goats,loading=false,skeletonCount=8}:Props){
  if(loading)return(<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">{Array.from({length:skeletonCount}).map((_,i)=>(<GoatCardSkeleton key={i}/>))}</div>);
  if(!loading&&goats.length===0)return(<div className="flex flex-col items-center justify-center py-20 text-gray-400"><span className="text-5xl mb-4">🐐</span><p className="text-base font-sans">No goats found. Try changing your filters.</p></div>);
  return(<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">{goats.map(g=>(<GoatCard key={g._id} goat={g}/>))}</div>);
}
