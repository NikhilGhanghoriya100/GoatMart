"use client";
import {useState,useEffect} from "react";
import Link from "next/link";
const BANNERS=[{title:"Premium Jamunapari Goats",sub:"Certified Farm-Raised • Fully Vaccinated • Pan-India Delivery",cta:"Shop Now",ctaHref:"/shop",bg:"linear-gradient(135deg,#1a0a00,#3d1f00,#7a4510)",accent:"#c8a96e"},{title:"Verified Livestock. Trusted Platform.",sub:"100% Authentic Breeds • Health Certified • Secure Payments",cta:"Explore Collection",ctaHref:"/shop",bg:"linear-gradient(135deg,#001a0a,#003d1f,#006640)",accent:"#5ec87e"},{title:"Farm Fresh. Premium Quality.",sub:"Direct from Certified Farms • Best Prices • Live Support",cta:"View Listings",ctaHref:"/shop",bg:"linear-gradient(135deg,#0a001a,#1f0040,#4a1090)",accent:"#a06ef0"}];
export default function HeroBanner(){
  const[idx,setIdx]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setIdx(i=>(i+1)%BANNERS.length),4500);return()=>clearInterval(t);},[]);
  const b=BANNERS[idx];
  return(
    <div className="relative overflow-hidden flex items-center h-[260px] sm:h-[360px] md:h-[440px]">
      <div className="absolute inset-0 transition-all duration-700" style={{background:b.bg}}/>
      <div className="relative z-10 px-5 sm:px-8 max-w-[1280px] mx-auto w-full">
        <div className="inline-block px-3 py-1 rounded-full border border-white/30 text-white/80 text-[10px] font-semibold tracking-widest uppercase font-sans mb-3">🏆 India&apos;s Premium Livestock Marketplace</div>
        <h1 className="text-xl sm:text-3xl md:text-5xl font-bold text-white leading-tight mb-2 font-serif max-w-lg">{b.title}</h1>
        <p className="text-white/70 text-xs sm:text-sm md:text-base font-sans mb-5 max-w-md">{b.sub}</p>
        <Link href={b.ctaHref} style={{background:b.accent}} className="inline-block px-6 py-2.5 rounded-full text-white font-bold font-sans text-sm hover:opacity-90 transition-opacity shadow-lg">{b.cta} →</Link>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {BANNERS.map((_,i)=>(<button key={i} onClick={()=>setIdx(i)} className="h-1.5 rounded-full transition-all duration-300" style={{width:i===idx?20:7,background:i===idx?"#fff":"rgba(255,255,255,0.35)"}}/>))}
      </div>
    </div>
  );
}
