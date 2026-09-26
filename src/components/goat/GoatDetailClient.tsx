

// "use client";
// import { useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
// import {
//   Heart,
//   Share2,
//   MessageSquare,
//   ShoppingCart,
//   Star,
//   CheckCircle2,
//   ChevronRight,
//   ShieldCheck,
// } from "lucide-react";
// import toast from "react-hot-toast";
// import axios from "axios";
// import CheckoutModal from "@/components/payment/CheckoutModal";
// import ReviewSection from "@/components/goat/ReviewSection";
// import { useStore } from "@/store/useStore";
// import { useTranslation } from "@/hooks/useTranslation";
// import { fmt } from "@/lib/utils";
// import type { Goat } from "@/types";

// export default function GoatDetailClient({ goat }: { goat: Goat }) {
//   const { data: session } = useSession();
//   const router = useRouter();
//   const { wishlist, toggleWishlist } = useStore();
//   const { t, translateBreed, isHindi } = useTranslation();
//   const [checkoutOpen, setCheckoutOpen] = useState(false);
//   const [wishLoading, setWishLoading] = useState(false);
//   const [selectedImg, setSelectedImg] = useState<string | null>(
//     goat.images?.[0] || null
//   );
//   const [showVideo, setShowVideo] = useState(false);

//   const sold = goat.status === "sold";
//   const reserved = goat.status === "reserved";
//   const inWish = wishlist.includes(goat._id);

//   const handleWishlist = async () => {
//     if (!session) {
//       router.push("/login");
//       return;
//     }

//     setWishLoading(true);

//     try {
//       await axios.post("/api/user/wishlist", { goatId: goat._id });
//       toggleWishlist(goat._id);
//       toast.success(inWish ? t.removedWishlist : t.addedWishlist);
//     } catch {
//       toast.error("Failed to update wishlist");
//     } finally {
//       setWishLoading(false);
//     }
//   };

//   const handleShare = async () => {
//     const url = `${
//       typeof window !== "undefined" ? window.location.origin : ""
//     }/goat/${goat._id}`;

//     const breedName = translateBreed(goat.breed);
//     const priceText = fmt(goat.price);
//     const locText = goat.sellerLoc ? `\n📍 स्थान: ${goat.sellerLoc}` : "";

//     const shareTitle = `🐐 GoatMart पर ${goat.name} — ${breedName}`;

//     const shareText = `🐐✨ GoatMart पर शानदार बकरा उपलब्ध है! ✨🐐

// 🏆 ${goat.name} — शुद्ध ${breedName} नस्ल
// 💰 कीमत: ${priceText}
// ⚖️ वजन: ${goat.weight} किलोग्राम${locText}

// ━━━━━━━━━━━━━━━━━━
// 🌟 इस बकरे की खासियत
// ━━━━━━━━━━━━━━━━━━
// ✅ शुद्ध ${breedName} नस्ल
// 🩺 पशु चिकित्सक द्वारा प्रमाणित
// 📸 असली फोटो और वीडियो उपलब्ध
// 💯 सीधे फार्म से खरीदारी
// 🚚 पूरे भारत में सुरक्षित घर तक पहुँचाने की सुविधा
// 🔒 भरोसेमंद खरीदारी के लिए GoatMart का सहयोग

// 🔥 बेहतरीन नस्ल और शानदार वजन का यह बकरा आपके लिए उपलब्ध है!
// अगर आप अच्छी नस्ल, सही वजन और उचित कीमत वाला बकरा खरीदना चाहते हैं, तो इसकी पूरी जानकारी अभी देखें।

// 👇 पूरी फोटो, वीडियो, नस्ल की जानकारी, कीमत और खरीदारी के लिए यहाँ क्लिक करें:
// 🔗 ${url}

// 🐐 GoatMart — आपकी पसंद का बकरा, अब आपके घर तक।`;

//     try {
//       if (navigator.share) {
//         await navigator.share({
//           title: shareTitle,
//           text: shareText,
//           url,
//         });
//       } else {
//         await navigator.clipboard.writeText(shareText);
//         toast.success(
//           isHindi
//             ? "शेयर मैसेज कॉपी हो गया! अब कहीं भी भेजें 🐐"
//             : t.shareCopied
//         );
//       }
//     } catch {}
//   };

