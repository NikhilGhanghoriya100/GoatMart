// "use client";
// import { useState, useEffect } from "react";
// import { useSession, signOut } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import axios from "axios";
// import toast from "react-hot-toast";
// import { fmt } from "@/lib/utils";

// const G = "#c8a96e", DG = "#8b5e2a";

// const TABS = [
//   { id: "dashboard", ic: "Ã°Å¸â€œÅ ", l: "Dashboard" },
//   { id: "goats", ic: "Ã°Å¸ÂÂ", l: "Goats" },
//   { id: "orders", ic: "Ã°Å¸â€œÂ¦", l: "Orders" },
//   { id: "sellers", ic: "Ã°Å¸ÂÂª", l: "Sellers" },
//   { id: "customers", ic: "Ã°Å¸â€˜Â¥", l: "Customers" },
//   { id: "chats", ic: "Ã°Å¸â€™Â¬", l: "Chat Monitor" },
//   { id: "banners", ic: "Ã°Å¸â€“Â¼Ã¯Â¸Â", l: "Banners" },
//   { id: "analytics", ic: "Ã°Å¸â€œË†", l: "Analytics" },
// ];

// function Stat({ icon, val, lbl, clr }: any) {
//   return (
//     <div className="rounded-2xl p-4 border relative overflow-hidden" style={{ background: "#1a1a1a", borderColor: "#252525" }}>
//       <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 80% 20%,${clr || G}18,transparent)` }} />
//       <div className="text-2xl mb-2">{icon}</div>
//       <div className="text-2xl font-bold text-white mb-0.5">{val}</div>
//       <div className="text-xs text-gray-500 uppercase tracking-wider font-sans">{lbl}</div>
//     </div>
//   );
// }

// export default function AdminDashboard() {
//   const { data: session } = useSession();
//   const router = useRouter();
//   const [tab, setTab] = useState("dashboard");
//   const [stats, setStats] = useState<any>(null);
//   const [sellers, setSellers] = useState<any[]>([]);
//   const [orders, setOrders] = useState<any[]>([]);
//   const [goats, setGoats] = useState<any[]>([]);
//   const [customers, setCustomers] = useState<any[]>([]);
//   const [chats, setChats] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [actionLoading, setActionLoading] = useState(false);

//   // Simple 3-image banner manager
//   const [bannerData, setBannerData] = useState<any[]>([
//     { slideIndex: 0, imageUrl: "" },
//     { slideIndex: 1, imageUrl: "" },
//     { slideIndex: 2, imageUrl: "" },
//   ]);
//   const [bannerImgUploading, setBannerImgUploading] = useState<number | null>(null);

//   useEffect(() => {
//     Promise.all([
//       axios.get("/api/admin/stats"),
//       axios.get("/api/sellers"),
//       axios.get("/api/orders"),
//       axios.get("/api/goats?status=all&limit=50"),
//     ])
//       .then(([s, sel, ord, g]) => {
//         if (s.data.success) setStats(s.data.data);
//         if (sel.data.success) setSellers(sel.data.data);
//         if (ord.data.success) setOrders(ord.data.data);
//         if (g.data.success) setGoats(g.data.data);
//       })
//       .catch((error) => {
//         console.error("Failed to load admin dashboard data:", error);
//         toast.error("Failed to load dashboard data");
//       })
//       .finally(() => setLoading(false));
//   }, []);
//   const uploadBannerImage = async (idx: number, file: File) => {
//     if (!file.type.startsWith("image/")) {
//       toast.error("Only image files are allowed");
//       return;
//     }

//     if (file.size > 10 * 1024 * 1024) {
//       toast.error("Maximum banner size is 10MB");
//       return;
//     }

//     setBannerImgUploading(idx);

//     try {
//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("slideIndex", String(idx));

//       const { data } = await axios.post("/api/banners/upload", formData);

//       if (data.success) {
//         setBannerData((prev) =>
//           prev.map((banner, i) =>
//             i === idx
//               ? {
//                   ...banner,
//                   slideIndex: idx,
//                   imageUrl: data.data?.imageUrl || "",
//                 }
//               : banner
//           )
//         );

