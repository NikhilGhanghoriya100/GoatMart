import {useState,useEffect,useCallback} from "react";
import axios from "axios";
import type {Goat} from "@/types";
interface UseGoatsOptions{breed?:string;status?:string;search?:string;limit?:number;seller?:string}
export function useGoats(options:UseGoatsOptions={}){
  const[goats,setGoats]=useState<Goat[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState<string|null>(null);
  const[page,setPage]=useState(1);
  const[totalPages,setTotalPages]=useState(1);
  const fetchGoats=useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      const params=new URLSearchParams();
      if(options.breed&&options.breed!=="All")params.set("breed",options.breed);
      if(options.status)params.set("status",options.status);
      if(options.search)params.set("search",options.search);
      if(options.limit)params.set("limit",String(options.limit));
      if(options.seller)params.set("seller",options.seller);
      params.set("page",String(page));
      const{data}=await axios.get(`/api/goats?${params.toString()}`);
      if(data.success){setGoats(data.data);setTotalPages(data.pagination?.pages||1);}
    }catch{setError("Failed to load goats");}
    finally{setLoading(false);}
  },[options.breed,options.status,options.search,options.limit,options.seller,page]);
  useEffect(()=>{fetchGoats();},[fetchGoats]);
  return{goats,loading,error,page,setPage,totalPages,refetch:fetchGoats};
}
export function useGoat(id:string){
  const[goat,setGoat]=useState<Goat|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState<string|null>(null);
  useEffect(()=>{
    if(!id)return;setLoading(true);
    axios.get(`/api/goats/${id}`).then(({data})=>{if(data.success)setGoat(data.data);}).catch(()=>setError("Failed")).finally(()=>setLoading(false));
  },[id]);
  return{goat,loading,error};
}
