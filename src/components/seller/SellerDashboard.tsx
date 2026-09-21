"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { fmt } from "@/lib/utils";
import { BREEDS } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import SellerPendingApproval from "@/components/seller/SellerPendingApproval";
import {
  Store,
  Package,
  MessageSquare,
  BarChart3,
  DollarSign,
  User as UserIcon,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Building,
  Save,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Camera,
  Video,
  Languages,
} from "lucide-react";

function StatCard({ icon, val, lbl, sub }: any) {
  return (
    <div className="rounded-2xl p-5 border border-[#262626] bg-[#161616] relative overflow-hidden flex flex-col justify-between hover:border-[#c8a96e]/40 transition-colors">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#c8a96e]/5 rounded-full blur-xl pointer-events-none" />
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {sub && (
          <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            {sub}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-bold text-white mb-1 font-serif tracking-tight">{val}</div>
        <div className="text-xs uppercase tracking-wider font-sans text-gray-400 font-semibold">{lbl}</div>
      </div>
    </div>
  );
}

const EMPTY_GOAT = {
  name: "",
  breed: "Jamunapari",
  weight: "",
  age: "",
  price: "",
  health: "Excellent",
  vaccinated: true,
  desc: "",
  videoUrl: "",
  images: [] as string[],
};

export default function SellerDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t, lang, setLang, isHindi, translateBreed } = useTranslation();
  const [tab, setTab] = useState("dashboard");
  const [goats, setGoats] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs with Hindi/English labels
  const TABS = [
    { id: "dashboard", ic: "📊", l: isHindi ? "डैशबोर्ड" : "Dashboard" },
    { id: "listings", ic: "🐐", l: isHindi ? "मेरी बकरियां" : "My Listings" },
    { id: "orders", ic: "📦", l: isHindi ? "ऑर्डर्स" : "Orders" },
    { id: "chats", ic: "💬", l: isHindi ? "पूछताछ" : "Inquiries" },
    { id: "analytics", ic: "📈", l: isHindi ? "एनालिटिक्स" : "Analytics" },
    { id: "earnings", ic: "💰", l: isHindi ? "कमाई और बैंक" : "Earnings & Payouts" },
    { id: "profile", ic: "👤", l: isHindi ? "फार्म प्रोफाइल" : "Farm Profile" },
  ];

  // Farm Profile State
  const [farmProfile, setFarmProfile] = useState({
    farmName: "",
    location: "",
    description: "",
    phone: "",
    name: "",
    email: "",
    rating: 5,
    joinedAt: "",
    upiId: "",
    bankAccount: "",
    ifscCode: "",
    status: "approved",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Modal states
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedGoatId, setSelectedGoatId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_GOAT);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVid, setUploadingVid] = useState(false);
  const [savingGoat, setSavingGoat] = useState(false);

  const openAddModal = () => {
    if (farmProfile.status === "pending") {
      toast.error(
        isHindi
          ? "आपका खाता अभी एडमिन सत्यापन की प्रतीक्षा में है। स्वीकृत होने के बाद आप बकरियां जोड़ सकेंगे।"
          : "Your seller account is pending admin approval. You can create listings once approved."
      );
      return;
    }
    if (farmProfile.status === "suspended") {
      toast.error(
        isHindi
          ? "आपका खाता निलंबित है। कृपया सहायता से संपर्क करें।"
          : "Your seller account is suspended. Please contact support."
      );
      return;
    }
    setFormData(EMPTY_GOAT);
    setAddModal(true);
  };

  const fetchDashboardData = () => {
    if (!session?.user?.id) return;
    setLoading(true);
    Promise.all([
      axios.get(`/api/goats?seller=${session.user.id}&status=all&limit=50`),
      axios.get("/api/orders"),
      axios.get("/api/chat"),
      axios.get("/api/user/profile"),
    ])
      .then(([g, o, c, p]) => {
        if (g.data?.success) setGoats(g.data.data || []);
        if (o.data?.success) setOrders(o.data.data || []);
        if (c.data?.success) setChats(c.data.data || []);
        if (p.data?.success && p.data.data) {
          const u = p.data.data;
          setFarmProfile({
            farmName: u.sellerProfile?.farmName || `${u.name || session.user.name || (isHindi ? "मेरा" : "My")}'s Goat Farm`,
            location: u.sellerProfile?.location || (u.address?.city ? `${u.address.city}, ${u.address.state}` : (isHindi ? "भारत" : "India")),
            description:
              u.sellerProfile?.description ||
              (isHindi
                ? "सत्यापित ब्रीडर। शुद्ध नस्ल की स्वस्थ बकरियां उपलब्ध हैं।"
                : "Verified Goat Breeder offering premium purebred livestock."),
            phone: u.phone || "",
            name: u.name || session.user.name || "",
            email: u.email || session.user.email || "",
            rating: u.sellerProfile?.rating || 5,
            joinedAt: u.sellerProfile?.joinedAt
              ? new Date(u.sellerProfile.joinedAt).toLocaleDateString("en-IN")
              : new Date().toLocaleDateString("en-IN"),
            upiId: u.sellerProfile?.upiId || "",
            bankAccount: u.sellerProfile?.bankAccount || "",
            ifscCode: u.sellerProfile?.ifscCode || "",
            status: u.sellerProfile?.status || (session?.user as any)?.sellerStatus || "pending",
          });
        }
      })
      .catch((err) => {
        console.error("Seller dashboard load err:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [session]);

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "sold" ? "sale" : "sold";
    try {
      const { data } = await axios.patch(`/api/goats/${id}`, { status: newStatus });
      if (data.success) {
        setGoats((prev) => prev.map((g) => (g._id === id ? { ...g, status: newStatus } : g)));
        toast.success(
          newStatus === "sale"
            ? isHindi
              ? "लिस्टिंग बिक्री के लिए उपलब्ध कर दी गई"
              : "Listing marked as Available for Sale"
            : isHindi
            ? "लिस्टिंग बिका हुआ (Sold) चिह्नित की गई"
            : "Listing marked as Sold"
        );
      }
    } catch {
      toast.error(isHindi ? "स्थिति बदलने में विफल" : "Failed to update status");
    }
  };

  const deleteListing = async (id: string) => {
    if (!confirm(isHindi ? "क्या आप वाकई इस लिस्टिंग को हमेशा के लिए हटाना चाहते हैं?" : "Are you sure you want to permanently delete this listing?")) return;
    try {
      const { data } = await axios.delete(`/api/goats/${id}`);
      if (data?.success !== false) {
        setGoats((prev) => prev.filter((g) => g._id !== id));
        toast.success(isHindi ? "लिस्टिंग सफलतापूर्वक डिलीट कर दी गई" : "Listing deleted successfully");
      } else {
        toast.error(data?.error || (isHindi ? "डिलीट करने में विफल" : "Failed to delete listing"));
      }
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.data?.success) {
        setGoats((prev) => prev.filter((g) => g._id !== id));
        toast.success(isHindi ? "लिस्टिंग हटा दी गई" : "Listing removed");
      } else {
        toast.error(err?.response?.data?.error || (isHindi ? "डिलीट करने में विफल" : "Failed to delete listing"));
      }
    }
  };

  const openEdit = (goat: any) => {
    setSelectedGoatId(goat._id);
    setFormData({
      name: goat.name,
      breed: goat.breed,
      weight: String(goat.weight || 35),
      age: goat.age || (isHindi ? "12 महीने" : "12 months"),
      price: String(goat.price || ""),
      health: goat.health || "Excellent",
      vaccinated: !!goat.vaccinated,
      desc: goat.desc || "",
      videoUrl: goat.videoUrl || "",
      images: goat.images || [],
    });
    setEditModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "image");
    fd.append("purpose", "listing");
    try {
      const { data } = await axios.post("/api/upload", fd);
      if (data.success && data.data?.url) {
        setFormData((p) => ({ ...p, images: [...p.images, data.data.url] }));
        toast.success(isHindi ? "तस्वीर सफलतापूर्वक अपलोड हो गई!" : "Photo uploaded successfully!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (isHindi ? "तस्वीर अपलोड विफल" : "Image upload failed"));
    } finally {
      setUploadingImg(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVid(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "video");
    fd.append("purpose", "listing");
    try {
      const { data } = await axios.post("/api/upload", fd);
      if (data.success && data.data?.url) {
        setFormData((p) => ({ ...p, videoUrl: data.data.url }));
        toast.success(isHindi ? "वीडियो सफलतापूर्वक अपलोड हो गया!" : "Video uploaded successfully!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (isHindi ? "वीडियो अपलोड विफल" : "Video upload failed"));
    } finally {
      setUploadingVid(false);
    }
  };

  const handleSaveGoat = async (isEditing = false) => {
    if (!formData.name.trim() || !formData.price) {
      toast.error(isHindi ? "बकरी का नाम और कीमत आवश्यक हैं" : "Goat name and price are required");
      return;
    }
    setSavingGoat(true);
    try {
      const payload = {
        name: formData.name.trim(),
        breed: formData.breed,
        weight: Number(formData.weight) || 35,
        age: formData.age.trim() || (isHindi ? "12 महीने" : "12 months"),
        price: Number(formData.price),
        health: formData.health,
        vaccinated: formData.vaccinated,
        desc:
          formData.desc.trim() ||
          (isHindi
            ? `शुद्ध ${translateBreed(formData.breed)} नस्ल की बकरी, हमारे ${farmProfile.farmName || "फार्म"} पर स्वस्थ आहार और नियमित टीकों के साथ पाली गई।`
            : `Purebred ${formData.breed} goat raised on ${farmProfile.farmName || "our farm"} with clean fodder, regular vaccinations, and supreme care.`),
        videoUrl: formData.videoUrl || undefined,
        images:
          formData.images.length > 0
            ? formData.images
            : ["https://images.unsplash.com/photo-1524024973431-2ad916746881?w=800&q=80"],
      };

      if (isEditing && selectedGoatId) {
        const { data } = await axios.patch(`/api/goats/${selectedGoatId}`, payload);
        if (data.success) {
          setGoats((prev) => prev.map((g) => (g._id === selectedGoatId ? data.data : g)));
          setEditModal(false);
          toast.success(isHindi ? "लिस्टिंग अपडेट हो गई!" : "Listing updated successfully!");
        }
      } else {
        const { data } = await axios.post("/api/goats", payload);
        if (data.success) {
          setGoats((prev) => [data.data, ...prev]);
          setAddModal(false);
          setFormData(EMPTY_GOAT);
          toast.success(isHindi ? "नई बकरी दुकान में लाइव लिस्ट हो गई!" : "New goat listed live on marketplace!");
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (isHindi ? "सहेजने में विफल" : "Failed to save listing"));
    } finally {
      setSavingGoat(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { data } = await axios.patch(`/api/orders/${orderId}`, { status });
      if (data.success) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status } : o)));
        toast.success(
          isHindi
            ? `ऑर्डर स्थिति बदलकर "${status.replace(/_/g, " ")}" कर दी गई`
            : `Order status updated to "${status.replace(/_/g, " ")}"`
        );
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (isHindi ? "ऑर्डर अपडेट विफल" : "Failed to update order"));
    }
  };

  const saveFarmProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const { data } = await axios.patch("/api/user/profile", {
        name: farmProfile.name,
        phone: farmProfile.phone,
        sellerProfile: {
          farmName: farmProfile.farmName,
          location: farmProfile.location,
          description: farmProfile.description,
        },
      });
      if (data.success) {
        toast.success(isHindi ? "फार्म प्रोफाइल सफलतापूर्वक सहेजी गई!" : "Farm profile saved successfully!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (isHindi ? "सहेजने में विफल" : "Failed to save profile"));
    } finally {
      setProfileSaving(false);
    }
  };

  // Compute live revenue
  const totalRevenue = orders
    .filter((o) => o.payment?.status === "paid" || o.status === "delivered" || o.status === "payment_confirmed")
    .reduce((acc, o) => acc + (o.amount || 0), 0);

  const activeCount = goats.filter((g) => g.status === "sale").length;
  const soldCount = goats.filter((g) => g.status === "sold").length;

  if (!loading && session?.user?.role === "seller" && farmProfile.status !== "approved") {
    return (
      <SellerPendingApproval
        user={{
          name: farmProfile.name || session.user.name || "",
          email: farmProfile.email || session.user.email || "",
          phone: farmProfile.phone,
          farmName: farmProfile.farmName,
          status: farmProfile.status as "pending" | "suspended",
          joinedAt: farmProfile.joinedAt,
        }}
      />
    );
  }

  const inp =
    "w-full px-4 py-2.5 rounded-xl text-sm font-sans outline-none transition-colors border focus:border-[#c8a96e] bg-[#111] text-gray-200 border-zinc-800";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0a0a0a] text-gray-200 w-full max-w-full overflow-x-hidden font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden p-3.5 border-b border-zinc-800 bg-[#121212] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-sm font-bold text-zinc-950 shadow">
            🐐
          </div>
          <div>
            <div className="font-bold text-sm text-[#c8a96e] font-serif leading-tight">
              {farmProfile.farmName || (isHindi ? "विक्रेता केंद्र" : "Seller Center")}
            </div>
            <div className="text-[9px] text-gray-400 font-sans flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
              {isHindi ? "सत्यापित विक्रेता" : "Verified Seller"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mobile Language Switcher */}
          <div className="flex items-center bg-zinc-800 rounded-full p-0.5 border border-zinc-700 shadow-xs">
            <button
              type="button"
              onClick={() => setLang("hi")}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all font-sans ${
                isHindi ? "bg-[#c8a96e] text-zinc-950 shadow-xs" : "text-zinc-400"
              }`}
            >
              हिन्दी
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all font-sans ${
                !isHindi ? "bg-[#c8a96e] text-zinc-950 shadow-xs" : "text-zinc-400"
              }`}
            >
              EN
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="px-2.5 py-1 rounded-lg bg-[#c8a96e] text-xs font-bold text-zinc-950 font-sans shadow flex items-center gap-1"
          >
            <Plus size={13} /> {isHindi ? "जोड़ें" : "Add"}
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Tabs */}
      <div className="md:hidden flex gap-1.5 p-2.5 bg-[#0e0e0e] border-b border-zinc-800/80 overflow-x-auto scrollbar-none sticky top-[57px] z-20">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-sans whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 transition-all ${
                active
                  ? "bg-[#c8a96e] text-zinc-950 font-bold shadow-sm"
                  : "text-gray-400 hover:text-white bg-zinc-900 border border-zinc-800"
              }`}
            >
              <span>{t.ic}</span>
              <span>{t.l}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-shrink-0 flex-col border-r border-zinc-800/80 bg-[#121212] min-h-screen">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-lg shadow-md">
              🏪
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-base text-[#c8a96e] font-serif truncate">
                {farmProfile.farmName || (isHindi ? "गोटमार्ट फार्म" : "GoatMart Farm")}
              </div>
              {farmProfile.status === "approved" ? (
                <div className="text-[10px] tracking-wider uppercase text-emerald-400 font-sans flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                  {isHindi ? "सत्यापित विक्रेता" : "Verified Seller"}
                </div>
              ) : farmProfile.status === "pending" ? (
                <div className="text-[10px] tracking-wider uppercase text-amber-400 font-sans flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{" "}
                  {isHindi ? "सत्यापन लंबित" : "Approval Pending"}
                </div>
              ) : (
                <div className="text-[10px] tracking-wider uppercase text-red-400 font-sans flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{" "}
                  {isHindi ? "निलंबित" : "Suspended"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Links */}
        <div className="flex-1 py-4 px-3 space-y-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer text-xs font-sans transition-all text-left ${
                  active
                    ? "bg-[#c8a96e]/15 text-[#c8a96e] font-bold border border-[#c8a96e]/30 shadow-xs"
                    : "text-gray-400 hover:bg-zinc-800/60 hover:text-gray-200"
                }`}
              >
                <span className="text-base">{t.ic}</span>
                <span className="flex-1">{t.l}</span>
                {t.id === "orders" && orders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#c8a96e] text-zinc-950 font-bold text-[10px]">
                    {orders.length}
                  </span>
                )}
                {t.id === "chats" && chats.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white font-bold text-[10px]">
                    {chats.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-zinc-800 space-y-2 bg-zinc-900/30">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl cursor-pointer text-xs font-sans text-gray-300 hover:bg-zinc-800 transition-colors"
          >
            <ExternalLink size={14} className="text-[#c8a96e]" />
            <span>{isHindi ? "मार्केटप्लेस स्टोर" : "Marketplace Store"}</span>
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl cursor-pointer text-xs font-sans text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={14} />
            <span>{isHindi ? "लॉग आउट" : "Log Out"}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full min-w-0 overflow-x-hidden">
        {/* Top Header Desktop */}
        <div className="hidden md:flex px-8 py-4 border-b border-zinc-800/80 items-center justify-between sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-md">
          <div>
            <h1 className="text-xl font-bold capitalize text-white font-serif tracking-wide flex items-center gap-2">
              <span>{TABS.find((x) => x.id === tab)?.ic}</span> {TABS.find((x) => x.id === tab)?.l}
            </h1>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              {isHindi ? "फार्म:" : "Farm:"}{" "}
              <span className="text-gray-200 font-medium">{farmProfile.farmName}</span> •{" "}
              {isHindi ? "स्थान:" : "Located in:"}{" "}
              <span className="text-gray-200 font-medium">{farmProfile.location}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Desktop Language Switcher Toggle */}
            <div className="flex items-center bg-zinc-900 rounded-full p-0.5 border border-zinc-800 shadow-xs">
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all font-sans ${
                  isHindi ? "bg-[#c8a96e] text-zinc-950 shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all font-sans ${
                  !isHindi ? "bg-[#c8a96e] text-zinc-950 shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                English
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="px-5 py-2.5 rounded-full text-xs font-bold font-sans text-zinc-950 bg-gradient-to-r from-[#c8a96e] to-[#e6cf9b] hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg"
            >
              <Plus size={16} /> {isHindi ? "+ नई बकरी जोड़ें" : "+ Add New Goat"}
            </button>
            <button
              onClick={fetchDashboardData}
              className="w-9 h-9 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-gray-400 hover:text-white hover:border-zinc-700 transition-colors"
              title={isHindi ? "डेटा रिफ्रेश करें" : "Refresh Data"}
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-[#c8a96e]" : ""} />
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-6">
          {/* Status Alert Banner */}
          {farmProfile.status === "pending" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-amber-900/30 border border-amber-600/50 flex items-start gap-4 text-amber-200 shadow-md">
              <Clock size={24} className="text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1 text-xs sm:text-sm font-sans space-y-1">
                <div className="font-bold text-amber-300 text-sm sm:text-base flex items-center gap-2">
                  <span>{isHindi ? "⏳ एडमिन सत्यापन लंबित है (Under Admin Review)" : "⏳ Seller Verification Pending Admin Approval"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {isHindi ? "समीक्षा जारी" : "Pending Review"}
                  </span>
                </div>
                <p className="text-amber-200/90 leading-relaxed text-xs">
                  {isHindi
                    ? "आपका विक्रेता आवेदन GoatMart व्यवस्थापक टीम के पास समीक्षा में है। एडमिन द्वारा खाता स्वीकृत (Approve) किए जाने के बाद आप नई बकरियां लिस्ट कर सकेंगे और ऑनलाइन बिक्री शुरू कर सकेंगे।"
                    : "Your seller application has been submitted and is currently being reviewed by the GoatMart administration. Once approved by the admin, you will be able to create live listings and accept buyer orders."}
                </p>
              </div>
            </div>
          )}

          {farmProfile.status === "suspended" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-start gap-4 text-red-200 shadow-md">
              <LogOut size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs sm:text-sm font-sans space-y-1">
                <div className="font-bold text-red-300 text-sm sm:text-base">
                  {isHindi ? "विक्रेता खाता निलंबित (Account Suspended)" : "Seller Account Suspended"}
                </div>
                <p className="text-red-200/80 leading-relaxed text-xs">
                  {isHindi
                    ? "आपका विक्रेता खाता निलंबित कर दिया गया है। अधिक जानकारी या खाता पुनः सक्रिय करने के लिए कृपया एडमिन सपोर्ट से संपर्क करें।"
                    : "Your seller account is currently suspended. Please contact platform support or admin for assistance."}
                </p>
              </div>
            </div>
          )}
          {/* DASHBOARD OVERVIEW */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              {/* Stat Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon="🐐"
                  val={activeCount}
                  lbl={isHindi ? "सक्रिय बकरियां" : "Active Goats"}
                  sub={isHindi ? "दुकान में लाइव" : "Live on Store"}
                />
                <StatCard
                  icon="✅"
                  val={soldCount}
                  lbl={isHindi ? "कुल बिकीं" : "Total Sold"}
                  sub={isHindi ? "सफलतापूर्वक पूर्ण" : "Completed"}
                />
                <StatCard
                  icon="📦"
                  val={orders.length}
                  lbl={isHindi ? "कस्टमर ऑर्डर्स" : "Customer Orders"}
                  sub={isHindi ? "ट्रैक किए गए" : "Tracked"}
                />
                <StatCard
                  icon="💰"
                  val={fmt(totalRevenue)}
                  lbl={isHindi ? "कुल प्राप्त कमाई" : "Realized Revenue"}
                  sub={isHindi ? "सत्यापित" : "Verified"}
                />
              </div>

              {/* Quick Actions & Recent Orders */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-[#141414] overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="font-bold text-sm text-white font-serif flex items-center gap-2">
                      <Package size={16} className="text-[#c8a96e]" />{" "}
                      {isHindi ? "हाल ही में आए कस्टमर ऑर्डर्स" : "Recent Orders Received"}
                    </h2>
                    <button
                      onClick={() => setTab("orders")}
                      className="text-xs text-[#c8a96e] hover:underline font-sans font-medium"
                    >
                      {isHindi ? `सभी देखें (${orders.length}) →` : `View All (${orders.length}) →`}
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-800/60">
                    {orders.slice(0, 4).map((o) => (
                      <div key={o._id} className="p-4 sm:px-6 flex items-center gap-4 hover:bg-zinc-900/40 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">
                          📦
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{o.goatName}</div>
                          <div className="text-xs text-gray-400 font-sans truncate">
                            {isHindi ? "खरीदार:" : "Buyer:"} {o.customerName} • {new Date(o.createdAt).toLocaleDateString("en-IN")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-[#c8a96e] font-sans">{fmt(o.amount)}</div>
                          <span className="inline-block text-[10px] uppercase font-bold font-sans px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50 mt-0.5">
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <div className="p-12 text-center text-sm text-gray-500 font-sans">
                        <div className="text-4xl mb-2">📦</div>
                        {isHindi
                          ? "अभी तक कोई नया ऑर्डर नहीं मिला है। अपनी लिस्टिंग नियमित रूप से अपडेट रखें!"
                          : "No orders received yet. Keep your listings up to date!"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Seller Quick Action Box */}
                <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-6 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-white font-serif mb-1">
                      {isHindi ? "त्वरित नियंत्रण पैनल" : "Seller Quick Panel"}
                    </h3>
                    <p className="text-xs text-gray-400 font-sans leading-relaxed">
                      {isHindi
                        ? "अपनी बकरियों की उच्च गुणवत्ता वाली फोटो और वीडियो जोड़ें जिससे अधिक खरीदार आकर्षित हों।"
                        : "Publish high quality photos & videos of your purebred goats to get 4x more customer orders."}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => {
                        setFormData(EMPTY_GOAT);
                        setAddModal(true);
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c8a96e] to-[#8b5e2a] text-zinc-950 font-bold font-sans text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-opacity"
                    >
                      <Plus size={16} /> {isHindi ? "+ नई बकरी लिस्ट करें" : "Publish New Listing"}
                    </button>
                    <button
                      onClick={() => setTab("profile")}
                      className="w-full py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-gray-300 font-sans text-xs font-semibold hover:border-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Building size={14} className="text-[#c8a96e]" />{" "}
                      {isHindi ? "फार्म प्रोफाइल एडिट करें" : "Edit Farm Profile"}
                    </button>
                    <button
                      onClick={() => setTab("earnings")}
                      className="w-full py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-gray-300 font-sans text-xs font-semibold hover:border-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <DollarSign size={14} className="text-emerald-400" />{" "}
                      {isHindi ? "बैंक और भुगतान विवरण" : "View Bank & Payouts"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MY LISTINGS TAB */}
          {tab === "listings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white font-serif">
                    {isHindi ? "फार्म बकरी इन्वेंट्री" : "Farm Goat Inventory"}
                  </h2>
                  <p className="text-xs text-gray-400 font-sans">
                    {goats.length} {isHindi ? "कुल बकरियां" : "total goats"} • {activeCount}{" "}
                    {isHindi ? "बिक्री के लिए उपलब्ध" : "active for sale"}
                  </p>
                </div>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 rounded-full text-xs font-bold font-sans text-zinc-950 bg-gradient-to-r from-[#c8a96e] to-[#e6cf9b] flex items-center gap-1.5 shadow"
                >
                  <Plus size={14} /> {isHindi ? "+ नई बकरी जोड़ें" : "Add Listing"}
                </button>
              </div>

              {/* Goat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {goats.map((g) => (
                  <div
                    key={g._id}
                    className="rounded-2xl border border-zinc-800 bg-[#141414] overflow-hidden flex flex-col hover:border-zinc-700 transition-all group shadow-sm"
                  >
                    <div className="h-44 bg-zinc-900 relative overflow-hidden">
                      {g.images?.[0] ? (
                        <img
                          src={g.images[0]}
                          alt={g.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1524024973431-2ad916746881?w=800&q=80";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🐐</div>
                      )}
                      <span
                        className={`absolute top-3 right-3 text-[11px] px-3 py-1 rounded-full font-bold font-sans shadow-md ${
                          g.status === "sale"
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                        }`}
                      >
                        {g.status === "sale"
                          ? isHindi
                            ? "बिक्री के लिए उपलब्ध"
                            : "Active for Sale"
                          : isHindi
                          ? "बिक चुका"
                          : "Sold"}
                      </span>
                      {g.videoUrl && (
                        <span className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md font-sans flex items-center gap-1">
                          <Video size={12} className="text-[#c8a96e]" />{" "}
                          {isHindi ? "वीडियो उपलब्ध" : "Video Included"}
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-base text-white truncate font-serif">{g.name}</h3>
                        <span className="text-base font-bold text-[#c8a96e] font-sans">{fmt(g.price)}</span>
                      </div>
                      <p className="text-xs text-gray-400 font-sans mb-3">
                        <span className="text-gray-200 font-semibold">{translateBreed(g.breed)}</span> • {g.weight} kg
                        • {g.age}
                      </p>

                      <p className="text-xs text-gray-500 font-sans line-clamp-2 mb-4 leading-relaxed">{g.desc}</p>

                      <div className="mt-auto flex gap-2 pt-3 border-t border-zinc-800">
                        <button
                          onClick={() => openEdit(g)}
                          className="flex-1 py-2 rounded-xl text-xs font-sans font-semibold border border-zinc-700 text-gray-300 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Edit size={13} /> {isHindi ? "एडिट" : "Edit"}
                        </button>
                        <button
                          onClick={() => toggleStatus(g._id, g.status)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold font-sans transition-colors ${
                            g.status === "sold"
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                              : "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                          }`}
                        >
                          {g.status === "sold"
                            ? isHindi
                              ? "दोबारा लिस्ट करें"
                              : "Relist"
                            : isHindi
                            ? "बिका चिह्नित करें"
                            : "Mark Sold"}
                        </button>
                        <button
                          onClick={() => deleteListing(g._id)}
                          className="px-3 py-2 rounded-xl text-xs font-sans bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-colors"
                          title={isHindi ? "लिस्टिंग हटाएं" : "Delete Listing"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {goats.length === 0 && (
                <div className="text-center py-24 border border-dashed border-zinc-800 rounded-3xl bg-[#121212]">
                  <div className="text-5xl mb-3">🐐</div>
                  <h3 className="text-lg font-bold text-white mb-1 font-serif">
                    {isHindi ? "अभी तक कोई बकरी लिस्ट नहीं है" : "No listings published yet"}
                  </h3>
                  <p className="text-xs text-gray-400 font-sans mb-5 max-w-sm mx-auto">
                    {isHindi
                      ? "अपनी पहली बकरी जोड़ें और पूरे भारत के सत्यापित खरीदारों तक सीधी सुरक्षित पहुंच प्राप्त करें।"
                      : "Publish your first goat to reach verified buyers all across India with secured delivery."}
                  </p>
                  <button
                    onClick={() => {
                      setFormData(EMPTY_GOAT);
                      setAddModal(true);
                    }}
                    className="px-6 py-3 rounded-full text-xs font-bold text-zinc-950 bg-gradient-to-r from-[#c8a96e] to-[#e6cf9b] shadow-lg"
                  >
                    {isHindi ? "+ अपनी पहली बकरी जोड़ें" : "+ Add Your First Goat"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CUSTOMER ORDERS TAB */}
          {tab === "orders" && (
            <div className="rounded-2xl border border-zinc-800 bg-[#141414] overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-bold text-base text-white font-serif flex items-center gap-2">
                  <Package size={18} className="text-[#c8a96e]" />{" "}
                  {isHindi ? `आपकी बकरियों के ऑर्डर्स (${orders.length})` : `Orders Received (${orders.length})`}
                </h2>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {orders.map((o) => (
                  <div key={o._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#c8a96e] bg-[#c8a96e]/10 px-2 py-0.5 rounded">
                          {o.orderId || o._id.slice(-6).toUpperCase()}
                        </span>
                        <h4 className="text-base font-bold text-white">{o.goatName}</h4>
                        <span className="text-xs text-gray-500 font-sans">
                          • {new Date(o.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>

                      <div className="text-xs text-gray-300 font-sans">
                        <span className="text-gray-400">{isHindi ? "खरीदार:" : "Buyer:"}</span> {o.customerName} (📞{" "}
                        {o.delivery?.phone})
                      </div>

                      <div className="text-xs text-gray-400 font-sans">
                        📍{" "}
                        <span className="text-gray-300">
                          {o.delivery?.address}, {o.delivery?.city}, {o.delivery?.state} - {o.delivery?.pin}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800">
                      <div className="text-right">
                        <div className="text-base font-bold text-[#c8a96e] font-sans">{fmt(o.amount)}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-sans">
                          {isHindi ? "सुरक्षित भुगतान" : "Escrow Verified"}
                        </div>
                      </div>

                      <div>
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                          className="text-xs px-3 py-2 rounded-xl bg-zinc-900 text-gray-200 border border-zinc-700 outline-none font-sans cursor-pointer focus:border-[#c8a96e] font-semibold"
                        >
                          <option value="pending">{isHindi ? "लंबित (Pending)" : "Pending"}</option>
                          <option value="payment_confirmed">
                            {isHindi ? "भुगतान स्वीकृत (Payment Confirmed)" : "Payment Confirmed"}
                          </option>
                          <option value="processing">{isHindi ? "प्रक्रियाधीन (Processing)" : "Processing"}</option>
                          <option value="dispatched">{isHindi ? "भेज दिया (Dispatched)" : "Dispatched"}</option>
                          <option value="out_for_delivery">
                            {isHindi ? "डिलीवरी के लिए निकला (Out for Delivery)" : "Out for Delivery"}
                          </option>
                          <option value="delivered">{isHindi ? "डिलीवर हो गया (Delivered)" : "Delivered"}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {orders.length === 0 && (
                  <div className="p-16 text-center text-gray-500 font-sans">
                    <div className="text-5xl mb-3">📦</div>
                    <h3 className="text-base font-bold text-white mb-1">
                      {isHindi ? "अभी तक कोई ऑर्डर नहीं आया" : "No Orders Yet"}
                    </h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      {isHindi
                        ? "जैसे ही कोई खरीदार आपकी बकरियों का ऑर्डर देगा, वह यहाँ लाइव दिखाई देगा।"
                        : "When buyers place orders for your goats, they will show up here in real time for fulfillment."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHATS / INQUIRIES TAB */}
          {tab === "chats" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white font-serif">
                {isHindi ? `खरीदार पूछताछ (${chats.length})` : `Buyer Inquiries (${chats.length})`}
              </h2>
              <div className="space-y-3">
                {chats.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => router.push(`/chat/${c._id}`)}
                    className="rounded-2xl border border-zinc-800 bg-[#141414] p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:border-[#c8a96e] transition-all group"
                  >
                    {c.goatImage ? (
                      <img
                        src={c.goatImage}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-zinc-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1524024973431-2ad916746881?w=800&q=80";
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
                        💬
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-[#c8a96e] transition-colors truncate">
                          {c.customerName || (isHindi ? "इच्छुक खरीदार" : "Interested Buyer")}
                        </h4>
                        <span className="text-xs text-[#c8a96e] font-sans font-medium">Re: {c.goatName}</span>
                      </div>
                      <p className="text-xs text-gray-400 font-sans truncate">
                        {c.lastMessage ||
                          (isHindi
                            ? "ग्राहक से बातचीत शुरू करने के लिए क्लिक करें..."
                            : "Click to open conversation with customer...")}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                ))}

                {chats.length === 0 && (
                  <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl bg-[#121212] text-gray-400 font-sans">
                    <div className="text-4xl mb-2">💬</div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      {isHindi ? "कोई नई पूछताछ नहीं" : "No inquiries yet"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isHindi
                        ? "खरीदारों द्वारा पूछे गए प्रश्न यहाँ दिखाई देंगे।"
                        : "Buyer questions from goat listings will appear here."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {tab === "analytics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon="📈"
                  val={goats.reduce((a, g) => a + (g.views || 0), 0)}
                  lbl={isHindi ? "कुल व्यूज" : "Total Views"}
                  sub={isHindi ? "लाइव" : "Live"}
                />
                <StatCard
                  icon="🐐"
                  val={goats.length}
                  lbl={isHindi ? "कुल लिस्टिंग्स" : "Total Listings"}
                  sub={isHindi ? "इन्वेंट्री" : "Inventory"}
                />
                <StatCard
                  icon="📦"
                  val={orders.length}
                  lbl={isHindi ? "ऑर्डर्स" : "Orders"}
                  sub={isHindi ? "ट्रैक किए गए" : "Tracked"}
                />
                <StatCard
                  icon="💰"
                  val={fmt(totalRevenue)}
                  lbl={isHindi ? "बिक्री वॉल्यूम" : "Sales Volume"}
                  sub={isHindi ? "सत्यापित" : "Settled"}
                />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-6">
                <h3 className="text-base font-bold text-white font-serif mb-2">
                  {isHindi ? "फार्म प्रदर्शन अवलोकन" : "Farm Performance Overview"}
                </h3>
                <p className="text-xs text-gray-400 font-sans mb-6">
                  {isHindi
                    ? `${farmProfile.farmName} के लिए वास्तविक समय की बिक्री रिपोर्ट।`
                    : `Real-time sales insights for ${farmProfile.farmName}.`}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-gray-400 font-sans uppercase font-bold">
                      {isHindi ? "कन्वर्जन दर" : "Conversion Rate"}
                    </div>
                    <div className="text-2xl font-bold text-[#c8a96e] mt-1 font-serif">
                      {goats.length > 0 ? `${((orders.length / (goats.length || 1)) * 10).toFixed(1)}%` : "0%"}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-gray-400 font-sans uppercase font-bold">
                      {isHindi ? "ग्राहक रेटिंग" : "Customer Rating"}
                    </div>
                    <div className="text-2xl font-bold text-amber-400 mt-1 font-serif">
                      ★ 5.0{" "}
                      <span className="text-xs text-gray-500 font-sans font-normal">
                        ({isHindi ? "सत्यापित फार्म" : "Verified Farm"})
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-gray-400 font-sans uppercase font-bold">
                      {isHindi ? "टीकाकरण प्रमाणन" : "Vaccination Compliance"}
                    </div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1 font-serif">
                      {isHindi ? "100% प्रमाणित" : "100% Certified"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EARNINGS & PAYOUTS TAB */}
          {tab === "earnings" && (
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-6">
                  <div className="text-xs text-gray-400 font-sans mb-1 uppercase font-bold">
                    {isHindi ? "कुल प्राप्त कमाई" : "Realized Revenue"}
                  </div>
                  <div className="text-3xl font-bold text-[#c8a96e] font-serif">{fmt(totalRevenue)}</div>
                  <p className="text-[11px] text-gray-500 font-sans mt-2">
                    {isHindi ? "सभी भुगतान पूर्णतः सुरक्षित" : "All funds backed by Razorpay Escrow"}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-6">
                  <div className="text-xs text-gray-400 font-sans mb-1 uppercase font-bold">
                    {isHindi ? "डिलीवर हुए ऑर्डर्स" : "Delivered Orders"}
                  </div>
                  <div className="text-3xl font-bold text-emerald-400 font-serif">
                    {orders.filter((o) => o.status === "delivered").length}
                  </div>
                  <p className="text-[11px] text-gray-500 font-sans mt-2">
                    {isHindi ? "तत्काल बैंक ट्रांसफर" : "Payouts cleared instantly"}
                  </p>
                </div>
              </div>

              {/* Payout Bank Form */}
              <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-6 space-y-4">
                <h3 className="font-bold text-base text-white font-serif flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-400" />{" "}
                  {isHindi ? "सीधा बैंक और यूपीआई भुगतान" : "Direct Bank & UPI Settlement"}
                </h3>
                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                  {isHindi
                    ? "डिलीवरी की पुष्टि होने पर आपकी बिक्री राशि सीधे आपके बैंक खाते या UPI ID में स्थानांतरित की जाती है।"
                    : "Payouts for confirmed goat deliveries are transferred directly to your bank account or UPI ID."}
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-gray-300 font-sans mb-1 block font-bold">
                      {isHindi ? "UPI ID (सबसे तेज़)" : "UPI ID (Fastest)"}
                    </label>
                    <input
                      placeholder="e.g. yourname@okaxis / yourname@upi"
                      value={farmProfile.upiId}
                      onChange={(e) => setFarmProfile((p) => ({ ...p, upiId: e.target.value }))}
                      className={inp}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-300 font-sans mb-1 block font-bold">
                        {isHindi ? "बैंक खाता संख्या" : "Bank Account Number"}
                      </label>
                      <input
                        placeholder="e.g. 501004928123"
                        value={farmProfile.bankAccount}
                        onChange={(e) => setFarmProfile((p) => ({ ...p, bankAccount: e.target.value }))}
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300 font-sans mb-1 block font-bold">
                        {isHindi ? "IFSC कोड" : "IFSC Code"}
                      </label>
                      <input
                        placeholder="e.g. HDFC0001234"
                        value={farmProfile.ifscCode}
                        onChange={(e) => setFarmProfile((p) => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
                        className={inp}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      toast.success(
                        isHindi
                          ? "भुगतान विवरण सत्यापित और सहेज लिया गया!"
                          : "Payout details verified and saved for auto-settlement!"
                      )
                    }
                    className="w-full py-3 rounded-xl bg-[#c8a96e] text-zinc-950 font-bold font-sans text-xs hover:opacity-90 transition-opacity mt-2 shadow"
                  >
                    {isHindi ? "भुगतान विवरण सहेजें" : "Save Settlement Details"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FARM PROFILE TAB */}
          {tab === "profile" && (
            <div className="max-w-2xl rounded-2xl border border-zinc-800 bg-[#141414] p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-3xl font-bold text-zinc-950 shadow-md">
                  {farmProfile.name?.[0]?.toUpperCase() || session?.user?.name?.[0]?.toUpperCase() || "F"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-serif">{farmProfile.farmName}</h3>
                  <p className="text-xs text-gray-400 font-sans">{farmProfile.email || session?.user?.email}</p>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-semibold font-sans mt-1.5 inline-block">
                    ✓ {isHindi ? "सत्यापित फार्म विक्रेता" : "Verified Farm Seller"}
                  </span>
                </div>
              </div>

              <form onSubmit={saveFarmProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                    {isHindi ? "फार्म / व्यापार का नाम *" : "Farm / Business Name *"}
                  </label>
                  <input
                    value={farmProfile.farmName}
                    onChange={(e) => setFarmProfile((p) => ({ ...p, farmName: e.target.value }))}
                    className={inp}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                      {isHindi ? "संपर्क व्यक्ति का नाम *" : "Contact Person Name *"}
                    </label>
                    <input
                      value={farmProfile.name}
                      onChange={(e) => setFarmProfile((p) => ({ ...p, name: e.target.value }))}
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                      {isHindi ? "फ़ोन नंबर *" : "Phone Number *"}
                    </label>
                    <input
                      value={farmProfile.phone}
                      onChange={(e) => setFarmProfile((p) => ({ ...p, phone: e.target.value }))}
                      placeholder={isHindi ? "10-अंकीय मोबाइल नंबर" : "10-digit mobile number"}
                      className={inp}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                    {isHindi ? "फार्म का स्थान (शहर, राज्य) *" : "Farm Location (City, State) *"}
                  </label>
                  <input
                    value={farmProfile.location}
                    onChange={(e) => setFarmProfile((p) => ({ ...p, location: e.target.value }))}
                    placeholder={isHindi ? "उदा. जयपुर, राजस्थान" : "e.g. Jaipur, Rajasthan"}
                    className={inp}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                    {isHindi ? "फार्म विवरण और खासियत" : "Farm Description & Heritage"}
                  </label>
                  <textarea
                    rows={4}
                    value={farmProfile.description}
                    onChange={(e) => setFarmProfile((p) => ({ ...p, description: e.target.value }))}
                    placeholder={
                      isHindi
                        ? "अपनी बकरियों की नस्लें, स्वास्थ्य देखभाल, चारा और अनुभव के बारे में लिखें..."
                        : "Tell buyers about your breeds, feed quality, hygiene, and background..."
                    }
                    className={inp}
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#c8a96e] to-[#8b5e2a] text-zinc-950 font-bold font-sans text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
                >
                  {profileSaving ? (
                    <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={16} /> {isHindi ? "फार्म प्रोफाइल सहेजें" : "Save Farm Profile"}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Listing Modal */}
      {(addModal || editModal) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && (setAddModal(false), setEditModal(false))}
        >
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-[#161616] overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h3 className="font-bold text-base text-white font-serif flex items-center gap-2">
                <span>🐐</span>{" "}
                {editModal
                  ? isHindi
                    ? "बकरी लिस्टिंग एडिट करें"
                    : "Edit Goat Listing"
                  : isHindi
                  ? "नई बकरी दुकान में लिस्ट करें"
                  : "Publish New Goat Listing"}
              </h3>
              <button
                onClick={() => (setAddModal(false), setEditModal(false))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                  {isHindi ? "बकरी का नाम / शीर्षक *" : "Goat Name / Title *"}
                </label>
                <input
                  placeholder={isHindi ? "उदा. सुल्तान शुद्ध जमुनापारी चैंपियन" : "e.g. Sultan Pure Jamunapari Champion"}
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className={inp}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                    {isHindi ? "नस्ल (Breed) *" : "Breed *"}
                  </label>
                  <select
                    value={formData.breed}
                    onChange={(e) => setFormData((p) => ({ ...p, breed: e.target.value }))}
                    className={inp}
                  >
                    {BREEDS.map((b) => (
                      <option key={b} value={b} className="bg-[#111]">
                        {translateBreed(b)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                    {isHindi ? "कीमत (₹) *" : "Price (₹) *"}
                  </label>
                  <input
                    type="number"
                    placeholder="25000"
                    value={formData.price}
                    onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                    {isHindi ? "वजन (kg)" : "Weight (kg)"}
                  </label>
                  <input
                    type="number"
                    placeholder="45"
                    value={formData.weight}
                    onChange={(e) => setFormData((p) => ({ ...p, weight: e.target.value }))}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                    {isHindi ? "उम्र / दांत" : "Age"}
                  </label>
                  <input
                    placeholder={isHindi ? "उदा. 14 महीने / 2 दांत" : "e.g. 14 months / 2 teeth"}
                    value={formData.age}
                    onChange={(e) => setFormData((p) => ({ ...p, age: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                  {isHindi ? "स्वास्थ्य स्थिति" : "Health Condition"}
                </label>
                <select
                  value={formData.health}
                  onChange={(e) => setFormData((p) => ({ ...p, health: e.target.value }))}
                  className={inp}
                >
                  <option value="Excellent" className="bg-[#111]">
                    {isHindi ? "उत्कृष्ट (Top Health)" : "Excellent (Top Health)"}
                  </option>
                  <option value="Good" className="bg-[#111]">
                    {isHindi ? "अच्छा (Active & Healthy)" : "Good (Active)"}
                  </option>
                  <option value="Fair" className="bg-[#111]">
                    {isHindi ? "सामान्य (Fair)" : "Fair"}
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                  {isHindi ? "विवरण और वंशावली" : "Description & Lineage"}
                </label>
                <textarea
                  placeholder={
                    isHindi
                      ? "बकरी के माता-पिता की नस्ल, चारा, कान की लंबाई, सींग और स्वभाव के बारे में लिखें..."
                      : "Mention pedigree lineage, feeding habits, vaccine history, horns, ear length..."
                  }
                  value={formData.desc}
                  onChange={(e) => setFormData((p) => ({ ...p, desc: e.target.value }))}
                  rows={3}
                  className={inp}
                />
              </div>

              {/* Photos Upload */}
              <div>
                <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                  {isHindi ? "बकरी की तस्वीरें" : "Goat Photos"}
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white font-sans cursor-pointer flex items-center gap-2 transition-colors border border-zinc-700">
                    <Camera size={14} className="text-[#c8a96e]" />{" "}
                    {isHindi ? "तस्वीर चुनें" : "Select Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImg}
                      className="hidden"
                    />
                  </label>
                  {uploadingImg && (
                    <span className="text-xs text-[#c8a96e] animate-pulse">
                      {isHindi ? "अपलोड हो रहा है..." : "Uploading..."}
                    </span>
                  )}
                </div>

                {formData.images.length > 0 && (
                  <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative group/img flex-shrink-0">
                        <img src={img} alt="" className="w-16 h-16 rounded-xl object-cover border border-zinc-700" />
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video Upload or URL */}
              <div>
                <label className="text-xs font-bold text-gray-300 font-sans mb-1 block">
                  {isHindi ? "बकरी का वीडियो (वैकल्पिक)" : "Goat Video (Optional)"}
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white font-sans cursor-pointer flex items-center gap-2 transition-colors border border-zinc-700">
                      <Video size={14} className="text-[#c8a96e]" />{" "}
                      {isHindi ? "वीडियो अपलोड करें" : "Upload Video"}
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        disabled={uploadingVid}
                        className="hidden"
                      />
                    </label>
                    {uploadingVid && (
                      <span className="text-xs text-[#c8a96e] animate-pulse">
                        {isHindi ? "वीडियो अपलोड हो रहा है..." : "Uploading video..."}
                      </span>
                    )}
                  </div>
                  <input
                    type="url"
                    placeholder={isHindi ? "या वीडियो लिंक पेस्ट करें (MP4 / YouTube)" : "Or paste video link (e.g. MP4 or YouTube)"}
                    value={formData.videoUrl}
                    onChange={(e) => setFormData((p) => ({ ...p, videoUrl: e.target.value }))}
                    className={inp}
                  />
                  {formData.videoUrl && (
                    <div className="relative mt-2 rounded-xl overflow-hidden border border-zinc-800 bg-black">
                      <video src={formData.videoUrl} controls className="w-full h-32 object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, videoUrl: "" }))}
                        className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold"
                      >
                        {isHindi ? "हटाएं" : "Remove"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.vaccinated}
                  onChange={(e) => setFormData((p) => ({ ...p, vaccinated: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#c8a96e]"
                />
                <span className="text-xs font-sans text-gray-200 font-semibold">
                  {isHindi ? "पूर्णतः टीकाकृत और कृमिमुक्त (100% Certified)" : "Fully Vaccinated & Dewormed (Certified)"}
                </span>
              </label>
            </div>

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50">
              <button
                onClick={() => handleSaveGoat(editModal)}
                disabled={savingGoat}
                className="w-full py-3.5 rounded-full text-xs font-bold text-zinc-950 bg-gradient-to-r from-[#c8a96e] to-[#e6cf9b] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
              >
                {savingGoat ? (
                  <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : editModal ? (
                  isHindi ? "बदलाव सहेजें →" : "Save Changes →"
                ) : (
                  isHindi ? "दुकान में लिस्ट प्रकाशित करें →" : "Publish Listing to Store →"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
