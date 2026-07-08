"use client";
import {useEffect} from "react";
import {X} from "lucide-react";
interface ModalProps{open:boolean;onClose:()=>void;title?:string;children:React.ReactNode;size?:"sm"|"md"|"lg";className?:string}
export default function Modal({open,onClose,title,children,size="md",className}:ModalProps){
  useEffect(()=>{if(open)document.body.style.overflow="hidden";else document.body.style.overflow="";return()=>{document.body.style.overflow="";};},[open]);
  if(!open)return null;
  const sizes={sm:"max-w-sm",md:"max-w-md",lg:"max-w-xl"};
  return(<div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/65 animate-fadeIn" onClick={e=>e.target===e.currentTarget&&onClose()}><div className={`bg-white rounded-2xl shadow-2xl w-full animate-slideUp overflow-hidden max-h-[92vh] flex flex-col ${sizes[size]} ${className||""}`}>{title&&(<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0"><h3 className="text-base font-bold font-serif">{title}</h3><button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"><X size={14}/></button></div>)}<div className="overflow-y-auto flex-1 p-5">{children}</div></div></div>);
}
