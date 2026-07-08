"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { fmt } from "@/lib/utils";

const G = "#c8a96e", DG = "#8b5e2a";

const TABS = [
  { id:"dashboard", ic:"📊", l:"Dashboard"  },
  { id:"listings",  ic:"🐐", l:"My Listings" },
  { id:"orders",    ic:"📦", l:"Orders"      },
  { id:"chats",     ic:"💬", l:"Inquiries"   },
  { id:"analytics", ic:"📈", l:"Analytics"   },
  { id:"earnings",  ic:"💰", l:"Earnings"    },
  { id:"profile",   ic:"👤", l:"Profile"     },
];

function Stat({ icon, val, lbl }: any) {
  return (
    <div className="rounded-2xl p-4 border relative overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
      <div className="absolute inset-0" style={{ background:`radial-gradient(circle at 80% 20%,${G}18,transparent)` }} />
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white mb-0.5">{val}</div>
      <div className="text-xs uppercase tracking-wider font-sans" style={{ color:"#555" }}>{lbl}</div>
    </div>
  );
}

export default function SellerDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [goats, setGoats] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [newGoat, setNewGoat] = useState({ name:"", breed:"Jamunapari", weight:"", age:"", price:"", health:"Excellent", vaccinated:false, desc:"" });
  const BREEDS = ["Jamunapari","Beetal","Sirohi","Barbari","Black Bengal","Osmanabadi","Totapari","Sojat"];

  useEffect(() => {
    if (!session) return;
    Promise.all([
      axios.get(`/api/goats?seller=${session.user.id}&status=all&limit=50`),
      axios.get("/api/orders"),
      axios.get("/api/chat"),
    ]).then(([g, o, c]) => {
      if (g.data.success) setGoats(g.data.data);
      if (o.data.success) setOrders(o.data.data);
      if (c.data.success) setChats(c.data.data);
    }).finally(() => setLoading(false));
  }, [session]);

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "sold" ? "sale" : "sold";
    try {
      await axios.patch(`/api/goats/${id}`, { status: newStatus });
      setGoats(prev => prev.map(g => g._id === id ? { ...g, status: newStatus } : g));
      toast.success("Status updated");
    } catch { toast.error("Failed"); }
  };

  const addGoat = async () => {
    if (!newGoat.name || !newGoat.price) { toast.error("Name and price required"); return; }
    try {
      const { data } = await axios.post("/api/goats", {
        ...newGoat,
        weight: Number(newGoat.weight),
        price: Number(newGoat.price),
        images: [],
        sellerLoc: session?.user?.name || "",
      });
      if (data.success) {
        setGoats(prev => [data.data, ...prev]);
        setAddModal(false);
        setNewGoat({ name:"", breed:"Jamunapari", weight:"", age:"", price:"", health:"Excellent", vaccinated:false, desc:"" });
        toast.success("Goat listed!");
      }
    } catch { toast.error("Failed to add listing"); }
  };

  const sidebarItem = (t: any) => {
    const active = tab === t.id;
    return (
      <div key={t.id} onClick={() => setTab(t.id)}
        style={{ background: active ? `${G}15` : "transparent", borderLeft: active ? `3px solid ${G}` : "3px solid transparent", color: active ? G : "#666" }}
        className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm font-sans hover:bg-[#1a1a1a] transition-colors">
        <span>{t.ic}</span><span>{t.l}</span>
      </div>
    );
  };

  const inp = "w-full px-3 py-2.5 rounded-xl text-sm font-sans outline-none transition-colors border"
    + " focus:border-[#c8a96e]"
    + " bg-[#111] text-gray-300 border-gray-700";

  return (
    <div className="flex min-h-screen" style={{ background:"#0f0f0f" }}>
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 flex flex-col border-r" style={{ background:"#141414", borderColor:"#1f1f1f" }}>
        <div className="p-4 border-b" style={{ borderColor:"#1f1f1f" }}>
          <div className="font-bold text-sm" style={{ color:G }}>Bakrawale</div>
          <div className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color:"#444" }}>Seller Panel</div>
        </div>
        <div className="flex-1 py-1.5">{TABS.map(sidebarItem)}</div>
        <div className="border-t" style={{ borderColor:"#1f1f1f" }}>
          <div onClick={() => router.push("/")} className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm font-sans text-gray-600 hover:bg-[#1a1a1a]">
            <span>🌐</span><span>View Site</span>
          </div>
          <div onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm font-sans hover:bg-[#1a1a1a]" style={{ color:"#c87e5e" }}>
            <span>🚪</span><span>Logout</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3.5 border-b flex items-center justify-between sticky top-0 z-10" style={{ background:"#0f0f0f", borderColor:"#1f1f1f" }}>
          <div>
            <div className="text-lg font-bold capitalize" style={{ color:"#ddd" }}>{tab}</div>
            <div className="text-xs font-sans" style={{ color:"#444" }}>{session?.user?.name} • Verified Seller</div>
          </div>
          <div className="text-xs font-sans px-3 py-1.5 rounded-full" style={{ background:"#1a3a1a", color:"#5ec87e" }}>● Active</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <Stat icon="🐐" val={goats.filter(g=>g.status==="sale").length} lbl="Active Listings"/>
                <Stat icon="✅" val={goats.filter(g=>g.status==="sold").length} lbl="Sold"/>
                <Stat icon="📦" val={orders.length} lbl="Total Orders"/>
                <Stat icon="💬" val={chats.length} lbl="Chats"/>
              </div>
              <div className="rounded-2xl border overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                <div className="px-5 py-3.5 border-b" style={{ borderColor:"#252525" }}>
                  <div className="font-bold text-sm" style={{ color:"#ddd" }}>Recent Orders</div>
                </div>
                {orders.slice(0,5).map(o => (
                  <div key={o._id} className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor:"#1c1c1c" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-sans font-semibold truncate" style={{ color:"#ccc" }}>{o.goatName}</div>
                      <div className="text-xs font-sans" style={{ color:"#555" }}>{o.customerName} • {new Date(o.createdAt).toLocaleDateString("en-IN")}</div>
                    </div>
                    <div className="text-sm font-bold font-sans" style={{ color:G }}>{fmt(o.amount)}</div>
                    <div className="text-xs px-2 py-0.5 rounded-full font-bold font-sans" style={{ background:"#1a3a1a", color:"#5ec87e" }}>{o.status}</div>
                  </div>
                ))}
                {orders.length === 0 && <div className="p-8 text-center text-sm font-sans" style={{ color:"#555" }}>No orders yet</div>}
              </div>
            </>
          )}

          {/* LISTINGS */}
          {tab === "listings" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-sans" style={{ color:"#555" }}>{goats.length} total listings</div>
                <button onClick={() => setAddModal(true)} className="px-4 py-2 rounded-full text-sm font-bold font-sans text-white hover:opacity-90 transition-opacity" style={{ background:`linear-gradient(135deg,${G},${DG})` }}>+ Add Goat</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {goats.map(g => (
                  <div key={g._id} className="rounded-2xl border overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                    {g.images?.[0] && <div className="h-32 overflow-hidden"><img src={g.images[0]} alt={g.name} className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display="none"}}/></div>}
                    <div className="p-3">
                      <div className="text-sm font-bold mb-0.5" style={{ color:"#ddd" }}>{g.name}</div>
                      <div className="text-xs mb-2 font-sans" style={{ color:G }}>{g.breed} • {fmt(g.price)}</div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-1.5 rounded-lg text-xs font-sans border transition-colors" style={{ borderColor:"#333", color:"#888", background:"transparent" }}>Edit</button>
                        <button onClick={() => toggleStatus(g._id, g.status)} className="flex-1 py-1.5 rounded-lg text-xs font-bold font-sans"
                          style={{ background: g.status==="sold" ? "#1a3a1a" : "#3a1a1a", color: g.status==="sold" ? "#5ec87e" : "#c87e5e" }}>
                          {g.status==="sold" ? "Relist" : "Mark Sold"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {goats.length === 0 && (
                <div className="text-center py-16" style={{ color:"#555" }}>
                  <div className="text-4xl mb-3">🐐</div>
                  <div className="text-sm font-sans mb-4">No listings yet</div>
                  <button onClick={() => setAddModal(true)} className="px-5 py-2.5 rounded-full text-sm font-bold text-white font-sans" style={{ background:`linear-gradient(135deg,${G},${DG})` }}>Add Your First Goat</button>
                </div>
              )}
            </>
          )}

          {/* ORDERS */}
          {tab === "orders" && (
            <div className="rounded-2xl border overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
              <div className="px-5 py-3.5 border-b" style={{ borderColor:"#252525" }}>
                <div className="font-bold text-sm" style={{ color:"#ddd" }}>My Orders ({orders.length})</div>
              </div>
              {orders.map(o => (
                <div key={o._id} className="px-5 py-3 border-b flex items-center gap-3 flex-wrap" style={{ borderColor:"#1c1c1c" }}>
                  <div className="text-xs font-bold font-sans" style={{ color:G, minWidth:78 }}>{o.orderId}</div>
                  <div className="flex-1 min-w-[100px]">
                    <div className="text-sm font-sans" style={{ color:"#ccc" }}>{o.goatName}</div>
                    <div className="text-xs font-sans" style={{ color:"#555" }}>{o.customerName}</div>
                  </div>
                  <div className="text-sm font-bold font-sans" style={{ color:G }}>{fmt(o.amount)}</div>
                  <div className="text-xs px-2 py-0.5 rounded-full font-bold font-sans" style={{ background:"#1a3a1a", color:"#5ec87e" }}>{o.status}</div>
                </div>
              ))}
              {orders.length === 0 && <div className="p-10 text-center text-sm font-sans" style={{ color:"#555" }}>No orders yet</div>}
            </div>
          )}

          {/* CHATS */}
          {tab === "chats" && (
            <div className="space-y-2">
              {chats.map(c => (
                <div key={c._id} onClick={() => router.push(`/chat/${c._id}`)}
                  className="rounded-2xl border p-4 flex items-center gap-3 cursor-pointer transition-colors hover:border-[#c8a96e]" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                  {c.goatImage && <img src={c.goatImage} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" onError={e=>{(e.target as HTMLImageElement).style.display="none"}} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold font-sans truncate" style={{ color:"#ccc" }}>{c.goatName}</div>
                    <div className="text-xs font-sans" style={{ color:"#666" }}>{c.customerName}</div>
                    {c.lastMessage && <div className="text-xs font-sans truncate mt-0.5" style={{ color:"#444" }}>{c.lastMessage}</div>}
                  </div>
                  {c.unreadCount?.seller > 0 && (
                    <div className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ background:G }}>{c.unreadCount.seller}</div>
                  )}
                </div>
              ))}
              {chats.length === 0 && <div className="text-center py-16 text-sm font-sans" style={{ color:"#555" }}><div className="text-3xl mb-3">💬</div>No inquiries yet</div>}
            </div>
          )}

          {/* ANALYTICS */}
          {tab === "analytics" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[{l:"Views",v:"1,248",c:"+22%"},{l:"Inquiries",v:"34",c:"+15%"},{l:"Wishlist Saves",v:"89",c:"+40%"},{l:"Avg Rating",v:"4.8",c:"+0.2"}].map(s => (
                  <div key={s.l} className="rounded-2xl border p-4" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                    <div className="text-[10px] uppercase tracking-wider font-sans mb-2" style={{ color:"#555" }}>{s.l}</div>
                    <div className="text-xl font-bold text-white mb-1">{s.v}</div>
                    <div className="text-xs font-sans" style={{ color:"#5ec87e" }}>{s.c}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border p-5" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                <div className="font-bold text-sm mb-4" style={{ color:"#ddd" }}>Monthly Performance</div>
                {[["Jan","₹28k",70],["Feb","₹35k",88],["Mar","₹42k",100],["Apr","₹18k",43]].map(([m,v,p]) => (
                  <div key={m as string} className="flex items-center gap-3 mb-3">
                    <div className="w-8 text-xs font-sans" style={{ color:"#666" }}>{m}</div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:"#222" }}>
                      <div className="h-full rounded-full" style={{ width:`${p}%`, background:`linear-gradient(90deg,${G},${DG})` }} />
                    </div>
                    <div className="w-10 text-xs font-bold text-right font-sans" style={{ color:G }}>{v as string}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* EARNINGS */}
          {tab === "earnings" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Stat icon="💰" val="₹1.42L" lbl="Total Earned"/>
                <Stat icon="📅" val="₹42k" lbl="This Month"/>
                <Stat icon="🏦" val="₹1.28L" lbl="Paid Out"/>
                <Stat icon="⏳" val="₹14k" lbl="Pending"/>
              </div>
              <div className="rounded-2xl border p-5" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                <div className="font-bold text-sm mb-2" style={{ color:"#ddd" }}>Payout History</div>
                <div className="text-sm text-center py-8 font-sans" style={{ color:"#555" }}>Connect your bank account to see payout history</div>
                <button className="w-full py-3 rounded-full text-sm font-bold font-sans text-white hover:opacity-90" style={{ background:`linear-gradient(135deg,${G},${DG})` }}>
                  Add Bank Account
                </button>
              </div>
            </>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <div className="max-w-md">
              <div className="rounded-2xl border p-5" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl font-bold text-white" style={{ background:`linear-gradient(135deg,${G},${DG})` }}>
                    {session?.user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color:"#ddd" }}>{session?.user?.name}</div>
                    <div className="text-sm font-sans" style={{ color:G }}>Verified Seller</div>
                    <div className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-sans" style={{ background:"#1a3a1a", color:"#5ec87e" }}>✓ Active</div>
                  </div>
                </div>
                {[["📧","Email",session?.user?.email||"—"],["📊","Total Listings",goats.length],["📦","Total Orders",orders.length],["⭐","Avg Rating","4.8 / 5"]].map(([ic,l,v]) => (
                  <div key={l as string} className="flex justify-between py-3 border-b text-sm font-sans" style={{ borderColor:"#222" }}>
                    <span style={{ color:"#666" }}>{ic} {l}</span>
                    <span className="font-semibold" style={{ color:"#ccc" }}>{v as any}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Goat Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)" }} onClick={e => e.target === e.currentTarget && setAddModal(false)}>
          <div className="w-full max-w-md rounded-2xl border overflow-hidden max-h-[90vh] flex flex-col" style={{ background:"#1a1a1a", borderColor:"#2a2a2a" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:"#2a2a2a" }}>
              <div className="font-bold text-sm" style={{ color:"#ddd" }}>Add New Goat</div>
              <button onClick={() => setAddModal(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-[#2a2a2a]" style={{ fontSize:16 }}>×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              <div><label className="text-xs font-sans mb-1 block" style={{ color:"#666" }}>Goat Name *</label><input placeholder="e.g. Sultan" value={newGoat.name} onChange={e=>setNewGoat(p=>({...p,name:e.target.value}))} className={inp}/></div>
              <div><label className="text-xs font-sans mb-1 block" style={{ color:"#666" }}>Breed *</label>
                <select value={newGoat.breed} onChange={e=>setNewGoat(p=>({...p,breed:e.target.value}))} className={inp} style={{ background:"#111" }}>
                  {BREEDS.map(b=><option key={b} value={b} style={{ background:"#111" }}>{b}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-sans mb-1 block" style={{ color:"#666" }}>Weight (kg)</label><input placeholder="45" value={newGoat.weight} onChange={e=>setNewGoat(p=>({...p,weight:e.target.value}))} className={inp}/></div>
                <div><label className="text-xs font-sans mb-1 block" style={{ color:"#666" }}>Age</label><input placeholder="12 months" value={newGoat.age} onChange={e=>setNewGoat(p=>({...p,age:e.target.value}))} className={inp}/></div>
              </div>
              <div><label className="text-xs font-sans mb-1 block" style={{ color:"#666" }}>Price (₹) *</label><input placeholder="25000" value={newGoat.price} onChange={e=>setNewGoat(p=>({...p,price:e.target.value}))} className={inp}/></div>
              <div><label className="text-xs font-sans mb-1 block" style={{ color:"#666" }}>Health</label>
                <select value={newGoat.health} onChange={e=>setNewGoat(p=>({...p,health:e.target.value}))} className={inp} style={{ background:"#111" }}>
                  {["Excellent","Good","Fair"].map(h=><option key={h} style={{ background:"#111" }}>{h}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-sans mb-1 block" style={{ color:"#666" }}>Description</label>
                <textarea placeholder="Describe your goat..." value={newGoat.desc} onChange={e=>setNewGoat(p=>({...p,desc:e.target.value}))} rows={3} className={inp} style={{ resize:"none" }}/>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newGoat.vaccinated} onChange={e=>setNewGoat(p=>({...p,vaccinated:e.target.checked}))} className="w-4 h-4 rounded accent-[#c8a96e]"/>
                <span className="text-sm font-sans" style={{ color:"#888" }}>Vaccinated</span>
              </label>
            </div>
            <div className="p-5 border-t" style={{ borderColor:"#2a2a2a" }}>
              <button onClick={addGoat} className="w-full py-3 rounded-full text-sm font-bold text-white font-sans hover:opacity-90 transition-opacity" style={{ background:`linear-gradient(135deg,${G},${DG})` }}>
                Add Listing →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
