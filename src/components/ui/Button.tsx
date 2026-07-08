"use client";
import {ButtonHTMLAttributes,forwardRef} from "react";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>{variant?:"primary"|"outline"|"ghost"|"danger";size?:"sm"|"md"|"lg";loading?:boolean}
const Button=forwardRef<HTMLButtonElement,ButtonProps>(({variant="primary",size="md",loading,className,children,disabled,...props},ref)=>{
  const base="inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const variants={primary:"bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white shadow-md hover:opacity-90",outline:"border-2 border-[#c8a96e] text-[#c8a96e] bg-transparent hover:bg-[#c8a96e10]",ghost:"bg-transparent text-gray-600 hover:bg-gray-100",danger:"bg-red-900/30 text-red-400 hover:bg-red-900/50"};
  const sizes={sm:"px-4 py-1.5 text-xs",md:"px-5 py-2.5 text-sm",lg:"px-7 py-3.5 text-base"};
  return(<button ref={ref} disabled={disabled||loading} className={`${base} ${variants[variant]} ${sizes[size]} ${className||""}`} {...props}>{loading&&<span className="mr-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block"/>}{children}</button>);
});
Button.displayName="Button";
export default Button;
