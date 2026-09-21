export function cn(...inputs:any[]){return inputs.filter(Boolean).join(" ")}
export const fmt=(n:number)=>`₹${n.toLocaleString("en-IN")}`;
export const BREED_META:Record<string,{emoji:string;color:string;bg:string}>={
  Jamunapari:{emoji:"🏆",color:"#d4a96e",bg:"#fdf6e8"},Beetal:{emoji:"🎖️",color:"#c07050",bg:"#fdf0e8"},
  Sirohi:{emoji:"💎",color:"#b89060",bg:"#fdf4e8"},Barbari:{emoji:"⭐",color:"#7b9e87",bg:"#eef6f0"},
  "Black Bengal":{emoji:"🔥",color:"#4a4a4a",bg:"#f0f0f0"},Osmanabadi:{emoji:"👑",color:"#c89e3e",bg:"#fdf8e0"},
  Totapari:{emoji:"🌿",color:"#a8785e",bg:"#f8f0e8"},Sojat:{emoji:"✨",color:"#7e9eba",bg:"#e8f0f8"},
};
export const BREEDS=Object.keys(BREED_META);
export const STATUS_COLORS: Record<string, [string, string]> = {
  Delivered: ["#e8fdf0", "#1a8a4a"],
  "In Transit": ["#e8f2fd", "#1a5a9a"],
  Confirmed: ["#fdfae8", "#7a6a00"],
  Pending: ["#fff3e8", "#9a4a00"],
  Cancelled: ["#fde8e8", "#9a1a1a"],
  pending: ["#fff3e8", "#9a4a00"],
  payment_confirmed: ["#e8fdf0", "#1a8a4a"],
  processing: ["#fdfae8", "#7a6a00"],
  dispatched: ["#e8f2fd", "#1a5a9a"],
  out_for_delivery: ["#e8f2fd", "#1a5a9a"],
  delivered: ["#e8fdf0", "#1a8a4a"],
  cancelled: ["#fde8e8", "#9a1a1a"],
  refunded: ["#f3e8fd", "#6b1a9a"],
};
export function nowTime(){return new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});}
export function timeAgo(date:string|Date){
  const diff=Date.now()-new Date(date).getTime();
  const mins=Math.floor(diff/60000);
  if(mins<1)return"Just now";if(mins<60)return`${mins}m ago`;
  const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs}h ago`;
  return`${Math.floor(hrs/24)}d ago`;
}
