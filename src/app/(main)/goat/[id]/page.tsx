import {notFound} from "next/navigation";
import connectDB from "@/lib/db";
import GoatModel from "@/models/Goat";
import GoatDetailClient from "@/components/goat/GoatDetailClient";
import type {Goat} from "@/types";
interface Props{params:Promise<{id:string}>}
async function getGoat(id:string):Promise<Goat|null>{try{await connectDB();const g=await GoatModel.findByIdAndUpdate(id,{$inc:{views:1}},{new:true}).lean();return g?JSON.parse(JSON.stringify(g)):null;}catch{return null;}}
export async function generateMetadata({params}:Props){const{id}=await params;const goat=await getGoat(id);if(!goat)return{title:"Not Found"};return{title:`${goat.name} — ${goat.breed} | Bakrawale`,description:goat.desc,openGraph:{images:[goat.images[0]]}};}
export default async function GoatPage({params}:Props){const{id}=await params;const goat=await getGoat(id);if(!goat)notFound();return<GoatDetailClient goat={goat}/>;}