//         toast.success(`Banner ${idx + 1} uploaded successfully`);
//       } else {
//         toast.error(data.error || "Banner upload failed");
//       }
//     } catch (err: any) {
//       toast.error(
//         err?.response?.data?.error || "Banner upload failed"
//       );
//     } finally {
//       setBannerImgUploading(null);
//     }
//   };
//   const approveSeller = async (id: string, status: string) => {
//     try {
//       setActionLoading(true);
//       const { data } = await axios.patch(`/api/sellers/${id}`, { status });
//       if (data.success) {
//         setSellers((prev) =>
//           prev.map((s) =>
//             s._id === id ? { ...s, sellerProfile: { ...s.sellerProfile, status } } : s
//           )
//         );
//         toast.success(`Seller status changed to ${status}!`);
//       }
//     } catch (err: any) {
//       toast.error(err?.response?.data?.error || "Failed to update seller");
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const toggleGoatStatus = async (id: string, current: string) => {
//     const newStatus = current === "sold" ? "sale" : "sold";
//     try {
//       const { data } = await axios.patch(`/api/goats/${id}`, { status: newStatus });
//       if (data.success) {
//         setGoats((prev) => prev.map((g) => (g._id === id ? { ...g, status: newStatus } : g)));
//         toast.success(`Goat listing marked as ${newStatus}`);
//       }
//     } catch {
//       toast.error("Failed to update status");
//     }
//   };

//   const deleteGoat = async (id: string) => {
//     if (!confirm("Are you sure you want to permanently delete this goat listing?")) return;
//     try {
//       const { data } = await axios.delete(`/api/goats/${id}`);
//       if (data.success) {
//         setGoats((prev) => prev.filter((g) => g._id !== id));
//         toast.success("Listing deleted");
//       }
//     } catch {
//       toast.error("Failed to delete listing");
//     }
//   };

//   const updateOrderStatus = async (orderId: string, status: string) => {
//     try {
//       const { data } = await axios.patch(`/api/orders/${orderId}`, { status });
//       if (data.success) {
//         setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status } : o)));
//         toast.success(`Order marked as ${status}`);
//       }
//     } catch {
//       toast.error("Failed to update order status");
//     }
//   };

//   const sidebarItem = (t: any) => {
//     const active = tab === t.id;
//     const pending = t.id === "sellers" ? sellers.filter((s) => s.sellerProfile?.status === "pending").length : 0;
//     return (
//       <div
//         key={t.id}
//         onClick={() => setTab(t.id)}
//         style={{
//           background: active ? `${G}15` : "transparent",
//           borderLeft: active ? `3px solid ${G}` : "3px solid transparent",
//           color: active ? G : "#888",
//         }}
//         className="flex items-center gap-2.5 px-4 py-3 cursor-pointer text-sm font-sans transition-colors hover:bg-[#1a1a1a]"
//       >
//         <span>{t.ic}</span>
//         <span className="flex-1 font-medium">{t.l}</span>
//         {pending > 0 && (
//           <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-[#f5a623]">
//             {pending}
//           </span>
//         )}
//       </div>
//     );
//   };

//   // Real Analytics: Revenue by Breed
//   const breedRevenueMap: Record<string, number> = {};
//   orders.forEach((o) => {
//     const breed = o.goatBreed || "Other";
//     breedRevenueMap[breed] = (breedRevenueMap[breed] || 0) + (o.amount || 0);
//   });
//   const maxBreedRev = Math.max(1, ...Object.values(breedRevenueMap));

//   return (
//     <div className="flex flex-col md:flex-row min-h-screen bg-[#0f0f0f] text-gray-200 w-full max-w-full overflow-x-hidden">
//       {/* Mobile Top Header */}
//       <div className="md:hidden p-4 border-b border-[#1f1f1f] bg-[#141414] flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <span className="text-xl">Ã°Å¸ÂÂ</span>
//           <div>
//             <div className="font-bold text-sm text-[#c8a96e]">GoatMart</div>
//             <div className="text-[9px] uppercase text-gray-500 font-sans">Admin Panel</div>
//           </div>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => router.push("/")}
//             className="px-2.5 py-1 rounded-lg bg-[#222] text-xs text-gray-300 font-sans"
//           >
//             Marketplace
//           </button>
//           <button
//             onClick={() => signOut({ callbackUrl: "/" })}
//             className="px-2.5 py-1 rounded-lg bg-red-950/40 text-xs text-red-400 font-sans"
//           >
//             Logout
//           </button>
//         </div>
//       </div>

//       {/* Mobile Horizontal Tabs */}
//       <div className="md:hidden flex gap-1 p-2 bg-[#121212] border-b border-[#1f1f1f] overflow-x-auto scrollbar-none">
//         {TABS.map((t) => {
//           const active = tab === t.id;
//           return (
//             <button
//               key={t.id}
//               onClick={() => setTab(t.id)}
//               className={`px-3 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 transition-all ${
//                 active
//                   ? "bg-[#c8a96e] text-zinc-950 font-bold shadow-xs"
//                   : "text-gray-400 hover:text-white bg-[#1a1a1a]"
//               }`}
//             >
//               <span>{t.ic}</span>
//               <span>{t.l}</span>
//             </button>
//           );
//         })}
//       </div>

//       {/* Desktop Sidebar */}
//       <div className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-[#1f1f1f] bg-[#141414]">
//         <div className="p-5 border-b border-[#1f1f1f]">
//           <div className="flex items-center gap-2">
//             <span className="text-2xl">Ã°Å¸ÂÂ</span>
//             <div>
//               <div className="font-bold text-base text-[#c8a96e]">GoatMart</div>
//               <div className="text-[10px] tracking-widest uppercase text-gray-500 font-sans">Admin Control Panel</div>
//             </div>
//           </div>
//         </div>

//         <div className="flex-1 py-2">{TABS.map(sidebarItem)}</div>

//         <div className="p-4 border-t border-[#1f1f1f] space-y-1">
//           <div
//             onClick={() => router.push("/")}
//             className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm font-sans text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 transition-colors"
//           >
//             <span>Ã°Å¸Å’Â</span>
//             <span>View Marketplace</span>
//           </div>
//           <div
//             onClick={() => signOut({ callbackUrl: "/" })}
//             className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm font-sans text-red-400 hover:bg-red-950/30 transition-colors"
//           >
//             <span>Ã°Å¸Å¡Âª</span>
//             <span>Logout</span>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col w-full min-w-0 overflow-x-hidden">
//         {/* Top Header (Desktop) */}
//         <div className="hidden md:flex px-8 py-4 border-b border-[#1f1f1f] items-center justify-between sticky top-0 z-10 bg-[#0f0f0f]/90 backdrop-blur-md">
//           <div>
//             <h1 className="text-xl font-bold capitalize text-white font-serif">{tab}</h1>
//             <p className="text-xs text-gray-500 font-sans mt-0.5">
//               Admin: {session?.user?.name || "Admin"} Ã¢â‚¬Â¢ {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
//             </p>
//           </div>
//           <div className="flex items-center gap-3">
//             <span className="px-3 py-1 rounded-full text-xs font-sans font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5">
//               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> System Active
//             </span>
//           </div>
//         </div>

//         {/* Dynamic Tab Body */}
//         <div className="flex-1 overflow-y-auto p-4 sm:p-8 w-full max-w-full">
//           {loading ? (
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
//               {[1, 2, 3, 4, 5, 6].map((i) => (
//                 <div key={i} className="h-28 rounded-2xl animate-pulse bg-[#1a1a1a] border border-[#252525]" />
//               ))}
//             </div>
//           ) : (
//             <>
//               {/* DASHBOARD TAB */}
//               {tab === "dashboard" && (
//                 <div className="space-y-6">
//                   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
//                     <Stat icon="Ã°Å¸â€™Â°" val={stats ? fmt(stats.totalRevenue) : "Ã¢â€šÂ¹0"} lbl="Total Revenue" clr={G} />
//                     <Stat icon="Ã°Å¸â€œÂ¦" val={stats?.totalOrders || 0} lbl="Orders" clr="#5ec87e" />
//                     <Stat icon="Ã°Å¸ÂÂ" val={stats?.activeGoats || 0} lbl="Active Goats" clr="#5e9ec8" />
//                     <Stat icon="Ã¢Å“â€¦" val={stats?.soldGoats || 0} lbl="Sold Goats" clr="#a06ef0" />
//                     <Stat icon="Ã°Å¸ÂÂª" val={stats?.totalSellers || 0} lbl="Sellers" clr="#c87e5e" />
//                     <Stat icon="Ã¢ÂÂ³" val={stats?.pendingSellers || 0} lbl="Pending Approvals" clr="#f5a623" />
//                   </div>

//                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                     {/* Recent Orders */}
//                     <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
//                       <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between">
//                         <h2 className="font-bold text-sm text-white font-serif">Recent Orders</h2>
//                         <button onClick={() => setTab("orders")} className="text-xs text-[#c8a96e] hover:underline font-sans">
//                           View All ({orders.length}) Ã¢â€ â€™
//                         </button>
//                       </div>
//                       <div className="divide-y divide-[#222]">
//                         {orders.slice(0, 6).map((o) => (
//                           <div key={o._id} className="px-5 py-3 flex items-center gap-3">
//                             <div className="flex-1 min-w-0">
//                               <div className="text-sm font-semibold text-gray-200 truncate">{o.goatName}</div>
//                               <div className="text-xs text-gray-500 font-sans">
//                                 {o.customerName} Ã¢â€ â€™ {o.sellerName}
//                               </div>
//                             </div>
//                             <div className="text-sm font-bold text-[#c8a96e]">{fmt(o.amount)}</div>
//                             <span className="text-xs px-2.5 py-0.5 rounded-full font-sans font-bold bg-[#1a3a1a] text-[#5ec87e]">
//                               {o.status}
//                             </span>
//                           </div>
//                         ))}
//                         {orders.length === 0 && <div className="p-8 text-center text-sm text-gray-500">No orders placed yet</div>}
//                       </div>
//                     </div>

//                     {/* Pending Sellers */}
//                     <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
//                       <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between">
//                         <h2 className="font-bold text-sm text-white font-serif">Seller Verification Queue</h2>
//                         <button onClick={() => setTab("sellers")} className="text-xs text-[#c8a96e] hover:underline font-sans">
//                           Manage ({sellers.length}) Ã¢â€ â€™
//                         </button>
//                       </div>
//                       <div className="divide-y divide-[#222]">
//                         {sellers.slice(0, 6).map((s) => (
//                           <div key={s._id} className="px-5 py-3 flex items-center gap-3">
//                             <div className="flex-1 min-w-0">
//                               <div className="text-sm font-semibold text-gray-200 truncate">{s.name}</div>
//                               <div className="text-xs text-gray-500 font-sans">
//                                 {s.sellerProfile?.farmName || "Farm"} Ã¢â‚¬Â¢ {s.sellerProfile?.location || "India"}
//                               </div>
//                             </div>
//                             <span
//                               className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-sans ${
//                                 s.sellerProfile?.status === "approved"
//                                   ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
//                                   : s.sellerProfile?.status === "pending"
//                                   ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
//                                   : "bg-red-950/60 text-red-400 border border-red-800/40"
//                               }`}
//                             >
//                               {s.sellerProfile?.status}
//                             </span>
//                             {s.sellerProfile?.status === "pending" && (
//                               <button
//                                 onClick={() => approveSeller(s._id, "approved")}
//                                 className="text-xs px-2.5 py-1 rounded-lg bg-[#c8a96e] text-black font-bold font-sans hover:opacity-90"
//                               >
//                                 Approve
//                               </button>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* GOATS TAB */}
//               {tab === "goats" && (
//                 <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
//                   <div className="px-6 py-4 border-b border-[#252525] flex items-center justify-between">
//                     <h2 className="font-bold text-base text-white font-serif">All Goat Listings ({goats.length})</h2>
//                   </div>
//                   <div className="divide-y divide-[#222]">
//                     {goats.map((g) => (
//                       <div key={g._id} className="px-6 py-3.5 flex items-center gap-4 flex-wrap">
//                         {g.images?.[0] ? (
//                           <img
//                             src={g.images[0]}
//                             alt=""
//                             className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
//                             onError={(e) => {
//                               (e.target as HTMLImageElement).style.display = "none";
//                             }}
//                           />
//                         ) : (
//                           <div className="w-12 h-12 rounded-xl bg-[#222] flex items-center justify-center text-xl">Ã°Å¸ÂÂ</div>
//                         )}
//                         <div className="flex-1 min-w-[160px]">
//                           <div className="text-sm font-semibold text-white">{g.name}</div>
//                           <div className="text-xs text-gray-500 font-sans">
//                             {g.breed} Ã¢â‚¬Â¢ {g.sellerName} Ã¢â‚¬Â¢ {g.weight} kg
//                           </div>
//                         </div>
//                         <div className="text-sm font-bold text-[#c8a96e] font-sans">{fmt(g.price)}</div>
//                         <span
//                           className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-sans ${
//                             g.status === "sale"
//                               ? "bg-emerald-950/60 text-emerald-400"
//                               : g.status === "reserved"
//                               ? "bg-amber-950/60 text-amber-400"
//                               : "bg-gray-800 text-gray-400"
//                           }`}
//                         >
//                           {g.status}
//                         </span>
//                         <div className="flex items-center gap-2">
//                           <button
//                             onClick={() => toggleGoatStatus(g._id, g.status)}
//                             className="text-xs px-3 py-1.5 rounded-lg border border-[#333] text-gray-300 hover:bg-[#252525] font-sans"
//                           >
//                             {g.status === "sold" ? "Relist" : "Mark Sold"}
//                           </button>
//                           <button
//                             onClick={() => deleteGoat(g._id)}
//                             className="text-xs px-3 py-1.5 rounded-lg bg-red-950/50 text-red-400 hover:bg-red-900/60 font-sans"
//                           >
//                             Delete
//                           </button>
//                         </div>
//                       </div>
//                     ))}
//                     {goats.length === 0 && <div className="p-12 text-center text-gray-500 font-sans">No goat listings found</div>}
//                   </div>
//                 </div>
//               )}

//               {/* ORDERS TAB */}
//               {tab === "orders" && (
//                 <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
//                   <div className="px-6 py-4 border-b border-[#252525] flex items-center justify-between">
//                     <h2 className="font-bold text-base text-white font-serif">All Customer Orders ({orders.length})</h2>
//                   </div>
//                   <div className="divide-y divide-[#222]">
//                     {orders.map((o) => (
//                       <div key={o._id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
//                         <div className="text-xs font-bold font-sans text-[#c8a96e] min-w-[80px]">{o.orderId}</div>
//                         <div className="flex-1 min-w-[140px]">
//                           <div className="text-sm font-semibold text-gray-200">{o.goatName}</div>
//                           <div className="text-xs text-gray-500 font-sans">
//                             Buyer: {o.customerName} Ã¢â‚¬Â¢ Seller: {o.sellerName}
//                           </div>
//                           <div className="text-[11px] text-gray-600 font-sans mt-0.5">
//                             {o.delivery?.city}, {o.delivery?.state} Ã¢â‚¬Â¢ Phone: {o.delivery?.phone}
//                           </div>
//                         </div>
//                         <div className="text-sm font-bold text-[#c8a96e] font-sans">{fmt(o.amount)}</div>
//                         <div className="flex items-center gap-2">
//                           <select
//                             value={o.status}
//                             onChange={(e) => updateOrderStatus(o._id, e.target.value)}
//                             className="text-xs px-2.5 py-1.5 rounded-lg bg-[#222] text-gray-200 border border-[#333] outline-none font-sans cursor-pointer focus:border-[#c8a96e]"
//                           >
//                             <option value="pending">Pending</option>
//                             <option value="payment_confirmed">Payment Confirmed</option>
//                             <option value="processing">Processing</option>
//                             <option value="dispatched">Dispatched</option>
//                             <option value="out_for_delivery">Out for Delivery</option>
//                             <option value="delivered">Delivered</option>
//                             <option value="cancelled">Cancelled</option>
//                           </select>
//                         </div>
//                       </div>
//                     ))}
//                     {orders.length === 0 && <div className="p-12 text-center text-gray-500 font-sans">No orders in the system</div>}
//                   </div>
//                 </div>
//               )}

//               {/* SELLERS TAB */}
//               {tab === "sellers" && (
//                 <div className="space-y-4">
//                   <div className="flex items-center justify-between">
//                     <h2 className="font-bold text-base text-white font-serif">Registered Sellers ({sellers.length})</h2>
//                   </div>
//                   <div className="grid grid-cols-1 gap-3">
//                     {sellers.map((s) => (
//                       <div key={s._id} className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5">
//                         <div className="flex items-center gap-4 flex-wrap justify-between">
//                           <div>
//                             <div className="flex items-center gap-2">
//                               <span className="font-bold text-base text-white">{s.name}</span>
//                               <span
//                                 className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-sans ${
//                                   s.sellerProfile?.status === "approved"
//                                     ? "bg-emerald-950/60 text-emerald-400"
//                                     : s.sellerProfile?.status === "pending"
//                                     ? "bg-amber-950/60 text-amber-400"
//                                     : "bg-red-950/60 text-red-400"
//                                 }`}
//                               >
//                                 {s.sellerProfile?.status}
//                               </span>
//                             </div>
//                             <div className="text-xs text-gray-400 font-sans mt-1">
//                               Ã°Å¸â€œÂ§ {s.email} Ã¢â‚¬Â¢ Ã°Å¸â€œÂ± {s.phone || "No phone"} Ã¢â‚¬Â¢ Ã°Å¸â€œÂ {s.sellerProfile?.location || "Not specified"}
//                             </div>
//                             <div className="text-xs text-[#c8a96e] font-sans mt-1">
//                               Farm: {s.sellerProfile?.farmName || "N/A"} Ã¢â‚¬Â¢ Rating: Ã¢Â­Â {s.sellerProfile?.rating || 5}
//                             </div>
//                           </div>
//                           <div className="flex items-center gap-2">
//                             {s.sellerProfile?.status === "pending" && (
//                               <>
//                                 <button
//                                   onClick={() => approveSeller(s._id, "approved")}
//                                   disabled={actionLoading}
//                                   className="text-xs px-4 py-2 rounded-xl font-bold font-sans bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
//                                 >
//                                   Ã¢Å“â€œ Approve Seller
//                                 </button>
//                                 <button
//                                   onClick={() => approveSeller(s._id, "suspended")}
//                                   disabled={actionLoading}
//                                   className="text-xs px-4 py-2 rounded-xl font-bold font-sans bg-red-800 text-white hover:bg-red-700 transition-colors"
//                                 >
//                                   Ã¢Å“â€” Reject
//                                 </button>
//                               </>
//                             )}
//                             {s.sellerProfile?.status === "approved" && (
//                               <button
//                                 onClick={() => approveSeller(s._id, "suspended")}
//                                 disabled={actionLoading}
//                                 className="text-xs px-4 py-2 rounded-xl font-sans bg-amber-800 text-white hover:bg-amber-700 transition-colors"
//                               >
//                                 Suspend Account
//                               </button>
//                             )}
//                             {s.sellerProfile?.status === "suspended" && (
//                               <button
//                                 onClick={() => approveSeller(s._id, "approved")}
//                                 disabled={actionLoading}
//                                 className="text-xs px-4 py-2 rounded-xl font-sans bg-emerald-700 text-white hover:bg-emerald-600 transition-colors"
//                               >
//                                 Reinstate Seller
//                               </button>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* CUSTOMERS TAB */}
//               {tab === "customers" && (
//                 <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
//                   <div className="px-6 py-4 border-b border-[#252525] flex items-center justify-between">
//                     <h2 className="font-bold text-base text-white font-serif">All Customers ({customers.length})</h2>
//                   </div>
//                   <div className="divide-y divide-[#222]">
//                     {customers.map((c) => (
//                       <div key={c._id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
//                         <div className="w-10 h-10 rounded-full bg-[#252525] flex items-center justify-center font-bold text-white text-base">
//                           {c.name?.[0]?.toUpperCase() || "C"}
//                         </div>
//                         <div className="flex-1 min-w-[160px]">
//                           <div className="text-sm font-semibold text-white">{c.name}</div>
//                           <div className="text-xs text-gray-400 font-sans">
//                             {c.email} Ã¢â‚¬Â¢ Phone: {c.phone || "Not set"}
//                           </div>
//                           {c.address?.city && (
//                             <div className="text-[11px] text-gray-600 font-sans mt-0.5">
//                               Ã°Å¸â€œÂ {c.address.city}, {c.address.state}
//                             </div>
//                           )}
//                         </div>
//                         <div className="text-xs text-gray-500 font-sans">
//                           Joined: {new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
//                         </div>
//                       </div>
//                     ))}
//                     {customers.length === 0 && <div className="p-12 text-center text-gray-500 font-sans">No customers found</div>}
//                   </div>
//                 </div>
//               )}

//               {/* CHATS MONITOR TAB */}
//               {tab === "chats" && (
//                 <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
//                   <div className="px-6 py-4 border-b border-[#252525] flex items-center justify-between">
//                     <div>
//                       <h3 className="font-bold text-base text-white font-serif">Platform Chat & Inquiry Monitor</h3>
//                       <p className="text-xs text-gray-400 font-sans mt-0.5">
//                         Admin view of all real-time buyer-seller conversations and media exchanges
//                       </p>
//                     </div>
//                     <span className="text-xs px-3 py-1 rounded-full bg-[#252525] text-[#c8a96e] font-sans font-bold">
//                       {chats.length} Total Conversations
//                     </span>
//                   </div>
//                   <div className="divide-y divide-[#222]">
//                     {chats.map((c) => (
//                       <div key={c._id} className="p-5 flex items-center justify-between gap-4 hover:bg-[#202020] transition-colors">
//                         <div className="flex items-center gap-3.5 min-w-0">
//                           <div className="w-12 h-12 rounded-xl bg-[#2a2a2a] flex items-center justify-center text-2xl flex-shrink-0">
//                             {c.goatImage ? (
//                               <img src={c.goatImage} alt="" className="w-full h-full object-cover rounded-xl" />
//                             ) : (
//                               "Ã°Å¸ÂÂ"
//                             )}
//                           </div>
//                           <div className="min-w-0">
//                             <div className="flex items-center gap-2">
//                               <span className="font-bold text-sm text-white truncate font-serif">{c.goatName}</span>
//                               <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-sans font-semibold">
//                                 {c.goatBreed}
//                               </span>
//                             </div>
//                             <div className="text-xs text-gray-400 font-sans mt-0.5">
//                               Buyer: <span className="text-gray-200">{c.customerName || "Customer"}</span> Ã¢â€ â€ Seller: <span className="text-gray-200">{c.sellerName || "Seller"}</span>
//                             </div>
//                             {c.lastMessage && (
//                               <div className="text-xs text-gray-500 font-sans truncate mt-1 max-w-md">
//                                 Ã°Å¸â€™Â¬ &quot;{c.lastMessage}&quot;
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-3 flex-shrink-0">
//                           {c.lastMessageAt && (
//                             <span className="text-[11px] text-gray-500 font-sans hidden sm:inline">
//                               {new Date(c.lastMessageAt).toLocaleDateString("en-IN", {
//                                 month: "short",
//                                 day: "numeric",
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })}
//                             </span>
//                           )}
//                           <a
//                             href={`/chat?id=${c._id}`}
//                             className="px-4 py-2 rounded-full text-xs font-bold font-sans bg-[#c8a96e] text-black hover:opacity-90 transition-opacity flex items-center gap-1"
//                           >
//                             Open Chat Ã¢â€ â€”
//                           </a>
//                         </div>
//                       </div>
//                     ))}
//                     {chats.length === 0 && (
//                       <div className="p-12 text-center text-gray-500 font-sans">
//                         No customer-seller inquiries active yet
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* BANNERS TAB */}
//               {tab === "banners" && (
//                 <div className="space-y-6" id="banners">
//                   <div>
//                     <h2 className="font-bold text-base text-white font-serif">
//                       Homepage Banners
//                     </h2>
//                     <p className="text-xs text-gray-500 font-sans mt-1">
//                       Upload exactly 3 banner images. Use 16:9 images for the best result.
//                     </p>
//                   </div>