//   const handleChat = async () => {
//     if (!session) {
//       router.push("/login");
//       return;
//     }

//     try {
//       const { data } = await axios.post("/api/chat", {
//         goatId: goat._id,
//         // Pass metadata as fallback for static/demo goats not in MongoDB
//         goatName: goat.name,
//         goatImage: goat.images?.[0] || "",
//         sellerId:
//           typeof goat.seller === "string"
//             ? goat.seller
//             : String(goat.seller || ""),
//         sellerName: goat.sellerName || "",
//       });

//       if (data.success) {
//         router.push(`/chat/${data.data._id}`);
//       } else {
//         toast.error(data.error || "Could not open chat room");
//       }
//     } catch (err: any) {
//       const msg =
//         err?.response?.data?.error || "Could not open chat room";
//       toast.error(msg);
//     }
//   };

//   const formatAge = (ageStr: string) => {
//     if (!ageStr) return "";

//     if (isHindi) {
//       return ageStr
//         .replace(/months?/gi, "महीने")
//         .replace(/years?/gi, "साल")
//         .replace(/teeth/gi, "दांत")
//         .replace(/tooth/gi, "दांत");
//     }

//     return ageStr;
//   };

//   const allImages =
//     goat.images && goat.images.length > 0
//       ? goat.images
//       : [
//           "https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=1200&q=80",
//         ];

//   return (
//     <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 overflow-x-hidden">
//       {/* Breadcrumb Navigation */}
//       <nav className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-sans mb-6">
//         <Link
//           href="/"
//           className="hover:text-zinc-950 dark:hover:text-white transition-colors"
//         >
//           {isHindi ? "होम" : "Home"}
//         </Link>

//         <ChevronRight size={13} />

//         <Link
//           href="/shop"
//           className="hover:text-zinc-950 dark:hover:text-white transition-colors"
//         >
//           {t.navShop}
//         </Link>

//         <ChevronRight size={13} />

//         <Link
//           href={`/shop?breed=${goat.breed}`}
//           className="hover:text-zinc-950 dark:hover:text-white transition-colors"
//         >
//           {translateBreed(goat.breed)}
//         </Link>

//         <ChevronRight size={13} />

//         <span className="text-zinc-950 dark:text-white font-bold truncate max-w-[160px]">
//           {goat.name}
//         </span>
//       </nav>

//       {/* Main Product Showcase Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
//         {/* ── LEFT: Visual Media Showcase (7 cols) ── */}
//         <div className="lg:col-span-7 space-y-4">
//           {/* Photos vs Video Tab Switcher */}
//           {goat.videoUrl && (
//             <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-fit border border-zinc-200 dark:border-zinc-800">
//               <button
//                 type="button"
//                 onClick={() => setShowVideo(false)}
//                 className={`px-4 py-1.5 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 ${
//                   !showVideo
//                     ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
//                     : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
//                 }`}
//               >
//                 📸{" "}
//                 {isHindi
//                   ? `फोटो गैलरी (${allImages.length})`
//                   : `Photos (${allImages.length})`}
//               </button>

//               <button
//                 type="button"
//                 onClick={() => setShowVideo(true)}
//                 className={`px-4 py-1.5 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 ${
//                   showVideo
//                     ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
//                     : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
//                 }`}
//               >
//                 🎬{" "}
//                 {isHindi
//                   ? "लाइव फार्म वीडियो निरीक्षण"
//                   : "Live Farm Video Inspection"}
//               </button>
//             </div>
//           )}

//           <div className="rounded-3xl overflow-hidden relative border border-zinc-200 dark:border-zinc-800 shadow-xl bg-zinc-950 h-[360px] sm:h-[460px]">
//             {showVideo && goat.videoUrl ? (
//               <div className="w-full h-full relative bg-black flex items-center justify-center">
//                 <video
//                   src={goat.videoUrl}
//                   controls
//                   autoPlay
//                   playsInline
//                   className="w-full h-full object-contain"
//                 />

