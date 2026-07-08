import type {Metadata} from "next";
import "./globals.css";
import Providers from "@/components/Providers";
export const metadata:Metadata={title:"GoatMart",description:"India's most trusted premium livestock marketplace.",keywords:"goat,bakra,livestock,jamunapari,beetal,buy goat online"};
export default function RootLayout({children}:{children:React.ReactNode}){return(<html lang="en"><body><Providers>{children}</Providers></body></html>);}