//                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
//                     {[0, 1, 2].map((idx) => {
//                       const banner = bannerData[idx] || {};

//                       return (
//                         <div
//                           key={idx}
//                           className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden"
//                         >
//                           <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between">
//                             <div>
//                               <h3 className="font-bold text-white font-serif">
//                                 Banner {idx + 1}
//                               </h3>
//                               <p className="text-[10px] text-gray-500 mt-1 font-sans">
//                                 16:9 recommended
//                               </p>
//                             </div>

//                             <span className="text-xs px-2.5 py-1 rounded-full bg-[#252525] text-[#c8a96e] font-sans font-bold">
//                               Slot {idx + 1}
//                             </span>
//                           </div>

//                           <div className="p-4 space-y-4">
//                             <div className="aspect-video rounded-xl overflow-hidden bg-[#111] border border-[#333]">
//                               {banner.imageUrl ? (
//                                 <img
//                                   src={banner.imageUrl}
//                                   alt={`Banner ${idx + 1}`}
//                                   className="w-full h-full object-cover"
//                                 />
//                               ) : (
//                                 <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
//                                   <div className="text-4xl mb-2">???</div>
//                                   <span className="text-xs font-sans">
//                                     No banner uploaded
//                                   </span>
//                                 </div>
//                               )}
//                             </div>

