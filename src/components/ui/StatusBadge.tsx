import {STATUS_COLORS} from "@/lib/utils";
export default function StatusBadge({status}:{status:string}){const[bg,color]=STATUS_COLORS[status]??["#f0f0f0","#666"];return<span style={{background:bg,color}} className="px-3 py-0.5 rounded-full text-xs font-bold font-sans inline-block">{status}</span>;}
