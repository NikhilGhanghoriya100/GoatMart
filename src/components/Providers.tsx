"use client";
import {SessionProvider} from "next-auth/react";
import {Toaster} from "react-hot-toast";
export default function Providers({children}:{children:React.ReactNode}){return(<SessionProvider>{children}<Toaster position="bottom-right" toastOptions={{style:{fontFamily:"Lato, sans-serif",fontSize:"13px",borderRadius:"10px",background:"#1a1a1a",color:"#ddd",border:"1px solid #2a2a2a"},success:{iconTheme:{primary:"#c8a96e",secondary:"#fff"}}}}/></SessionProvider>);}