//                             <label
//                               className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold font-sans cursor-pointer transition-all ${
//                                 bannerImgUploading === idx
//                                   ? "bg-amber-950/40 text-amber-400 border border-amber-800/40 cursor-wait"
//                                   : "bg-[#c8a96e] text-black hover:opacity-90"
//                               }`}
//                             >
//                               <input
//                                 type="file"
//                                 accept="image/*"
//                                 className="hidden"
//                                 disabled={bannerImgUploading !== null}
//                                 onChange={(e) => {
//                                   const file = e.target.files?.[0];

//                                   if (file) {
//                                     uploadBannerImage(idx, file);
//                                   }

//                                   e.currentTarget.value = "";
//                                 }}
//                               />

//                               {bannerImgUploading === idx
//                                 ? "Uploading..."
//                                 : banner.imageUrl
//                                 ? "Replace Banner"
//                                 : "Upload Banner"}
//                             </label>

//                             <p className="text-[10px] text-gray-600 font-sans text-center">
//                               JPG, PNG, WEBP â€¢ Maximum 10MB
//                             </p>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>

//                   <div className="rounded-xl border border-[#252525] bg-[#151515] px-4 py-3">
//                     <p className="text-xs text-gray-500 font-sans">
//                       <span className="text-[#c8a96e] font-bold">
//                         Note:
//                       </span>{" "}
//                       The uploaded image itself contains all banner text,
//                       pricing and design. No additional banner fields are required.
//                     </p>
//                   </div>
//                 </div>
//               )}
//               {/* ANALYTICS TAB */}
//               {tab === "analytics" && (
//                 <div className="space-y-6">
//                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//                     <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5">
//                       <div className="text-[10px] uppercase tracking-wider text-gray-500 font-sans mb-1">Total Sales Volume</div>
//                       <div className="text-2xl font-bold text-white">{fmt(stats?.totalRevenue || 0)}</div>
//                     </div>
//                     <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5">
//                       <div className="text-[10px] uppercase tracking-wider text-gray-500 font-sans mb-1">Completed Orders</div>
//                       <div className="text-2xl font-bold text-emerald-400">{stats?.deliveredOrders || 0}</div>
//                     </div>
//                     <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5">
//                       <div className="text-[10px] uppercase tracking-wider text-gray-500 font-sans mb-1">Active Sellers</div>
//                       <div className="text-2xl font-bold text-amber-400">{sellers.filter((s) => s.sellerProfile?.status === "approved").length}</div>
//                     </div>
//                     <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5">
//                       <div className="text-[10px] uppercase tracking-wider text-gray-500 font-sans mb-1">Customer Base</div>
//                       <div className="text-2xl font-bold text-sky-400">{customers.length}</div>
//                     </div>
//                   </div>