//                 <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-bold font-sans uppercase bg-red-600/90 text-white backdrop-blur-xs flex items-center gap-1.5">
//                   <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
//                   {isHindi
//                     ? "लाइव वीडियो निरीक्षण"
//                     : "Live Video Inspection"}
//                 </div>
//               </div>
//             ) : (
//               <img
//                 src={selectedImg || allImages[0]}
//                 alt={goat.name}
//                 className="w-full h-full object-cover"
//                 onError={(e) => {
//                   (e.target as HTMLImageElement).src =
//                     "https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=1200&q=80";
//                 }}
//               />
//             )}

//             {/* Status Badges */}
//             {!showVideo && (
//               <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
//                 <span
//                   className={`px-3.5 py-1.5 rounded-full text-xs font-black font-sans tracking-wider uppercase shadow-md ${
//                     sold
//                       ? "bg-zinc-900 text-white border border-zinc-700"
//                       : reserved
//                       ? "bg-amber-600 text-white"
//                       : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border border-zinc-800 dark:border-zinc-200"
//                   }`}
//                 >
//                   {sold
//                     ? t.statusSold
//                     : reserved
//                     ? t.statusReserved
//                     : t.statusForSale}
//                 </span>

//                 {goat.videoUrl && (
//                   <button
//                     type="button"
//                     onClick={() => setShowVideo(true)}
//                     className="px-3 py-1 rounded-full text-xs font-bold font-sans uppercase bg-black/80 hover:bg-black text-[#ffd700] backdrop-blur-md border border-[#ffd700]/40 flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105"
//                   >
//                     ▶️ {isHindi ? "वीडियो चलाएं" : "Play Video"}
//                   </button>
//                 )}
//               </div>
//             )}

//             {/* Wishlist & Share Floating Buttons */}
//             <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
//               <button
//                 type="button"
//                 onClick={handleWishlist}
//                 disabled={wishLoading}
//                 className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
//                 title={inWish ? t.removedWishlist : t.addedWishlist}
//               >
//                 <Heart
//                   size={18}
//                   className={
//                     inWish
//                       ? "fill-red-500 text-red-500"
//                       : "hover:text-red-500 transition-colors"
//                   }
//                 />
//               </button>

//               <button
//                 type="button"
//                 onClick={handleShare}
//                 className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
//                 title={t.shareListing}
//               >
//                 <Share2 size={16} />
//               </button>
//             </div>
//           </div>

//           {/* Thumbnail & Video Strip */}
//           <div className="flex gap-3 overflow-x-auto pb-2 items-center">
//             {allImages.map((img, i) => (
//               <button
//                 key={i}
//                 type="button"
//                 onClick={() => {
//                   setSelectedImg(img);
//                   setShowVideo(false);
//                 }}
//                 className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer shadow-xs ${
//                   !showVideo &&
//                   (selectedImg === img || (!selectedImg && i === 0))
//                     ? "border-[#d4af37] scale-105 shadow-md ring-2 ring-[#d4af37]/30"
//                     : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 opacity-80 hover:opacity-100"
//                 }`}
//               >
//                 <img src={img} alt="" className="w-full h-full object-cover" />
//               </button>
//             ))}

//             {/* Video preview thumbnail */}
//             {goat.videoUrl && (
//               <button
//                 type="button"
//                 onClick={() => setShowVideo(true)}
//                 className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer shadow-xs bg-zinc-950 flex flex-col items-center justify-center gap-1 text-white relative group ${
//                   showVideo
//                     ? "border-[#ffd700] ring-2 ring-[#ffd700]/40 scale-105"
//                     : "border-zinc-700 opacity-90 hover:opacity-100"
//                 }`}
//               >
//                 <div className="w-7 h-7 rounded-full bg-[#d4af37] text-zinc-950 flex items-center justify-center text-xs font-bold shadow-md group-hover:scale-110 transition-transform">
//                   ▶
//                 </div>

//                 <span className="text-[9px] font-bold uppercase font-sans text-amber-300">
//                   {isHindi ? "वीडियो" : "Video"}
//                 </span>
//               </button>
//             )}
//           </div>
//         </div>

//         {/* ── RIGHT: Details, Specifications, Seller & Buy Box (5 cols) ── */}
//         <div className="lg:col-span-5 space-y-6">
//           {/* Title & Price Header */}
//           <div className="space-y-2 pb-5 border-b border-zinc-200 dark:border-zinc-800">
//             <div className="flex items-center gap-2">
//               <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-sans bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
//                 {translateBreed(goat.breed)}{" "}
//                 {isHindi ? "वंशावली" : "Bloodline"}
//               </span>

