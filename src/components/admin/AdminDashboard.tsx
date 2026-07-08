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
  { id:"goats",     ic:"🐐", l:"Goats"       },
  { id:"orders",    ic:"📦", l:"Orders"      },
  { id:"sellers",   ic:"🏪", l:"Sellers"     },
  { id:"customers", ic:"👥", l:"Customers"   },
  { id:"analytics", ic:"📈", l:"Analytics"   },
];

function Stat({ icon, val, lbl, clr }: any) {
  return (
    <div className="rounded-2xl p-4 border relative overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
      <div className="absolute inset-0" style={{ background:`radial-gradient(circle at 80% 20%,${clr||G}18,transparent)` }} />
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white mb-0.5">{val}</div>
      <div className="text-xs text-gray-600 uppercase tracking-wider font-sans">{lbl}</div>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get("/api/admin/stats"),
      axios.get("/api/sellers"),
      axios.get("/api/orders"),
      axios.get("/api/goats?status=all&limit=50"),
    ]).then(([s, sel, ord, g]) => {
      if (s.data.success) setStats(s.data.data);
      if (sel.data.success) setSellers(sel.data.data);
      if (ord.data.success) setOrders(ord.data.data);
      if (g.data.success) setGoats(g.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const approveSeller = async (id: string, status: string) => {
    try {
      await axios.patch(`/api/sellers/${id}`, { status });
      setSellers(prev => prev.map(s => s._id === id ? { ...s, sellerProfile: { ...s.sellerProfile, status } } : s));
      toast.success(`Seller ${status}!`);
    } catch { toast.error("Failed"); }
  };

  const toggleGoatStatus = async (id: string, current: string) => {
    const newStatus = current === "sold" ? "sale" : "sold";
    try {
      await axios.patch(`/api/goats/${id}`, { status: newStatus });
      setGoats(prev => prev.map(g => g._id === id ? { ...g, status: newStatus } : g));
      toast.success("Status updated");
    } catch { toast.error("Failed"); }
  };

  const sidebarItem = (t: any) => {
    const active = tab === t.id;
    const pending = t.id === "sellers" ? sellers.filter(s => s.sellerProfile?.status === "pending").length : 0;
    return (
      <div key={t.id} onClick={() => setTab(t.id)}
        style={{ background: active ? `${G}15` : "transparent", borderLeft: active ? `3px solid ${G}` : "3px solid transparent", color: active ? G : "#666" }}
        className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm font-sans transition-colors hover:bg-[#1a1a1a]">
        <span>{t.ic}</span><span className="flex-1">{t.l}</span>
        {pending > 0 && <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: "#f5a623" }}>{pending}</span>}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen" style={{ background:"#0f0f0f" }}>
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 flex flex-col border-r" style={{ background:"#141414", borderColor:"#1f1f1f" }}>
        <div className="p-4 border-b" style={{ borderColor:"#1f1f1f" }}>
          <div className="font-bold text-sm" style={{ color:G }}>Bakrawale</div>
          <div className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color:"#444" }}>Admin Panel</div>
        </div>
        <div className="flex-1 py-1.5">{TABS.map(sidebarItem)}</div>
        <div className="border-t" style={{ borderColor:"#1f1f1f" }}>
          <div onClick={() => router.push("/")} className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm font-sans text-gray-600 hover:bg-[#1a1a1a] transition-colors">
            <span>🌐</span><span>View Site</span>
          </div>
          <div onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm font-sans hover:bg-[#1a1a1a] transition-colors" style={{ color:"#c87e5e" }}>
            <span>🚪</span><span>Logout</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-3.5 border-b flex items-center justify-between sticky top-0 z-10" style={{ background:"#0f0f0f", borderColor:"#1f1f1f" }}>
          <div>
            <div className="text-lg font-bold capitalize" style={{ color:"#ddd" }}>{tab}</div>
            <div className="text-xs font-sans" style={{ color:"#444" }}>Bakrawale Admin • {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-sans px-3 py-1.5 rounded-full" style={{ background:"#1a3a1a", color:"#5ec87e" }}>● Online</div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background:"#1a1a1a" }} />)}
            </div>
          ) : (
            <>
              {/* Dashboard */}
              {tab === "dashboard" && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    <Stat icon="💰" val={stats ? `₹${(stats.totalRevenue/100000).toFixed(1)}L` : "—"} lbl="Revenue" clr={G}/>
                    <Stat icon="📦" val={stats?.totalOrders||0} lbl="Orders" clr="#5ec87e"/>
                    <Stat icon="🐐" val={stats?.activeGoats||0} lbl="Active Goats" clr="#5e9ec8"/>
                    <Stat icon="✅" val={stats?.soldGoats||0} lbl="Sold" clr="#a06ef0"/>
                    <Stat icon="🏪" val={stats?.totalSellers||0} lbl="Sellers" clr="#c87e5e"/>
                    <Stat icon="⏳" val={stats?.pendingSellers||0} lbl="Pending" clr="#f5a623"/>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="rounded-2xl border overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                      <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor:"#252525" }}>
                        <div className="font-bold text-sm" style={{ color:"#ddd" }}>Recent Orders</div>
                        <span onClick={() => setTab("orders")} className="text-xs cursor-pointer font-sans" style={{ color:G }}>All →</span>
                      </div>
                      {orders.slice(0,5).map(o => (
                        <div key={o._id} className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor:"#1c1c1c" }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-sans font-semibold truncate" style={{ color:"#ccc" }}>{o.goatName}</div>
                            <div className="text-xs font-sans" style={{ color:"#555" }}>{o.customerName}</div>
                          </div>
                          <div className="text-sm font-bold" style={{ color:G }}>{fmt(o.amount)}</div>
                          <div className="text-xs px-2 py-0.5 rounded-full font-bold font-sans" style={{ background:"#1a3a1a", color:"#5ec87e" }}>{o.status}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                      <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor:"#252525" }}>
                        <div className="font-bold text-sm" style={{ color:"#ddd" }}>Seller Status</div>
                        <span onClick={() => setTab("sellers")} className="text-xs cursor-pointer font-sans" style={{ color:G }}>Manage →</span>
                      </div>
                      {sellers.slice(0,5).map(s => (
                        <div key={s._id} className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor:"#1c1c1c" }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-sans font-semibold truncate" style={{ color:"#ccc" }}>{s.name}</div>
                            <div className="text-xs font-sans" style={{ color:"#555" }}>{s.sellerProfile?.location}</div>
                          </div>
                          <div className="text-xs px-2 py-0.5 rounded-full font-bold font-sans"
                            style={{ background: s.sellerProfile?.status==="approved" ? "#1a3a1a" : s.sellerProfile?.status==="pending" ? "#2a2a1a" : "#2a1a1a", color: s.sellerProfile?.status==="approved" ? "#5ec87e" : s.sellerProfile?.status==="pending" ? "#c8c85e" : "#c87e5e" }}>
                            {s.sellerProfile?.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Goats */}
              {tab === "goats" && (
                <div className="rounded-2xl border overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                  <div className="px-5 py-3.5 border-b" style={{ borderColor:"#252525" }}>
                    <div className="font-bold text-sm" style={{ color:"#ddd" }}>All Goats ({goats.length})</div>
                  </div>
                  <div className="divide-y" style={{ borderColor:"#1c1c1c" }}>
                    {goats.map(g => (
                      <div key={g._id} className="px-5 py-3 flex items-center gap-3">
                        {g.images?.[0] && <img src={g.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold font-sans truncate" style={{ color:"#ccc" }}>{g.name}</div>
                          <div className="text-xs font-sans" style={{ color:"#555" }}>{g.breed} • {g.sellerName}</div>
                        </div>
                        <div className="text-sm font-bold font-sans" style={{ color:G }}>{fmt(g.price)}</div>
                        <div className="text-xs px-2 py-0.5 rounded-full font-bold font-sans"
                          style={{ background: g.status==="sale" ? "#1a3a1a" : "#252525", color: g.status==="sale" ? "#5ec87e" : "#666" }}>
                          {g.status}
                        </div>
                        <button onClick={() => toggleGoatStatus(g._id, g.status)}
                          className="text-xs px-3 py-1.5 rounded-lg font-sans border transition-colors"
                          style={{ borderColor:"#333", color:"#888", background:"transparent" }}>
                          {g.status === "sold" ? "Relist" : "Mark Sold"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders */}
              {tab === "orders" && (
                <div className="rounded-2xl border overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                  <div className="px-5 py-3.5 border-b" style={{ borderColor:"#252525" }}>
                    <div className="font-bold text-sm" style={{ color:"#ddd" }}>All Orders ({orders.length})</div>
                  </div>
                  <div className="divide-y" style={{ borderColor:"#1c1c1c" }}>
                    {orders.map(o => (
                      <div key={o._id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                        <div className="text-xs font-bold font-sans" style={{ color:G, minWidth:80 }}>{o.orderId}</div>
                        <div className="flex-1 min-w-[100px]">
                          <div className="text-sm font-sans" style={{ color:"#ccc" }}>{o.goatName}</div>
                          <div className="text-xs font-sans" style={{ color:"#555" }}>{o.customerName} → {o.sellerName}</div>
                        </div>
                        <div className="text-sm font-bold font-sans" style={{ color:G }}>{fmt(o.amount)}</div>
                        <div className="text-xs px-2 py-0.5 rounded-full font-bold font-sans"
                          style={{ background:"#1a3a1a", color:"#5ec87e" }}>{o.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sellers */}
              {tab === "sellers" && (
                <div className="space-y-3">
                  {sellers.map(s => (
                    <div key={s._id} className="rounded-2xl border p-4" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[140px]">
                          <div className="font-bold text-sm" style={{ color:"#ddd" }}>{s.name}</div>
                          <div className="text-xs font-sans mt-0.5" style={{ color:"#666" }}>{s.email} • {s.sellerProfile?.location}</div>
                        </div>
                        <div className="text-sm font-bold font-sans" style={{ color:G }}>{fmt(s.sellerProfile?.totalSales * 20000 || 0)}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-xs px-2.5 py-1 rounded-full font-bold font-sans"
                            style={{ background: s.sellerProfile?.status==="approved" ? "#1a3a1a" : s.sellerProfile?.status==="pending" ? "#2a2a1a" : "#2a1a1a", color: s.sellerProfile?.status==="approved" ? "#5ec87e" : s.sellerProfile?.status==="pending" ? "#c8c85e" : "#c87e5e" }}>
                            {s.sellerProfile?.status}
                          </div>
                          {s.sellerProfile?.status === "pending" && (
                            <>
                              <button onClick={() => approveSeller(s._id, "approved")} className="text-xs px-3 py-1.5 rounded-lg font-bold font-sans" style={{ background:"#1a3a1a", color:"#5ec87e" }}>✓ Approve</button>
                              <button onClick={() => approveSeller(s._id, "suspended")} className="text-xs px-3 py-1.5 rounded-lg font-bold font-sans" style={{ background:"#3a1a1a", color:"#c87e5e" }}>✗ Reject</button>
                            </>
                          )}
                          {s.sellerProfile?.status === "approved" && (
                            <button onClick={() => approveSeller(s._id, "suspended")} className="text-xs px-3 py-1.5 rounded-lg font-sans" style={{ background:"#3a2a1a", color:"#f5a623" }}>Suspend</button>
                          )}
                          {s.sellerProfile?.status === "suspended" && (
                            <button onClick={() => approveSeller(s._id, "approved")} className="text-xs px-3 py-1.5 rounded-lg font-sans" style={{ background:"#1a3a1a", color:"#5ec87e" }}>Reinstate</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Analytics */}
              {tab === "analytics" && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[{l:"Monthly Revenue",v:"₹1,24,500",c:"+18%"},{l:"New Orders",v:"34",c:"+12%"},{l:"New Sellers",v:"3",c:"+50%"},{l:"Reviews",v:"28",c:"+40%"}].map(s => (
                      <div key={s.l} className="rounded-2xl border p-4" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                        <div className="text-[10px] uppercase tracking-wider font-sans mb-2" style={{ color:"#555" }}>{s.l}</div>
                        <div className="text-xl font-bold text-white mb-1">{s.v}</div>
                        <div className="text-xs font-sans" style={{ color:"#5ec87e" }}>{s.c}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border p-5" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                    <div className="font-bold text-sm mb-5" style={{ color:"#ddd" }}>Revenue by Breed</div>
                    {[["Jamunapari","#d4a96e",78,"₹1.8L"],["Beetal","#c07050",65,"₹1.4L"],["Sirohi","#b89060",52,"₹1.1L"],["Osmanabadi","#c89e3e",48,"₹98k"],["Barbari","#7b9e87",42,"₹84k"]].map(([name,color,pct,val]) => (
                      <div key={name as string} className="flex items-center gap-3 mb-3">
                        <div className="w-24 text-xs font-sans" style={{ color:"#666" }}>{name as string}</div>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:"#222" }}>
                          <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:color as string }} />
                        </div>
                        <div className="w-12 text-xs font-bold font-sans text-right" style={{ color:G }}>{val as string}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Customers */}
              {tab === "customers" && (
                <div className="rounded-2xl border overflow-hidden" style={{ background:"#1a1a1a", borderColor:"#252525" }}>
                  <div className="px-5 py-3.5 border-b" style={{ borderColor:"#252525" }}>
                    <div className="font-bold text-sm" style={{ color:"#ddd" }}>All Customers</div>
                  </div>
                  <div className="p-5 text-center" style={{ color:"#555" }}>
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-sm font-sans">Customer data synced from database</div>
                    <div className="text-xs font-sans mt-1" style={{ color:"#444" }}>{stats?.totalCustomers || 0} total customers</div>
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
