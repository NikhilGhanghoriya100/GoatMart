"use client";
import {useSession,signOut} from "next-auth/react";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {useStore} from "@/store/useStore";
export default function SettingsPage(){
  const{data:session}=useSession();
  const{lang,setLang}=useStore();
  return(
    <div className="max-w-[520px] mx-auto px-4 py-7">
      <div className="flex items-center gap-3 mb-6"><Link href="/" className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors"><ArrowLeft size={16}/></Link><h1 className="flex-1 text-center text-xl font-bold font-serif">Settings</h1><div className="w-9"/></div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        {[{l:"Language",v:lang==="en"?"English":"हिंदी",fn:()=>setLang(lang==="en"?"hi":"en")},{l:"Notifications",v:"Enabled",fn:()=>{}},{l:"Dark Mode",v:"Coming Soon",fn:()=>{}}].map(s=>(<div key={s.l} onClick={s.fn} className="flex items-center justify-between py-3 border-b border-gray-50 cursor-pointer last:border-0"><div className="text-sm font-sans">{s.l}</div><div className="text-sm text-[#c8a96e] font-sans font-semibold">{s.v}</div></div>))}
      </div>
      {session&&<button onClick={()=>signOut({callbackUrl:"/"})} className="w-full mt-4 py-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-500 font-bold font-sans text-sm">🚪 Logout</button>}
    </div>
  );
}
