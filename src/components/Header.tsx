"use client";
import {useState,useEffect,useRef} from "react";
import Link from "next/link";
import {useRouter,usePathname} from "next/navigation";
import {useSession,signOut} from "next-auth/react";
import {Menu,X,Bell,Heart,ChevronDown,User,Package,MessageSquare,Settings,LogOut,Shield,Store} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import {useStore} from "@/store/useStore";

function AccountDropdown({onClose}:{onClose:()=>void}){
  const{data:session}=useSession();const router=useRouter();const{wishlist}=useStore();
  const items=session?[{icon:User,label:"My Profile",href:"/profile"},{icon:Package,label:"My Orders",href:"/orders"},{icon:Heart,label:`My Wishlist${wishlist.length>0?` (${wishlist.length})`:""}`,href:"/wishlist"},{icon:MessageSquare,label:"My Chats",href:"/chat"},...(session.user.role==="seller"?[{icon:Store,label:"Seller Dashboard",href:"/seller"}]:[]),...(session.user.role==="admin"?[{icon:Shield,label:"Admin Panel",href:"/admin"}]:[]),{icon:Settings,label:"Settings",href:"/settings"}]:[];
  return(
    <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-fadeIn">
      {session?(<>
        <div className="px-4 py-3 bg-gradient-to-br from-[#fdf6e8] to-[#faf4ee] border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-white text-sm font-bold">{session.user.name?.[0]?.toUpperCase()}</div>
            <div><p className="text-sm font-bold leading-none">{session.user.name}</p><p className="text-xs text-gray-400 font-sans mt-0.5">{session.user.email}</p><span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c8a96e22] text-[#8b5e2a] font-semibold font-sans mt-1 inline-block">{session.user.role}</span></div>
          </div>
        </div>
        {items.map(item=>(<button key={item.href} onClick={()=>{router.push(item.href);onClose();}} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-sans text-gray-700 hover:bg-[#faf6ee] transition-colors border-b border-gray-50 last:border-0"><item.icon size={14} className="text-gray-400"/>{item.label}</button>))}
        <button onClick={()=>{signOut({callbackUrl:"/"});onClose();}} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-sans text-red-500 hover:bg-red-50 transition-colors"><LogOut size={14}/>Logout</button>
      </>):(
        <>
          {/* <button onClick={()=>{router.push("/login");onClose();}} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-sans text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50"><User size={14} className="text-gray-400"/>Login</button> */}
          <button onClick={()=>{router.push("/register");onClose();}} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-sans text-gray-700 hover:bg-gray-50 transition-colors"><User size={14} className="text-gray-400"/>Sign in</button>
        </>
      )}
    </div>
  );
}

const NAV=[{href:"/",label:"Home"},{href:"/shop",label:"Shop"},{href:"/orders",label:"My Orders"},{href:"/wishlist",label:"My Wishlist"},{href:"/chat",label:"My Chats"},];

export default function Header(){
  const pathname=usePathname();const{data:session}=useSession();const{wishlist,lang,setLang}=useStore();
  const[drawerOpen,setDrawerOpen]=useState(false);const[accountOpen,setAccountOpen]=useState(false);const[scrolled,setScrolled]=useState(false);
  const accountRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=()=>setScrolled(window.scrollY>10);window.addEventListener("scroll",h);return()=>window.removeEventListener("scroll",h);},[]);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(accountRef.current&&!accountRef.current.contains(e.target as Node))setAccountOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  useEffect(()=>{setDrawerOpen(false);},[pathname]);
  return(
    <>
      <header className={`sticky top-0 z-[200] transition-shadow ${scrolled?"shadow-md":""}`} style={{backdropFilter:"blur(20px)",background:"rgba(255,255,255,0.97)",borderBottom:"1px solid #e8e0d0"}}>
        <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5 max-w-[1280px] mx-auto">
          <button onClick={()=>setDrawerOpen(true)} className="lg:hidden w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors flex-shrink-0"><Menu size={18}/></button>
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group lg:static absolute left-1/2 -translate-x-1/2 lg:translate-x-0">


        <div className="w-full flex items-center justify-center gap-2 py-4">
         {/* Logo Icon Box */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-xl shadow-md">
        🐐
        </div>
  
        {/* Logo Text */}
        <span className="text-xl font-bold text-[#2d2d2d] tracking-wide">
        GoatMart
        </span>
        </div>
          </Link>
          <div className="hidden md:flex flex-1 mx-3"><SearchBar/></div>
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <button onClick={()=>setLang(lang==="en"?"hi":"en")} className="hidden sm:flex px-2.5 py-1 rounded-full border border-gray-200 text-xs font-semibold text-gray-500 hover:border-[#c8a96e] transition-colors font-sans">{lang==="en"?"हिं":"EN"}</button>
            {session&&(<Link href="/wishlist" className="relative w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors"><Heart size={16} className="text-gray-500"/>{wishlist.length>0&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c8a96e] text-white text-[9px] font-bold flex items-center justify-center font-sans">{wishlist.length}</span>}</Link>)}
            <div ref={accountRef} className="relative">
              <button onClick={()=>setAccountOpen(o=>!o)} className="flex items-center gap-1.5 rounded-full border-2 transition-all h-9 px-2" style={{borderColor:accountOpen?"#c8a96e":"#e0d8c8"}}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${session?"bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white":"bg-gray-100 text-gray-500"}`}>{session?session.user.name?.[0]?.toUpperCase():<User size={13}/>}</div>
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${accountOpen?"rotate-180":""}`}/>
              </button>
              {accountOpen&&<AccountDropdown onClose={()=>setAccountOpen(false)}/>}
            </div>
          </div>
        </div>
        <div className="md:hidden px-4 pb-2.5"><SearchBar/></div>
        <div className="hidden lg:block border-t border-gray-100 bg-white/95">
          <div className="flex items-center justify-center px-6 max-w-[1280px] mx-auto">
            {NAV.map(link=>(<Link key={link.href} href={link.href} className={`px-5 py-2.5 text-sm font-sans border-b-2 transition-all ${pathname===link.href?"text-[#c8a96e] font-semibold border-[#c8a96e]":"text-gray-500 font-normal border-transparent hover:text-[#c8a96e]"}`}>{link.label}{link.href==="/wishlist"&&wishlist.length>0&&<span className="ml-1 bg-[#c8a96e] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 font-sans">{wishlist.length}</span>}</Link>))}
          </div>
        </div>
      </header>
      {drawerOpen&&(<>
        <div className="fixed inset-0 bg-black/50 z-[300] lg:hidden" onClick={()=>setDrawerOpen(false)}/>
        <div className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[301] flex flex-col shadow-2xl lg:hidden animate-slideRight">
          <div className="flex items-center gap-3 p-4" style={{background:"linear-gradient(135deg,#c8a96e,#8b5e2a)"}}>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl">🐐</div>
            <div className="flex-1"><div className="text-lg font-bold text-white">GoatMart</div><div className="text-[9px] text-white/70 font-sans tracking-widest uppercase"></div></div>
            <button onClick={()=>setDrawerOpen(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"><X size={16}/></button>
          </div>
          {session&&(<div className="px-4 py-3 bg-[#faf6ee] border-b border-gray-100 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-white font-bold text-base">{session.user.name?.[0]?.toUpperCase()}</div><div><div className="font-bold text-sm">{session.user.name}</div><div className="text-xs text-gray-400 font-sans">{session.user.email}</div></div></div>)}
          <div className="flex-1 overflow-y-auto">
            {NAV.map(link=>(<Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-3 text-sm font-sans border-l-4 transition-all ${pathname===link.href?"bg-[#c8a96e15] border-[#c8a96e] text-[#8b5e2a] font-bold":"border-transparent text-gray-600 hover:bg-gray-50"}`}>{link.label}</Link>))}
            <div className="h-px bg-gray-100 my-1"/>
            {!session?(<><Link href="/login" className="flex items-center gap-3 px-4 py-3 text-sm font-sans text-gray-600 hover:bg-gray-50"><User size={16} className="text-gray-400"/>Login</Link></>):(
              <button onClick={()=>signOut({callbackUrl:"/"})} className="flex items-center gap-3 px-4 py-3 text-sm font-sans text-red-500 hover:bg-red-50 w-full"><LogOut size={16}/>Logout</button>
            )}
          </div>
        </div>
      </>)}
    </>
  );
}