//                   <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-6">
//                     <h3 className="font-bold text-base text-white font-serif mb-5">Revenue by Breed Distribution</h3>
//                     {Object.keys(breedRevenueMap).length > 0 ? (
//                       Object.entries(breedRevenueMap).map(([breed, amt]) => {
//                         const pct = Math.round((amt / maxBreedRev) * 100);
//                         return (
//                           <div key={breed} className="flex items-center gap-4 mb-4">
//                             <div className="w-32 text-xs font-sans text-gray-400 truncate">{breed}</div>
//                             <div className="flex-1 h-2.5 rounded-full bg-[#222] overflow-hidden">
//                               <div
//                                 className="h-full rounded-full transition-all bg-gradient-to-r from-[#c8a96e] to-[#8b5e2a]"
//                                 style={{ width: `${pct}%` }}
//                               />
//                             </div>
//                             <div className="w-20 text-xs font-bold text-right font-sans text-[#c8a96e]">{fmt(amt)}</div>
//                           </div>
//                         );
//                       })
//                     ) : (
//                       <div className="py-8 text-center text-gray-500 font-sans">No completed order analytics available yet</div>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { fmt } from "@/lib/utils";
import AdminFinancials from "@/components/admin/AdminFinancials";
import AdminPayouts from "@/components/admin/AdminPayouts";
import AdminAuditAndReconciliation from "@/components/admin/AdminAuditAndReconciliation";

const G = "#c8a96e",
  DG = "#8b5e2a";

const TABS = [
  { id: "dashboard", ic: "📊", l: "Dashboard" },
  { id: "financials", ic: "💰", l: "Financials" },
  { id: "payouts", ic: "💸", l: "Payouts" },
  { id: "audit", ic: "📜", l: "Audit & Recon" },
  { id: "goats", ic: "🐐", l: "Goats" },
  { id: "orders", ic: "📦", l: "Orders" },
  { id: "sellers", ic: "🏪", l: "Sellers" },
  { id: "customers", ic: "👥", l: "Customers" },
  { id: "chats", ic: "💬", l: "Chat Monitor" },
  { id: "analytics", ic: "📈", l: "Analytics" },
];

