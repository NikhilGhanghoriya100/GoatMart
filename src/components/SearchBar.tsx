"use client";
import {useState,useRef,useEffect} from "react";
import {useRouter} from "next/navigation";
import {Search,SlidersHorizontal,X} from "lucide-react";
import {useStore} from "@/store/useStore";
import {BREEDS,BREED_META,fmt} from "@/lib/utils";
import axios from "axios";
import type {Goat} from "@/types";
const PRANGES=[{l:"Any Price",min:0,max:999999},{l:"Under ₹10,000",min:0,max:10000},{l:"₹10k–₹20k",min:10000,max:20000},{l:"₹20k–₹30k",min:20000,max:30000},{l:"Above ₹30,000",min:30000,max:999999}];
export default function SearchBar(){
  const router=useRouter();
  const{selectedBreed,setSelectedBreed,priceRange,setPriceRange,setSearchQuery}=useStore();
  const[q,setQ]=useState("");const[open,setOpen]=useState(false);const[fOpen,setFOpen]=useState(false);const[results,setResults]=useState<Goat[]>([]);
  const ref=useRef<HTMLDivElement>(null);const timer=useRef<ReturnType<typeof setTimeout>>();
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node)){setOpen(false);setFOpen(false);}};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  useEffect(()=>{clearTimeout(timer.current);if(q.length<2){setResults([]);return;}timer.current=setTimeout(async()=>{try{const{data}=await axios.get(`/api/goats?search=${q}&limit=5&status=all`);if(data.success)setResults(data.data);}catch{setResults([]);}},350);},[q]);
  const ac=(selectedBreed!=="All"?1:0)+(priceRange&&priceRange.l!=="Any Price"?1:0);
  const doSearch=()=>{setSearchQuery(q);router.push("/shop");setOpen(false);};
  return(
    <div ref={ref} className="relative flex-1 max-w-[540px] mx-auto">
      <div className={`flex items-center border-2 rounded-xl overflow-hidden bg-[#faf8f4] transition-all ${open||fOpen?"border-[#c8a96e] shadow-[0_0_0_3px_#c8a96e22]":"border-[#e0d8c8]"}`}>
        <button onClick={()=>{setFOpen(f=>!f);setOpen(false);}} className="px-3 h-11 bg-transparent border-none border-r border-[#e0d8c8] text-xs font-semibold text-gray-500 flex items-center gap-1.5 flex-shrink-0 hover:text-[#c8a96e] transition-colors font-sans">
          <SlidersHorizontal size={13}/>Filter{ac>0&&<span className="bg-[#c8a96e] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{ac}</span>}
        </button>
        <Search size={14} className="ml-2.5 text-gray-300 flex-shrink-0"/>
        <input className="flex-1 px-2 py-2.5 text-sm bg-transparent outline-none font-sans min-w-0" placeholder="Search goats, breeds, sellers..." value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={e=>e.key==="Enter"&&doSearch()}/>
        {q&&<button onClick={()=>{setQ("");setSearchQuery("");}} className="px-2 text-gray-300 hover:text-gray-500"><X size={14}/></button>}
        <button onClick={doSearch} className="px-4 h-11 bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white text-xs font-bold font-sans flex-shrink-0 hover:opacity-90 transition-opacity">Search</button>
      </div>
      {ac>0&&(<div className="flex gap-1.5 mt-1.5 flex-wrap">
        {selectedBreed!=="All"&&(<span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#c8a96e22] text-[#8b5e2a] text-xs font-semibold font-sans">{BREED_META[selectedBreed]?.emoji} {selectedBreed}<button onClick={()=>setSelectedBreed("All")} className="ml-0.5"><X size={10}/></button></span>)}
        {priceRange&&priceRange.l!=="Any Price"&&(<span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#c8a96e22] text-[#8b5e2a] text-xs font-semibold font-sans">💰 {priceRange.l}<button onClick={()=>setPriceRange(null)} className="ml-0.5"><X size={10}/></button></span>)}
      </div>)}
      {fOpen&&(<div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-2xl border border-[#e0d8c8] shadow-xl z-50 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div><div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans mb-2">Breed</div>{["All",...BREEDS].map(b=>(<button key={b} onClick={()=>setSelectedBreed(b)} className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-sm font-sans mb-0.5 transition-colors ${selectedBreed===b?"bg-[#c8a96e22] text-[#8b5e2a] font-bold":"text-gray-600 hover:bg-gray-50"}`}>{b==="All"?"🐐 All Breeds":`${BREED_META[b]?.emoji} ${b}`}</button>))}</div>
          <div><div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans mb-2">Price</div>{PRANGES.map(r=>(<button key={r.l} onClick={()=>setPriceRange(r)} className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-sm font-sans mb-0.5 transition-colors ${priceRange?.l===r.l?"bg-[#c8a96e22] text-[#8b5e2a] font-bold":"text-gray-600 hover:bg-gray-50"}`}>💰 {r.l}</button>))}</div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100"><button onClick={()=>{setSelectedBreed("All");setPriceRange(null);}} className="flex-1 py-2 rounded-full border border-gray-200 text-sm text-gray-500 hover:border-gray-300 font-sans">Clear All</button><button onClick={()=>{setFOpen(false);router.push("/shop");}} className="flex-[2] py-2 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white text-sm font-bold font-sans hover:opacity-90">Apply</button></div>
      </div>)}
      {open&&q.length>=2&&results.length>0&&(<div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-2xl border border-[#e0d8c8] shadow-xl z-50 overflow-hidden">
        {results.map(g=>(<button key={g._id} onClick={()=>{router.push(`/goat/${g._id}`);setQ("");setOpen(false);}} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#faf6ee] transition-colors border-b border-gray-50 last:border-0">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">{g.images?.[0]&&<img src={g.images[0]} alt={g.name} className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}</div>
          <div className="flex-1 text-left"><div className="text-sm font-semibold font-sans">{g.name}</div><div className="text-xs text-[#c8a96e] font-sans">{g.breed} • {fmt(g.price)}</div></div>
          <span className={`text-[10px] font-bold font-sans ${g.status==="sold"?"text-red-400":"text-green-600"}`}>{g.status==="sold"?"SOLD":"FOR SALE"}</span>
        </button>))}
      </div>)}
    </div>
  );
}
