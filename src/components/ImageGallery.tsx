"use client";
import {useState,useRef,useCallback} from "react";
import Image from "next/image";
import {ChevronLeft,ChevronRight} from "lucide-react";
import {BREED_META} from "@/lib/utils";
interface Props{images:string[];breed:string;height?:number;rounded?:boolean}
export default function ImageGallery({images,breed,height=360,rounded=true}:Props){
  const[idx,setIdx]=useState(0);
  const[errSet,setErrSet]=useState<Set<number>>(new Set());
  const trackRef=useRef<HTMLDivElement>(null);
  const startX=useRef<number|null>(null);
  const meta=BREED_META[breed]??{emoji:"🐐",color:"#b08060",bg:"#f8f4ee"};
  const go=useCallback((n:number)=>{const c=Math.max(0,Math.min(images.length-1,n));setIdx(c);if(trackRef.current){const w=trackRef.current.parentElement?.offsetWidth??300;trackRef.current.style.transform=`translateX(-${c*w}px)`;}},[images.length]);
  const onTS=(e:React.TouchEvent)=>{startX.current=e.touches[0].clientX;};
  const onTE=(e:React.TouchEvent)=>{if(startX.current===null)return;const dx=startX.current-e.changedTouches[0].clientX;if(Math.abs(dx)>40)go(idx+(dx>0?1:-1));startX.current=null;};
  return(
    <div className={`relative overflow-hidden ${rounded?"rounded-2xl":""}`} style={{height,background:meta.bg}} onTouchStart={onTS} onTouchEnd={onTE}>
      <div ref={trackRef} className="flex h-full transition-transform duration-300 ease-out" style={{width:`${images.length*100}%`}}>
        {images.map((src,i)=>(
          <div key={i} style={{flex:`0 0 ${100/images.length}%`}} className="h-full relative">
            {errSet.has(i) || !src ? (<div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{background:meta.bg}}><span style={{fontSize:height>200?80:52}}>{meta.emoji}</span><span className="text-xs text-gray-400 font-sans">{breed}</span></div>):(
              <Image src={src} alt={breed} fill className="object-cover" onError={()=>setErrSet(p=>new Set([...p,i]))} sizes="(max-width:768px) 100vw, 50vw" priority={i===0}/>
            )}
          </div>
        ))}
      </div>
      {images.length>1&&idx>0&&(<button onClick={e=>{e.stopPropagation();go(idx-1);}} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center z-10 hover:bg-white transition-colors"><ChevronLeft size={16}/></button>)}
      {images.length>1&&idx<images.length-1&&(<button onClick={e=>{e.stopPropagation();go(idx+1);}} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center z-10 hover:bg-white transition-colors"><ChevronRight size={16}/></button>)}
      {images.length>1&&(<div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">{images.map((_,i)=>(<button key={i} onClick={e=>{e.stopPropagation();go(i);}} className="h-1.5 rounded-full transition-all duration-300" style={{width:i===idx?18:6,background:i===idx?"#fff":"rgba(255,255,255,0.5)"}}/>))}</div>)}
    </div>
  );
}
