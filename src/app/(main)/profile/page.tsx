"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ArrowLeft, Edit2, Save, X, Package, Heart, Star, LogOut } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useOrders } from "@/hooks/useOrders";
import { useStore } from "@/store/useStore";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { orders } = useOrders();
  const { wishlist } = useStore();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:"", phone:"", address:"", city:"", state:"", pin:"" });
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const inp = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-[#c8a96e] bg-[#faf8f4] transition-colors";

  useEffect(() => {
    if (session?.user) {
      axios.get("/api/user/profile").then(({ data }) => {
        if (data.success) {
          const u = data.data;
          setForm({ name: u.name || "", phone: u.phone || "", address: u.address?.street || "", city: u.address?.city || "", state: u.address?.state || "", pin: u.address?.pin || "" });
        }
      }).catch(() => {});
    }
  }, [session]);

  const save = async () => {
    setLoading(true);
    try {
      const { data } = await axios.patch("/api/user/profile", { name: form.name, phone: form.phone, address: { street: form.address, city: form.city, state: form.state, pin: form.pin } });
      if (data.success) { toast.success("Profile updated!"); setEditMode(false); await update({ name: form.name }); }
    } catch { toast.error("Failed to update"); }
    finally { setLoading(false); }
  };

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold font-serif mb-2">Login to view profile</h2>
        <Link href="/login" className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm">Login →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-7">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="flex-1 text-center text-xl font-bold font-serif">My Profile</h1>
        <button onClick={() => editMode ? save() : setEditMode(true)} disabled={loading}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${editMode ? "border-[#c8a96e] bg-[#c8a96e10] text-[#c8a96e]" : "border-gray-200 bg-white text-gray-500 hover:border-[#c8a96e]"}`}>
          {loading ? <span className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" /> : editMode ? <Save size={15} /> : <Edit2 size={15} />}
        </button>
      </div>

      {/* Avatar + name */}
      <div className="bg-gradient-to-br from-[#fdf6e8] to-white rounded-3xl border border-gray-100 p-6 text-center mb-5 shadow-sm">
        <div className="relative inline-block mb-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-4xl text-white font-bold shadow-lg">
            {session.user.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#c8a96e] flex items-center justify-center text-sm cursor-pointer">📷</div>
        </div>
        <h2 className="text-xl font-bold font-serif">{session.user.name}</h2>
        <p className="text-sm text-gray-400 font-sans">{session.user.email}</p>
        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-[#c8a96e22] text-[#8b5e2a] text-xs font-semibold font-sans">
          {session.user.role === "admin" ? "🛡️ Admin" : session.user.role === "seller" ? "🏪 Seller" : "🛒 Customer"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[[Package, "Orders", orders.length], [Heart, "Saved", wishlist.length], [Star, "Reviews", "—"]].map(([Icon, label, val]: any) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
            <Icon size={20} className="text-[#c8a96e] mx-auto mb-1.5" />
            <div className="text-xl font-bold text-[#c8a96e]">{val}</div>
            <div className="text-xs text-gray-400 font-sans">{label}</div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
        <h3 className="text-base font-bold font-serif mb-4">Personal Information</h3>
        {editMode ? (
          <div className="space-y-3">
            <div><label className="text-xs text-gray-400 font-sans mb-1 block">Full Name</label><input value={form.name} onChange={f("name")} className={inp} /></div>
            <div><label className="text-xs text-gray-400 font-sans mb-1 block">Phone</label><input value={form.phone} onChange={f("phone")} className={inp} /></div>
            <div><label className="text-xs text-gray-400 font-sans mb-1 block">Address</label><input value={form.address} onChange={f("address")} placeholder="Street address" className={inp} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-gray-400 font-sans mb-1 block">City</label><input value={form.city} onChange={f("city")} className={inp} /></div>
              <div><label className="text-xs text-gray-400 font-sans mb-1 block">State</label><input value={form.state} onChange={f("state")} className={inp} /></div>
              <div><label className="text-xs text-gray-400 font-sans mb-1 block">PIN</label><input value={form.pin} onChange={f("pin")} className={inp} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditMode(false)} className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm text-gray-500 font-sans hover:border-gray-300 flex items-center justify-center gap-1.5"><X size={13} /> Cancel</button>
              <button onClick={save} disabled={loading} className="flex-[2] py-2.5 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white text-sm font-bold font-sans hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1.5">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={13} /> Save Changes</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {[["👤","Name",session.user.name||"—"],["📧","Email",session.user.email||"—"],["📱","Phone",form.phone||"Not set"],["📍","Address",form.address?`${form.address}, ${form.city}, ${form.state} - ${form.pin}`:"Not set"]].map(([ic,l,v]) => (
              <div key={l as string} className="flex gap-3 py-3">
                <span className="text-lg flex-shrink-0">{ic}</span>
                <div>
                  <div className="text-xs text-gray-400 font-sans">{l as string}</div>
                  <div className={`text-sm font-semibold mt-0.5 ${v === "Not set" ? "text-gray-300" : "text-gray-800"}`}>{v as string}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full py-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-500 font-bold font-sans text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
        <LogOut size={15} /> Logout
      </button>
    </div>
  );
}