//               <span className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full font-sans font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
//                 <CheckCircle2 size={12} />{" "}
//                 {isHindi ? "✓ डॉक्टर द्वारा परीक्षित" : "Vet Inspected"}
//               </span>
//             </div>

//             <h1 className="text-3xl sm:text-4xl font-black font-serif text-zinc-950 dark:text-white leading-tight">
//               {goat.name}
//             </h1>

//             <div className="flex items-baseline gap-3 pt-1">
//               <span className="text-3xl sm:text-4xl font-extrabold font-serif text-zinc-950 dark:text-white">
//                 {fmt(goat.price)}
//               </span>

//               <span className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
//                 {isHindi
//                   ? "(100% सुरक्षित भुगतान एवं स्वास्थ्य प्रमाणपत्र सहित)"
//                   : "(Inclusive of Direct Buyer Protection & Health Cert)"}
//               </span>
//             </div>
//           </div>

//           {/* Key Specifications Grid */}
//           <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
//             <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans mb-3">
//               {isHindi
//                 ? "आधिकारिक शारीरिक विनिर्देश"
//                 : "Official Physical Specifications"}
//             </h3>

//             <div className="grid grid-cols-2 gap-3 text-xs font-sans">
//               <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
//                 <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
//                   {t.breed}
//                 </span>
//                 <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
//                   {translateBreed(goat.breed)}
//                 </span>
//               </div>

//               <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
//                 <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
//                   {t.weightSpec}
//                 </span>
//                 <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
//                   ⚖️ {goat.weight} {t.kg}
//                 </span>
//               </div>

//               <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
//                 <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
//                   {t.age}
//                 </span>
//                 <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
//                   📅 {formatAge(goat.age)}
//                 </span>
//               </div>

//               <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
//                 <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
//                   {t.vaccinated}
//                 </span>

//                 <span
//                   className={`font-bold text-sm ${
//                     goat.vaccinated
//                       ? "text-emerald-600 dark:text-emerald-400"
//                       : "text-amber-600"
//                   }`}
//                 >
//                   {goat.vaccinated
//                     ? isHindi
//                       ? "✓ पूर्ण टीकाकृत"
//                       : "✓ Fully Vaccinated"
//                     : isHindi
//                     ? "प्राथमिक टीकाकरण"
//                     : "Basic Inoculation"}
//                 </span>
//               </div>

//               <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
//                 <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
//                   {isHindi ? "स्वास्थ्य" : "General Health"}
//                 </span>

//                 <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
//                   ✓ {isHindi ? "उत्कृष्ट" : goat.health || "Excellent"}
//                 </span>
//               </div>

//               <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
//                 <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
//                   {isHindi ? "पहचान टैग" : "Identification Tag"}
//                 </span>

//                 <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
//                   {goat.tag || `#GM-${goat._id.slice(-6).toUpperCase()}`}
//                 </span>
//               </div>
//             </div>
//           </div>

//           {/* Description */}
//           <div>
//             <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans mb-1.5">
//               {t.description}
//             </h3>

//             <p className="text-sm text-zinc-600 dark:text-zinc-300 font-sans leading-relaxed">
//               {goat.desc}
//             </p>
//           </div>

//           {/* Verified Farm / Seller Box */}
//           <div className="rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
//             <div className="flex items-center gap-3.5">
//               <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center text-xl font-bold shadow-sm flex-shrink-0">
//                 {goat.sellerImg ? (
//                   <img
//                     src={goat.sellerImg}
//                     alt=""
//                     className="w-full h-full object-cover rounded-2xl"
//                   />
//                 ) : (
//                   "👨‍🌾"
//                 )}
//               </div>

//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center gap-1.5">
//                   <h4 className="font-bold text-base text-zinc-900 dark:text-white truncate">
//                     {goat.sellerName}
//                   </h4>

//                   <CheckCircle2
//                     size={15}
//                     className="text-emerald-600 dark:text-emerald-400 flex-shrink-0"
//                   />
//                 </div>

//                 <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
//                   📍{" "}
//                   {goat.sellerLoc ||
//                     (isHindi
//                       ? "सत्यापित भारतीय लाइवस्टॉक फार्म"
//                       : "Verified Indian Livestock Farm")}
//                 </p>

