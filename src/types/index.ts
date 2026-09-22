export interface Goat{_id:string;name:string;breed:string;weight:number;age:string;price:number;status:"sale"|"sold"|"reserved";health:string;vaccinated:boolean;tag?:string;desc:string;images:string[];videoUrl?:string;seller:string;sellerName:string;sellerRating:number;sellerReviews:number;sellerImg:string;sellerLoc:string;reviews:Review[];averageRating:number;totalReviews:number;views:number;wishlistCount:number;createdAt:string}
export interface Review{_id:string;user:string;userName:string;userAvatar:string;rating:number;text:string;createdAt:string}
export interface Order{_id:string;orderId:string;goat:string|Goat;goatName:string;goatBreed:string;goatImage:string;seller:string;sellerName:string;customer:string;customerName:string;amount:number;status:string;payment:{razorpayOrderId:string;razorpayPaymentId?:string;method?:string;status:string;paidAt?:string};delivery:{name:string;phone:string;email?:string;address:string;city:string;state:string;pin:string;note?:string};timeline:{s:string;d:string;done:boolean}[];reviewed:boolean;createdAt:string}
export interface ChatMessage{_id:string;from:string;fromName:string;fromRole:"customer"|"seller"|"admin";text:string;attachments?:string[];read:boolean;createdAt:string}
export interface Chat{_id:string;goat:string|Goat;goatName:string;goatImage:string;customer:string;customerName:string;seller:string;sellerName:string;messages:ChatMessage[];lastMessage?:string;lastMessageAt?:string;unreadCount:{customer:number;seller:number}}
export interface User{_id:string;name:string;email:string;phone?:string;role:"customer"|"seller"|"admin";avatar?:string;address?:{street:string;city:string;state:string;pin:string};sellerProfile?:{farmName:string;description:string;location:string;status:"pending"|"approved"|"suspended";rating:number;totalReviews:number;totalSales:number};wishlist:string[];createdAt:string}
export interface ApiResponse<T=unknown>{success:boolean;data?:T;message?:string;error?:string}
export const BREEDS=["Jamunapari","Beetal","Sirohi","Barbari","Black Bengal","Osmanabadi","Totapari","Sojat","Kota","Malwa","Others"] as const;
export type Breed=typeof BREEDS[number];
export const BREED_META: Record<Breed, { emoji: string; color: string; bg: string }> = {
  Jamunapari: { emoji: "🏆", color: "#d4a96e", bg: "#fdf6e8" },
  Beetal: { emoji: "🎖️", color: "#c07050", bg: "#fdf0e8" },
  Sirohi: { emoji: "💎", color: "#b89060", bg: "#fdf4e8" },
  Barbari: { emoji: "⭐", color: "#7b9e87", bg: "#eef6f0" },
  "Black Bengal": { emoji: "🔥", color: "#4a4a4a", bg: "#f0f0f0" },
  Osmanabadi: { emoji: "👑", color: "#c89e3e", bg: "#fdf8e0" },
  Totapari: { emoji: "🌿", color: "#a8785e", bg: "#f8f0e8" },
  Sojat: { emoji: "✨", color: "#7e9eba", bg: "#e8f0f8" },
  Kota: { emoji: "🐐", color: "#8b7355", bg: "#f5efe7" },
  Malwa: { emoji: "🐐", color: "#8b6f47", bg: "#f7f0e5" },
  Others: { emoji: "🐐", color: "#777777", bg: "#f1f1f1" },
};

