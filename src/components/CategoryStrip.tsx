"use client";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useStore} from "@/store/useStore";
import {BREEDS,BREED_META} from "@/lib/utils";
const IMGS:Record<string,string>={Jamunapari:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Jamunapari_goat.jpg/120px-Jamunapari_goat.jpg",Beetal:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Beetal_goat.jpg/120px-Beetal_goat.jpg",Sirohi:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Goat_at_the_San_Diego_Zoo.jpg/120px-Goat_at_the_San_Diego_Zoo.jpg",Barbari:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Barbari_Goat.jpg/120px-Barbari_Goat.jpg","Black Bengal":"https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Black_Bengal_goat.jpg/120px-Black_Bengal_goat.jpg",Osmanabadi:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Osmanabadi_goat.jpg/120px-Osmanabadi_goat.jpg",Totapari:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Domestic_goat_kid_in_capeweed.jpg/120px-Domestic_goat_kid_in_capeweed.jpg",Sojat:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Goat_on_Sapa_trek.jpg/120px-Goat_on_Sapa_trek.jpg"};
const ALL=[{name:"All",emoji:"🐐",color:"#c8a96e",bg:"#fdf6e8"},...BREEDS.map(b=>({name:b,...BREED_META[b]}))];
export default function CategoryStrip(){
  const{selectedBreed,setSelectedBreed}=useStore();
  const router=useRouter();
  const handleClick=(name:string)=>{setSelectedBreed(name);router.push("/shop");};
  return(
    <div className="flex gap-4 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
      {ALL.map((c,i)=>{
        const active=selectedBreed===c.name;
        const imgSrc=IMGS[c.name];
        return(
          <button key={c.name} onClick={()=>handleClick(c.name)} className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[66px] transition-transform hover:scale-105">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden flex items-center justify-center transition-all duration-200" style={{border:`3px solid ${active?c.color:"#f0e8d8"}`,background:active?c.color:BREED_META[c.name]?.bg??"#f8f4ee",boxShadow:active?`0 6px 20px ${c.color}55`:"0 2px 8px rgba(0,0,0,0.05)"}}>
              {imgSrc?(<Image src={imgSrc} alt={c.name} width={60} height={60} className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}}/>):(<span className="text-2xl">{c.emoji}</span>)}
            </div>
            <span className="text-[10px] text-center leading-tight font-sans font-medium max-w-[66px]" style={{color:active?"#8b5e2a":"#555",fontWeight:active?700:500}}>{c.name==="All"?"All Breeds":c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