//                 <div className="flex items-center gap-2 mt-1 text-xs text-zinc-600 dark:text-zinc-300 font-sans">
//                   <div className="flex text-amber-400">
//                     {[1, 2, 3, 4, 5].map((i) => (
//                       <Star
//                         key={i}
//                         size={12}
//                         className="fill-current"
//                       />
//                     ))}
//                   </div>

//                   <span className="font-bold">
//                     {goat.sellerRating || "4.9"}
//                   </span>

//                   <span className="text-zinc-400">
//                     ({goat.sellerReviews || "12"}{" "}
//                     {isHindi ? "ऑर्डर" : "orders"})
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Purchase Actions CTA - Desktop */}
//           <div className="pt-2 space-y-3">
//             <div className="flex items-center gap-3">
//               <button
//                 type="button"
//                 onClick={handleChat}
//                 className="flex-1 py-4 rounded-full border border-zinc-950 dark:border-white text-zinc-950 dark:text-white text-sm font-bold font-sans flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
//               >
//                 <MessageSquare size={16} />
//                 <span>{t.chatWithBreeder}</span>
//               </button>

//               <button
//                 type="button"
//                 disabled={sold || reserved}
//                 onClick={() =>
//                   !sold && !reserved
//                     ? session
//                       ? setCheckoutOpen(true)
//                       : router.push("/login")
//                     : null
//                 }
//                 className={`flex-[1.5] py-4 rounded-full text-sm font-bold font-sans flex items-center justify-center gap-2 shadow-xl transition-all ${
//                   sold || reserved
//                     ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
//                     : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 hover:scale-105"
//                 }`}
//               >
//                 <ShoppingCart size={16} />

//                 <span>
//                   {sold
//                     ? t.soldOut
//                     : reserved
//                     ? t.statusReserved
//                     : `${t.buyNow} • ${fmt(goat.price)}`}
//                 </span>
//               </button>
//             </div>

//             {/* Escrow Guarantee Pill */}
//             <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-sans pt-1">
//               <ShieldCheck
//                 size={14}
//                 className="text-zinc-900 dark:text-white"
//               />
//               <span>{t.escrowAssurance}</span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Mobile Fixed Purchase Bar */}
//       <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.10)]">
//         <div className="flex items-center gap-2 max-w-[1200px] mx-auto">
//           <button
//             type="button"
//             onClick={handleChat}
//             className="flex-1 h-12 rounded-2xl border border-zinc-950 dark:border-white text-zinc-950 dark:text-white text-sm font-bold font-sans flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
//           >
//             <MessageSquare size={17} />
//             <span>{t.chatWithBreeder}</span>
//           </button>

//           <button
//             type="button"
//             disabled={sold || reserved}
//             onClick={() =>
//               !sold && !reserved
//                 ? session
//                   ? setCheckoutOpen(true)
//                   : router.push("/login")
//                 : null
//             }
//             className={`flex-[1.35] h-12 rounded-2xl text-sm font-bold font-sans flex items-center justify-center gap-2 active:scale-[0.98] transition-transform ${
//               sold || reserved
//                 ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
//                 : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
//             }`}
//           >
//             <ShoppingCart size={17} />

//             <span>
//               {sold
//                 ? t.soldOut
//                 : reserved
//                 ? t.statusReserved
//                 : `${t.buyNow} • ${fmt(goat.price)}`}
//             </span>
//           </button>
//         </div>
//       </div>

//       {/* Customer Reviews Section */}
//       <div className="mt-16 pt-10 border-t border-zinc-200 dark:border-zinc-800">
//         <ReviewSection
//           goatId={goat._id}
//           initialReviews={goat.reviews ?? []}
//         />
//       </div>

//       {/* Checkout Modal */}
//       {checkoutOpen && (
//         <CheckoutModal
//           goat={goat}
//           onClose={() => setCheckoutOpen(false)}
//         />
//       )}
//     </div>
//   );
// }



"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  Share2,
  MessageSquare,
  ShoppingCart,
  Star,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import CheckoutModal from "@/components/payment/CheckoutModal";
import ReviewSection from "@/components/goat/ReviewSection";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { fmt } from "@/lib/utils";
import type { Goat } from "@/types";