function Stat({ icon, val, lbl, clr, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 border relative overflow-hidden ${
        onClick ? "cursor-pointer hover:border-[#c8a96e]/50 transition-colors" : ""
      }`}
      style={{
        background: "#1a1a1a",
        borderColor: "#252525",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 80% 20%,${clr || G}18,transparent)`,
        }}
      />
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white mb-0.5">{val}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-sans">
        {lbl}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [goats, setGoats] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get("/api/admin/stats"),
      axios.get("/api/sellers"),
      axios.get("/api/orders"),
      axios.get("/api/goats?status=all&limit=50"),
    ])
      .then(([s, sel, ord, g]) => {
        if (s.data.success) setStats(s.data.data);
        if (sel.data.success) setSellers(sel.data.data);
        if (ord.data.success) setOrders(ord.data.data);
        if (g.data.success) setGoats(g.data.data);
      })
      .catch((error) => {
        console.error("Failed to load admin dashboard data:", error);
        toast.error("Failed to load dashboard data");
      })
      .finally(() => setLoading(false));
  }, []);

  const approveSeller = async (id: string, status: string) => {
    try {
      setActionLoading(true);

      const { data } = await axios.patch(`/api/sellers/${id}`, { status });

      if (data.success) {
        setSellers((prev) =>
          prev.map((s) =>
            s._id === id
              ? {
                  ...s,
                  sellerProfile: {
                    ...s.sellerProfile,
                    status,
                  },
                }
              : s
          )
        );

        toast.success(`Seller status changed to ${status}!`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update seller");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleGoatStatus = async (id: string, current: string) => {
    const newStatus = current === "sold" ? "sale" : "sold";

    try {
      const { data } = await axios.patch(`/api/goats/${id}`, {
        status: newStatus,
      });

      if (data.success) {
        setGoats((prev) =>
          prev.map((g) =>
            g._id === id ? { ...g, status: newStatus } : g
          )
        );

        toast.success(`Goat listing marked as ${newStatus}`);
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const deleteGoat = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this goat listing?"
      )
    ) {
      return;
    }

    try {
      const { data } = await axios.delete(`/api/goats/${id}`);

      if (data.success) {
        const deletedId = data?.data?.id || id;
        setGoats((prev) =>
          prev.filter((g) => {
            const gid = String(g._id || g.id || "");
            return gid !== String(deletedId) && gid !== String(id);
          })
        );
        toast.success("Listing deleted");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete listing");
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { data } = await axios.patch(`/api/orders/${orderId}`, {
        status,
      });

      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId ? { ...o, status } : o
          )
        );

        toast.success(`Order marked as ${status}`);
      }
    } catch {
      toast.error("Failed to update order status");
    }
  };

  const sidebarItem = (t: any) => {
    const active = tab === t.id;

    const pending =
      t.id === "sellers"
        ? sellers.filter(
            (s) => s.sellerProfile?.status === "pending"
          ).length
        : 0;

    return (
      <div
        key={t.id}
        onClick={() => setTab(t.id)}
        style={{
          background: active ? `${G}15` : "transparent",
          borderLeft: active
            ? `3px solid ${G}`
            : "3px solid transparent",
          color: active ? G : "#888",
        }}
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer text-sm font-sans transition-colors hover:bg-[#1a1a1a]"
      >
        <span>{t.ic}</span>

        <span className="flex-1 font-medium">{t.l}</span>

        {pending > 0 && (
          <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-[#f5a623]">
            {pending}
          </span>
        )}
      </div>
    );
  };

  // Real Analytics: Revenue by Breed
  const breedRevenueMap: Record<string, number> = {};

  orders.forEach((o) => {
    const breed = o.goatBreed || "Other";
    breedRevenueMap[breed] =
      (breedRevenueMap[breed] || 0) + (o.amount || 0);
  });

  const maxBreedRev = Math.max(
    1,
    ...Object.values(breedRevenueMap)
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0f0f0f] text-gray-200 w-full max-w-full overflow-x-hidden">
      {/* Mobile Top Header */}
      <div className="md:hidden p-4 border-b border-[#1f1f1f] bg-[#141414] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐐</span>

          <div>
            <div className="font-bold text-sm text-[#c8a96e]">
              GoatMart
            </div>

            <div className="text-[9px] uppercase text-gray-500 font-sans">
              Admin Panel
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            className="px-2.5 py-1 rounded-lg bg-[#222] text-xs text-gray-300 font-sans"
          >
            Marketplace
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-2.5 py-1 rounded-lg bg-red-950/40 text-xs text-red-400 font-sans"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Tabs */}
      <div className="md:hidden flex gap-1 p-2 bg-[#121212] border-b border-[#1f1f1f] overflow-x-auto scrollbar-none">
        {TABS.map((t) => {
          const active = tab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 transition-all ${
                active
                  ? "bg-[#c8a96e] text-zinc-950 font-bold shadow-xs"
                  : "text-gray-400 hover:text-white bg-[#1a1a1a]"
              }`}
            >
              <span>{t.ic}</span>
              <span>{t.l}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-[#1f1f1f] bg-[#141414]">
        <div className="p-5 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐐</span>

            <div>
              <div className="font-bold text-base text-[#c8a96e]">
                GoatMart
              </div>

              <div className="text-[10px] tracking-widest uppercase text-gray-500 font-sans">
                Admin Control Panel
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 py-2">
          {TABS.map(sidebarItem)}
        </div>

        <div className="p-4 border-t border-[#1f1f1f] space-y-1">
          <div
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm font-sans text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 transition-colors"
          >
            <span>🌐</span>
            <span>View Marketplace</span>
          </div>

          <div
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm font-sans text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <span>🚪</span>
            <span>Logout</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full min-w-0 overflow-x-hidden">
        {/* Top Header (Desktop) */}
        <div className="hidden md:flex px-8 py-4 border-b border-[#1f1f1f] items-center justify-between sticky top-0 z-10 bg-[#0f0f0f]/90 backdrop-blur-md">
          <div>
            <h1 className="text-xl font-bold capitalize text-white font-serif">
              {tab}
            </h1>

            <p className="text-xs text-gray-500 font-sans mt-0.5">
              Admin: {session?.user?.name || "Admin"} •{" "}
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-sans font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              System Active
            </span>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 w-full max-w-full">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl animate-pulse bg-[#1a1a1a] border border-[#252525]"
                />
              ))}
            </div>
          ) : (
            <>
              {/* DASHBOARD TAB */}
              {tab === "dashboard" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Stat
                      icon="💰"
                      val={stats ? fmt(stats.totalRevenue) : "₹0"}
                      lbl="Total Revenue"
                      clr={G}
                      onClick={() => setTab("financials")}
                    />

                    <Stat
                      icon="📦"
                      val={stats?.totalOrders || 0}
                      lbl="Orders"
                      clr="#5ec87e"
                    />

                    <Stat
                      icon="🐐"
                      val={stats?.activeGoats || 0}
                      lbl="Active Goats"
                      clr="#5e9ec8"
                    />

                    <Stat
                      icon="✅"
                      val={stats?.soldGoats || 0}
                      lbl="Sold Goats"
                      clr="#a06ef0"
                    />

                    <Stat
                      icon="🏪"
                      val={stats?.totalSellers || 0}
                      lbl="Sellers"
                      clr="#c87e5e"
                    />

                    <Stat
                      icon="⏳"
                      val={stats?.pendingSellers || 0}
                      lbl="Pending Approvals"
                      clr="#f5a623"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Orders */}
                    <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
                      <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between">
                        <h2 className="font-bold text-sm text-white font-serif">
                          Recent Orders
                        </h2>

                        <button
                          onClick={() => setTab("orders")}
                          className="text-xs text-[#c8a96e] hover:underline font-sans"
                        >
                          View All ({orders.length}) →
                        </button>
                      </div>

                      <div className="divide-y divide-[#222]">
                        {orders.slice(0, 6).map((o) => (
                          <div
                            key={o._id}
                            className="px-5 py-3 flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-200 truncate">
                                {o.goatName}
                              </div>

                              <div className="text-xs text-gray-500 font-sans">
                                {o.customerName} → {o.sellerName}
                              </div>
                            </div>

                            <div className="text-sm font-bold text-[#c8a96e]">
                              {fmt(o.amount)}
                            </div>

                            <span className="text-xs px-2.5 py-0.5 rounded-full font-sans font-bold bg-[#1a3a1a] text-[#5ec87e]">
                              {o.status}
                            </span>
                          </div>
                        ))}

                        {orders.length === 0 && (
                          <div className="p-8 text-center text-sm text-gray-500">
                            No orders placed yet
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pending Sellers */}
                    <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
                      <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between">
                        <h2 className="font-bold text-sm text-white font-serif">
                          Seller Verification Queue
                        </h2>

                        <button
                          onClick={() => setTab("sellers")}
                          className="text-xs text-[#c8a96e] hover:underline font-sans"
                        >
                          Manage ({sellers.length}) →
                        </button>
                      </div>

                      <div className="divide-y divide-[#222]">
                        {sellers.slice(0, 6).map((s) => (
                          <div
                            key={s._id}
                            className="px-5 py-3 flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-200 truncate">
                                {s.name}
                              </div>

                              <div className="text-xs text-gray-500 font-sans">
                                {s.sellerProfile?.farmName || "Farm"} •{" "}
                                {s.sellerProfile?.location || "India"}
                              </div>
                            </div>

                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-sans ${
                                s.sellerProfile?.status === "approved"
                                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                  : s.sellerProfile?.status === "pending"
                                  ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                                  : "bg-red-950/60 text-red-400 border border-red-800/40"
                              }`}
                            >
                              {s.sellerProfile?.status}
                            </span>

                            {s.sellerProfile?.status === "pending" && (
                              <button
                                onClick={() =>
                                  approveSeller(s._id, "approved")
                                }
                                className="text-xs px-2.5 py-1 rounded-lg bg-[#c8a96e] text-black font-bold font-sans hover:opacity-90"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FINANCIALS TAB */}
              {tab === "financials" && <AdminFinancials />}

              {/* PAYOUTS TAB */}
              {tab === "payouts" && <AdminPayouts />}

              {/* AUDIT & RECONCILIATION TAB */}
              {tab === "audit" && <AdminAuditAndReconciliation />}

              {/* GOATS TAB */}
              {tab === "goats" && (
                <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#252525] flex items-center justify-between">
                    <h2 className="font-bold text-base text-white font-serif">
                      All Goat Listings ({goats.length})
                    </h2>
                  </div>

                  <div className="divide-y divide-[#222]">
                    {goats.map((g) => (
                      <div
                        key={g._id}
                        className="px-6 py-3.5 flex items-center gap-4 flex-wrap"
                      >
                        {g.images?.[0] ? (
                          <img
                            src={g.images[0]}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#222] flex items-center justify-center text-xl">
                            🐐
                          </div>
                        )}

                        <div className="flex-1 min-w-[160px]">
                          <div className="text-sm font-semibold text-white">
                            {g.name}
                          </div>

                          <div className="text-xs text-gray-500 font-sans">
                            {g.breed} • {g.sellerName} • {g.weight} kg
                          </div>
                        </div>

                        <div className="text-sm font-bold text-[#c8a96e] font-sans">
                          {fmt(g.price)}
                        </div>

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-sans ${
                            g.status === "sale"
                              ? "bg-emerald-950/60 text-emerald-400"
                              : g.status === "reserved"
                              ? "bg-amber-950/60 text-amber-400"
                              : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {g.status}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              toggleGoatStatus(g._id, g.status)
                            }
                            className="text-xs px-3 py-1.5 rounded-lg border border-[#333] text-gray-300 hover:bg-[#252525] font-sans"
                          >
                            {g.status === "sold"
                              ? "Relist"
                              : "Mark Sold"}
                          </button>

                          <button
                            onClick={() => deleteGoat(g._id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-950/50 text-red-400 hover:bg-red-900/60 font-sans"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}

                    {goats.length === 0 && (
                      <div className="p-12 text-center text-gray-500 font-sans">
                        No goat listings found
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ORDERS TAB */}
              {tab === "orders" && (
                <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#252525] flex items-center justify-between">
                    <h2 className="font-bold text-base text-white font-serif">
                      All Customer Orders ({orders.length})
                    </h2>
                  </div>

                  <div className="divide-y divide-[#222]">
                    {orders.map((o) => (
                      <div
                        key={o._id}
                        className="px-6 py-4 flex items-center gap-4 flex-wrap"
                      >
                        <div className="text-xs font-bold font-sans text-[#c8a96e] min-w-[80px]">
                          {o.orderId}
                        </div>

                        <div className="flex-1 min-w-[140px]">
                          <div className="text-sm font-semibold text-gray-200">
                            {o.goatName}
                          </div>

                          <div className="text-xs text-gray-500 font-sans">
                            Buyer: {o.customerName} • Seller:{" "}
                            {o.sellerName}
                          </div>

                          <div className="text-[11px] text-gray-600 font-sans mt-0.5">
                            {o.delivery?.city}, {o.delivery?.state} •
                            Phone: {o.delivery?.phone}
                          </div>
                        </div>

                        <div className="text-sm font-bold text-[#c8a96e] font-sans">
                          {fmt(o.amount)}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={o.status}
                            onChange={(e) =>
                              updateOrderStatus(
                                o._id,
                                e.target.value
                              )
                            }
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-[#222] text-gray-200 border border-[#333] outline-none font-sans cursor-pointer focus:border-[#c8a96e]"
                          >
                            <option value="pending">Pending</option>
                            <option value="payment_confirmed">
                              Payment Confirmed
                            </option>
                            <option value="processing">
                              Processing
                            </option>
                            <option value="dispatched">
                              Dispatched
                            </option>
                            <option value="out_for_delivery">
                              Out for Delivery
                            </option>
                            <option value="delivered">
                              Delivered
                            </option>
                            <option value="cancelled">
                              Cancelled
                            </option>
                          </select>
                        </div>
                      </div>
                    ))}

                    {orders.length === 0 && (
                      <div className="p-12 text-center text-gray-500 font-sans">
                        No orders in the system
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SELLERS TAB */}
              {tab === "sellers" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-base text-white font-serif">
                      Registered Sellers ({sellers.length})
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {sellers.map((s) => (
                      <div
                        key={s._id}
                        className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5"
                      >
                        <div className="flex items-center gap-4 flex-wrap justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base text-white">
                                {s.name}
                              </span>

                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-sans ${
                                  s.sellerProfile?.status === "approved"
                                    ? "bg-emerald-950/60 text-emerald-400"
                                    : s.sellerProfile?.status === "pending"
                                    ? "bg-amber-950/60 text-amber-400"
                                    : "bg-red-950/60 text-red-400"
                                }`}
                              >
                                {s.sellerProfile?.status}
                              </span>
                            </div>

                            <div className="text-xs text-gray-400 font-sans mt-1">
                              📧 {s.email} • 📱{" "}
                              {s.phone || "No phone"} • 📍{" "}
                              {s.sellerProfile?.location ||
                                "Not specified"}
                            </div>

                            <div className="text-xs text-[#c8a96e] font-sans mt-1">
                              Farm:{" "}
                              {s.sellerProfile?.farmName || "N/A"} •
                              Rating: ⭐{" "}
                              {s.sellerProfile?.rating || 5}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {s.sellerProfile?.status === "pending" && (
                              <>
                                <button
                                  onClick={() =>
                                    approveSeller(
                                      s._id,
                                      "approved"
                                    )
                                  }
                                  disabled={actionLoading}
                                  className="text-xs px-4 py-2 rounded-xl font-bold font-sans bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                                >
                                  ✓ Approve Seller
                                </button>

                                <button
                                  onClick={() =>
                                    approveSeller(
                                      s._id,
                                      "suspended"
                                    )
                                  }
                                  disabled={actionLoading}
                                  className="text-xs px-4 py-2 rounded-xl font-bold font-sans bg-red-800 text-white hover:bg-red-700 transition-colors"
                                >
                                  ✗ Reject
                                </button>
                              </>
                            )}

                            {s.sellerProfile?.status === "approved" && (
                              <button
                                onClick={() =>
                                  approveSeller(
                                    s._id,
                                    "suspended"
                                  )
                                }
                                disabled={actionLoading}
                                className="text-xs px-4 py-2 rounded-xl font-sans bg-amber-800 text-white hover:bg-amber-700 transition-colors"
                              >
                                Suspend Account
                              </button>
                            )}

                            {s.sellerProfile?.status === "suspended" && (
                              <button
                                onClick={() =>
                                  approveSeller(
                                    s._id,
                                    "approved"
                                  )
                                }
                                disabled={actionLoading}
                                className="text-xs px-4 py-2 rounded-xl font-sans bg-emerald-700 text-white hover:bg-emerald-600 transition-colors"
                              >
                                Reinstate Seller
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CUSTOMERS TAB */}
              {tab === "customers" && (
                <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#252525] flex items-center justify-between">
                    <h2 className="font-bold text-base text-white font-serif">
                      All Customers ({customers.length})
                    </h2>
                  </div>

                  <div className="divide-y divide-[#222]">
                    {customers.map((c) => (
                      <div
                        key={c._id}
                        className="px-6 py-4 flex items-center gap-4 flex-wrap"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#252525] flex items-center justify-center font-bold text-white text-base">
                          {c.name?.[0]?.toUpperCase() || "C"}
                        </div>

                        <div className="flex-1 min-w-[160px]">
                          <div className="text-sm font-semibold text-white">
                            {c.name}
                          </div>

                          <div className="text-xs text-gray-400 font-sans">
                            {c.email} • Phone:{" "}
                            {c.phone || "Not set"}
                          </div>

                          {c.address?.city && (
                            <div className="text-[11px] text-gray-600 font-sans mt-0.5">
                              📍 {c.address.city}, {c.address.state}
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 font-sans">
                          Joined:{" "}
                          {new Date(
                            c.createdAt
                          ).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    ))}

                    {customers.length === 0 && (
                      <div className="p-12 text-center text-gray-500 font-sans">
                        No customers found
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CHATS MONITOR TAB */}
              {tab === "chats" && (
                <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#252525] flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base text-white font-serif">
                        Platform Chat & Inquiry Monitor
                      </h3>

                      <p className="text-xs text-gray-400 font-sans mt-0.5">
                        Admin view of all real-time buyer-seller
                        conversations and media exchanges
                      </p>
                    </div>

                    <span className="text-xs px-3 py-1 rounded-full bg-[#252525] text-[#c8a96e] font-sans font-bold">
                      {chats.length} Total Conversations
                    </span>
                  </div>

                  <div className="divide-y divide-[#222]">
                    {chats.map((c) => (
                      <div
                        key={c._id}
                        className="p-5 flex items-center justify-between gap-4 hover:bg-[#202020] transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-[#2a2a2a] flex items-center justify-center text-2xl flex-shrink-0">
                            {c.goatImage ? (
                              <img
                                src={c.goatImage}
                                alt=""
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              "🐐"
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white truncate font-serif">
                                {c.goatName}
                              </span>

                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-sans font-semibold">
                                {c.goatBreed}
                              </span>
                            </div>

                            <div className="text-xs text-gray-400 font-sans mt-0.5">
                              Buyer:{" "}
                              <span className="text-gray-200">
                                {c.customerName || "Customer"}
                              </span>{" "}
                              ↔ Seller:{" "}
                              <span className="text-gray-200">
                                {c.sellerName || "Seller"}
                              </span>
                            </div>

                            {c.lastMessage && (
                              <div className="text-xs text-gray-500 font-sans truncate mt-1 max-w-md">
                                💬 &quot;{c.lastMessage}&quot;
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {c.lastMessageAt && (
                            <span className="text-[11px] text-gray-500 font-sans hidden sm:inline">
                              {new Date(
                                c.lastMessageAt
                              ).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}

                          <a
                            href={`/chat?id=${c._id}`}
                            className="px-4 py-2 rounded-full text-xs font-bold font-sans bg-[#c8a96e] text-black hover:opacity-90 transition-opacity flex items-center gap-1"
                          >
                            Open Chat →
                          </a>
                        </div>
                      </div>
                    ))}

                    {chats.length === 0 && (
                      <div className="p-12 text-center text-gray-500 font-sans">
                        No customer-seller inquiries active yet
                      </div>
                    )}
                  </div>
                </div>
              )}



              {/* ANALYTICS TAB */}
              {tab === "analytics" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-sans mb-1">
                        Total Sales Volume
                      </div>

                      <div className="text-2xl font-bold text-white">
                        {fmt(stats?.totalRevenue || 0)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-sans mb-1">
                        Completed Orders
                      </div>

                      <div className="text-2xl font-bold text-emerald-400">
                        {stats?.deliveredOrders || 0}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-sans mb-1">
                        Active Sellers
                      </div>

                      <div className="text-2xl font-bold text-amber-400">
                        {
                          sellers.filter(
                            (s) =>
                              s.sellerProfile?.status ===
                              "approved"
                          ).length
                        }
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-5">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-sans mb-1">
                        Customer Base
                      </div>

                      <div className="text-2xl font-bold text-sky-400">
                        {customers.length}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-6">
                    <h3 className="font-bold text-base text-white font-serif mb-5">
                      Revenue by Breed Distribution
                    </h3>

                    {Object.keys(breedRevenueMap).length > 0 ? (
                      Object.entries(breedRevenueMap).map(
                        ([breed, amt]) => {
                          const pct = Math.round(
                            (amt / maxBreedRev) * 100
                          );

                          return (
                            <div
                              key={breed}
                              className="flex items-center gap-4 mb-4"
                            >
                              <div className="w-32 text-xs font-sans text-gray-400 truncate">
                                {breed}
                              </div>

                              <div className="flex-1 h-2.5 rounded-full bg-[#222] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all bg-gradient-to-r from-[#c8a96e] to-[#8b5e2a]"
                                  style={{
                                    width: `${pct}%`,
                                  }}
                                />
                              </div>

                              <div className="w-20 text-xs font-bold text-right font-sans text-[#c8a96e]">
                                {fmt(amt)}
                              </div>
                            </div>
                          );
                        }
                      )
                    ) : (
                      <div className="py-8 text-center text-gray-500 font-sans">
                        No completed order analytics available yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}