import { shareGoat } from "@/lib/shareGoat";

export default function GoatDetailClient({ goat }: { goat: Goat }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { wishlist, toggleWishlist } = useStore();
  const { t, translateBreed, isHindi } = useTranslation();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(
    goat.images?.[0] || null
  );
  const [showVideo, setShowVideo] = useState(false);

  const sold = goat.status === "sold";
  const reserved = goat.status === "reserved";
  const inWish = wishlist.includes(goat._id);

  const handleWishlist = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    setWishLoading(true);

    try {
      await axios.post("/api/user/wishlist", { goatId: goat._id });
      toggleWishlist(goat._id);

      toast.success(inWish ? t.removedWishlist : t.addedWishlist);
    } catch {
      toast.error("Failed to update wishlist");
    } finally {
      setWishLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const result = await shareGoat(goat);
      if (result === "copied") {
        toast.success(
          isHindi
            ? "शेयर मैसेज कॉपी हो गया! अब कहीं भी भेजें 🐐"
            : t.shareCopied
        );
      }
    } catch {}
  };

  const handleChat = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    try {
      const { data } = await axios.post("/api/chat", {
        goatId: goat._id,
        goatName: goat.name,
        goatImage: goat.images?.[0] || "",
        sellerId:
          typeof goat.seller === "string"
            ? goat.seller
            : String(goat.seller || ""),
        sellerName: goat.sellerName || "",
      });

      if (data.success) {
        router.push(`/chat/${data.data._id}`);
      } else {
        toast.error(data.error || "Could not open chat room");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || "Could not open chat room";

      toast.error(msg);
    }
  };

  const formatAge = (ageStr: string) => {
    if (!ageStr) return "";

    if (isHindi) {
      return ageStr
        .replace(/months?/gi, "महीने")
        .replace(/years?/gi, "साल")
        .replace(/teeth/gi, "दांत")
        .replace(/tooth/gi, "दांत");
    }

    return ageStr;
  };

  const allImages =
    goat.images && goat.images.length > 0
      ? goat.images
      : [
          "https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=1200&q=80",
        ];

  return (
    <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 overflow-x-hidden">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-sans mb-6">
        <Link
          href="/"
          className="hover:text-zinc-950 dark:hover:text-white transition-colors"
        >
          {isHindi ? "होम" : "Home"}
        </Link>

        <ChevronRight size={13} />

        <Link
          href="/shop"
          className="hover:text-zinc-950 dark:hover:text-white transition-colors"
        >
          {t.navShop}
        </Link>

        <ChevronRight size={13} />

        <Link
          href={`/shop?breed=${goat.breed}`}
          className="hover:text-zinc-950 dark:hover:text-white transition-colors"
        >
          {translateBreed(goat.breed)}
        </Link>

        <ChevronRight size={13} />

        <span className="text-zinc-950 dark:text-white font-bold truncate max-w-[160px]">
          {goat.name}
        </span>
      </nav>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* LEFT: Visual Media Showcase */}
        <div className="lg:col-span-7 space-y-4">
          {/* Photos vs Video Tab Switcher */}
          {goat.videoUrl && (
            <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-fit border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowVideo(false)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 ${
                  !showVideo
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                📸{" "}
                {isHindi
                  ? `फोटो गैलरी (${allImages.length})`
                  : `Photos (${allImages.length})`}
              </button>

              <button
                type="button"
                onClick={() => setShowVideo(true)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 ${
                  showVideo
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                🎬{" "}
                {isHindi
                  ? "लाइव फार्म वीडियो निरीक्षण"
                  : "Live Farm Video Inspection"}
              </button>
            </div>
          )}

          <div className="rounded-3xl overflow-hidden relative border border-zinc-200 dark:border-zinc-800 shadow-xl bg-zinc-950 h-[360px] sm:h-[460px]">
            {showVideo && goat.videoUrl ? (
              <div className="w-full h-full relative bg-black flex items-center justify-center">
                <video
                  src={goat.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />

                <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-bold font-sans uppercase bg-red-600/90 text-white backdrop-blur-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {isHindi
                    ? "लाइव वीडियो निरीक्षण"
                    : "Live Video Inspection"}
                </div>
              </div>
            ) : (
              <img
                src={selectedImg || allImages[0]}
                alt={goat.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=1200&q=80";
                }}
              />
            )}

            {!showVideo && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black font-sans tracking-wider uppercase shadow-md ${
                    sold
                      ? "bg-zinc-900 text-white border border-zinc-700"
                      : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border border-zinc-800 dark:border-zinc-200"
                  }`}
                >
                  {sold
                    ? t.statusSold
                    : t.statusForSale}
                </span>

                {goat.videoUrl && (
                  <button
                    type="button"
                    onClick={() => setShowVideo(true)}
                    className="px-3 py-1 rounded-full text-xs font-bold font-sans uppercase bg-black/80 hover:bg-black text-[#ffd700] backdrop-blur-md border border-[#ffd700]/40 flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105"
                  >
                    ▶️ {isHindi ? "वीडियो चलाएं" : "Play Video"}
                  </button>
                )}
              </div>
            )}

            {/* Wishlist & Share */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button
                type="button"
                onClick={handleWishlist}
                disabled={wishLoading}
                className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                title={inWish ? t.removedWishlist : t.addedWishlist}
              >
                <Heart
                  size={18}
                  className={
                    inWish
                      ? "fill-red-500 text-red-500"
                      : "hover:text-red-500 transition-colors"
                  }
                />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
                title={t.shareListing}
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* Thumbnail & Video Strip */}
          <div className="flex gap-3 overflow-x-auto pb-2 items-center">
            {allImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSelectedImg(img);
                  setShowVideo(false);
                }}
                className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer shadow-xs ${
                  !showVideo &&
                  (selectedImg === img || (!selectedImg && i === 0))
                    ? "border-[#d4af37] scale-105 shadow-md ring-2 ring-[#d4af37]/30"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 opacity-80 hover:opacity-100"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}

            {goat.videoUrl && (
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer shadow-xs bg-zinc-950 flex flex-col items-center justify-center gap-1 text-white relative group ${
                  showVideo
                    ? "border-[#ffd700] ring-2 ring-[#ffd700]/40 scale-105"
                    : "border-zinc-700 opacity-90 hover:opacity-100"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[#d4af37] text-zinc-950 flex items-center justify-center text-xs font-bold shadow-md group-hover:scale-110 transition-transform">
                  ▶
                </div>

                <span className="text-[9px] font-bold uppercase font-sans text-amber-300">
                  {isHindi ? "वीडियो" : "Video"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: Details */}
        <div className="lg:col-span-5 space-y-6">
          {/* Title & Price */}
          <div className="space-y-2 pb-5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-sans bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
                {translateBreed(goat.breed)}{" "}
                {isHindi ? "वंशावली" : "Bloodline"}
              </span>

              <span className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full font-sans font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={12} />{" "}
                {isHindi ? "✓ डॉक्टर द्वारा परीक्षित" : "Vet Inspected"}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black font-serif text-zinc-950 dark:text-white leading-tight">
              {goat.name}
            </h1>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-serif text-zinc-950 dark:text-white">
                {fmt(goat.price)}
              </span>

              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                {isHindi
                  ? "(100% सुरक्षित भुगतान एवं स्वास्थ्य प्रमाणपत्र सहित)"
                  : "(Inclusive of Direct Buyer Protection & Health Cert)"}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs font-sans">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                🚚 {goat.deliveryCharge && goat.deliveryCharge > 0
                  ? `+ ${fmt(goat.deliveryCharge)} ${isHindi ? "डिलीवरी शुल्क" : "Delivery Fee"}`
                  : isHindi
                  ? "मुफ़्त डिलीवरी (Free Delivery)"
                  : "Free Delivery"}
              </span>
            </div>
          </div>

          {/* Specifications */}
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans mb-3">
              {isHindi
                ? "आधिकारिक शारीरिक विनिर्देश"
                : "Official Physical Specifications"}
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs font-sans">
              <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  {t.breed}
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {translateBreed(goat.breed)}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  {t.weightSpec}
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  ⚖️ {goat.weight} {t.kg}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  {t.age}
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  📅 {formatAge(goat.age)}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  {t.vaccinated}
                </span>

                <span
                  className={`font-bold text-sm ${
                    goat.vaccinated
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600"
                  }`}
                >
                  {goat.vaccinated
                    ? isHindi
                      ? "✓ पूर्ण टीकाकृत"
                      : "✓ Fully Vaccinated"
                    : isHindi
                    ? "प्राथमिक टीकाकरण"
                    : "Basic Inoculation"}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  {isHindi ? "स्वास्थ्य" : "General Health"}
                </span>

                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  ✓ {isHindi ? "उत्कृष्ट" : goat.health || "Excellent"}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  {isHindi ? "पहचान टैग" : "Identification Tag"}
                </span>

                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {goat.tag || `#GM-${goat._id.slice(-6).toUpperCase()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans mb-1.5">
              {t.description}
            </h3>

            <p className="text-sm text-zinc-600 dark:text-zinc-300 font-sans leading-relaxed">
              {goat.desc}
            </p>
          </div>

          {/* Seller */}
          <div className="rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center text-xl font-bold shadow-sm flex-shrink-0">
                {goat.sellerImg ? (
                  <img
                    src={goat.sellerImg}
                    alt=""
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  "👨‍🌾"
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-base text-zinc-900 dark:text-white truncate">
                    {goat.sellerName}
                  </h4>

                  <CheckCircle2
                    size={15}
                    className="text-emerald-600 dark:text-emerald-400 flex-shrink-0"
                  />
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                  📍{" "}
                  {goat.sellerLoc ||
                    (isHindi
                      ? "सत्यापित भारतीय लाइवस्टॉक फार्म"
                      : "Verified Indian Livestock Farm")}
                </p>

                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-600 dark:text-zinc-300 font-sans">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={12} className="fill-current" />
                    ))}
                  </div>

                  <span className="font-bold">
                    {goat.sellerRating || "4.9"}
                  </span>

                  <span className="text-zinc-400">
                    ({goat.sellerReviews || "12"}{" "}
                    {isHindi ? "ऑर्डर" : "orders"})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Purchase Actions */}
          <div className="pt-2 space-y-3 hidden sm:block">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleChat}
                className="flex-1 py-4 rounded-full border border-zinc-950 dark:border-white text-zinc-950 dark:text-white text-sm font-bold font-sans flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <MessageSquare size={16} />
                <span>{t.chatWithBreeder}</span>
              </button>

              <button
                type="button"
                disabled={sold}
                onClick={() =>
                  !sold
                    ? session
                      ? setCheckoutOpen(true)
                      : router.push("/login")
                    : null
                }
                className={`flex-[1.5] py-4 rounded-full text-sm font-bold font-sans flex items-center justify-center gap-2 shadow-xl transition-all ${
                  sold
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 hover:scale-105"
                }`}
              >
                <ShoppingCart size={16} />

                <span>
                  {sold
                    ? t.soldOut
                    : `${t.buyNow} • ${fmt(goat.price)}`}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-sans pt-1">
              <ShieldCheck
                size={14}
                className="text-zinc-900 dark:text-white"
              />
              <span>{t.escrowAssurance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Purchase Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[60] border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.10)]">
        <div className="flex items-center gap-2 max-w-[1200px] mx-auto">
          <button
            type="button"
            onClick={handleChat}
            className="flex-1 h-12 rounded-2xl border border-zinc-950 dark:border-white text-zinc-950 dark:text-white text-sm font-bold font-sans flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <MessageSquare size={17} />
            <span>{t.chatWithBreeder}</span>
          </button>

          <button
            type="button"
            disabled={sold}
            onClick={() =>
              !sold
                ? session
                  ? setCheckoutOpen(true)
                  : router.push("/login")
                : null
            }
            className={`flex-[1.35] h-12 rounded-2xl text-sm font-bold font-sans flex items-center justify-center gap-2 active:scale-[0.98] transition-transform ${
              sold
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
            }`}
          >
            <ShoppingCart size={17} />

            <span>
              {sold
                ? t.soldOut
                : `${t.buyNow} • ${fmt(goat.price)}`}
            </span>
          </button>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="mt-16 pt-10 border-t border-zinc-200 dark:border-zinc-800">
        <ReviewSection
          goatId={goat._id}
          initialReviews={goat.reviews ?? []}
        />
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && (
        <CheckoutModal
          goat={goat}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </div>
  );
}
