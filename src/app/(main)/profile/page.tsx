"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ArrowLeft, Edit2, Save, X, Package, Heart, Star, LogOut, KeyRound, Shield, Camera, Loader2 } from "lucide-react";
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
  const [avatar, setAvatar] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", state: "", pin: "" });

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdLoading, setPwdLoading] = useState(false);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const inp =
    "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-[#c8a96e] bg-[#faf8f4] transition-colors";

  useEffect(() => {
    if (session?.user) {
      if (session.user.avatar) setAvatar(session.user.avatar);
      setForm((p) => ({
        ...p,
        name: session.user.name || p.name,
      }));
      axios
        .get("/api/user/profile")
        .then(({ data }) => {
          if (data.success) {
            const u = data.data;
            if (u.avatar) setAvatar(u.avatar);
            setForm({
              name: u.name || session.user.name || "",
              phone: u.phone || "",
              address: u.address?.street || "",
              city: u.address?.city || "",
              state: u.address?.state || "",
              pin: u.address?.pin || "",
            });
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "image");
    fd.append("purpose", "avatar");

    try {
      const { data } = await axios.post("/api/upload", fd);
      if (data.success && data.data?.url) {
        const newAvatarUrl = data.data.url;
        setAvatar(newAvatarUrl);
        // Save to profile
        await axios.patch("/api/user/profile", { avatar: newAvatarUrl });
        await update({ avatar: newAvatarUrl });
        toast.success("Profile photo updated!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to upload photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    try {
      const { data } = await axios.patch("/api/user/profile", {
        name: form.name,
        phone: form.phone,
        avatar: avatar || undefined,
        address: { street: form.address, city: form.city, state: form.state, pin: form.pin },
      });
      if (data.success) {
        toast.success("Profile updated successfully!");
        setEditMode(false);
        await update({ name: form.name, avatar });
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setPwdLoading(true);
    try {
      const { data } = await axios.post("/api/user/password", {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      if (data.success) {
        toast.success("Password changed successfully!");
        setShowPasswordModal(false);
        setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update password");
    } finally {
      setPwdLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold font-serif mb-2">Login to view profile</h2>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm shadow"
        >
          Login →
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-7 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="flex-1 text-center text-xl font-bold font-serif">My Account</h1>
        <button
          onClick={() => (editMode ? save() : setEditMode(true))}
          disabled={loading}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
            editMode
              ? "border-[#c8a96e] bg-[#c8a96e10] text-[#c8a96e]"
              : "border-gray-200 bg-white text-gray-500 hover:border-[#c8a96e]"
          }`}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
          ) : editMode ? (
            <Save size={15} />
          ) : (
            <Edit2 size={15} />
          )}
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-[#fdf6e8] to-white rounded-3xl border border-gray-100 p-6 text-center mb-5 shadow-sm">
        <div className="relative inline-block mb-3">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-3xl text-white font-bold shadow-md relative border-2 border-white">
            {avatar ? (
              <img
                src={avatar}
                alt={session.user.name || "User"}
                className="w-full h-full object-cover"
                onError={() => setAvatar("")}
              />
            ) : (
              <span>{session.user.name?.[0]?.toUpperCase() || "U"}</span>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                <Loader2 size={24} className="animate-spin text-[#c8a96e]" />
              </div>
            )}
          </div>

          {/* Camera upload button */}
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all border-2 border-white">
            <Camera size={14} />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={avatarUploading}
              className="hidden"
            />
          </label>
        </div>
        <h2 className="text-xl font-bold font-serif text-gray-800">{session.user.name}</h2>
        <p className="text-sm text-gray-400 font-sans">{session.user.email}</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#c8a96e22] text-[#8b5e2a] text-xs font-semibold font-sans">
            {session.user.role === "admin" ? "🛡️ Administrator" : session.user.role === "seller" ? "🏪 Verified Seller" : "🛒 Customer"}
          </span>
          {session.user.role === "admin" && (
            <Link href="/admin" className="text-xs px-3 py-1 rounded-full bg-black text-[#c8a96e] font-sans font-bold hover:opacity-90">
              Admin Panel →
            </Link>
          )}
          {session.user.role === "seller" && (
            <Link href="/seller" className="text-xs px-3 py-1 rounded-full bg-[#8b5e2a] text-white font-sans font-bold hover:opacity-90">
              Seller Dashboard →
            </Link>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          [Package, "Orders", orders.length, "/orders"],
          [Heart, "Saved", wishlist.length, "/wishlist"],
          [Star, "Reviews", "Active", null],
        ].map(([Icon, label, val, link]: any) => (
          <div
            key={label}
            onClick={() => link && (window.location.href = link)}
            className={`bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm ${link ? "cursor-pointer hover:border-[#c8a96e] transition-colors" : ""}`}
          >
            <Icon size={20} className="text-[#c8a96e] mx-auto mb-1.5" />
            <div className="text-xl font-bold text-[#c8a96e]">{val}</div>
            <div className="text-xs text-gray-400 font-sans">{label}</div>
          </div>
        ))}
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold font-serif">Personal Information</h3>
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="text-xs text-[#c8a96e] font-sans font-bold flex items-center gap-1">
              <Edit2 size={12} /> Edit
            </button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 font-sans mb-1 block">Full Name</label>
              <input value={form.name} onChange={f("name")} className={inp} />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-sans mb-1 block">Phone Number</label>
              <input value={form.phone} onChange={f("phone")} placeholder="10-digit mobile number" className={inp} />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-sans mb-1 block">Street Address</label>
              <input value={form.address} onChange={f("address")} placeholder="House/Flat, Street" className={inp} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 font-sans mb-1 block">City</label>
                <input value={form.city} onChange={f("city")} className={inp} />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-sans mb-1 block">State</label>
                <input value={form.state} onChange={f("state")} className={inp} />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-sans mb-1 block">PIN</label>
                <input value={form.pin} onChange={f("pin")} className={inp} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditMode(false)}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm text-gray-500 font-sans hover:border-gray-300 flex items-center justify-center gap-1.5"
              >
                <X size={13} /> Cancel
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="flex-[2] py-2.5 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white text-sm font-bold font-sans hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1.5 shadow"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={13} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {[
              ["👤", "Name", session.user.name || "—"],
              ["📧", "Email", session.user.email || "—"],
              ["📱", "Phone", form.phone || "Not set"],
              [
                "📍",
                "Address",
                form.address
                  ? `${form.address}, ${form.city}, ${form.state} - ${form.pin}`
                  : "Not set (Add address for faster checkout)",
              ],
            ].map(([ic, l, v]) => (
              <div key={l as string} className="flex gap-3 py-3">
                <span className="text-lg flex-shrink-0">{ic}</span>
                <div>
                  <div className="text-xs text-gray-400 font-sans">{l as string}</div>
                  <div
                    className={`text-sm font-semibold mt-0.5 ${
                      v.startsWith("Not set") ? "text-gray-400 font-normal italic" : "text-gray-800"
                    }`}
                  >
                    {v as string}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Security Box */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
        <h3 className="text-base font-bold font-serif mb-3 flex items-center gap-2">
          <Shield size={16} className="text-[#c8a96e]" /> Account Security
        </h3>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 hover:border-[#c8a96e] hover:bg-[#faf6ee] font-sans text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <KeyRound size={15} /> Change Password
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full py-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-500 font-bold font-sans text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
      >
        <LogOut size={15} /> Logout
      </button>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowPasswordModal(false)}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 animate-scaleUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg font-serif">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-sans mb-1 block">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-sans mb-1 block">New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className={inp}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-sans mb-1 block">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className={inp}
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="w-full py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90 disabled:opacity-60 shadow"
                >
                  {pwdLoading ? "Updating Password..." : "Update Password →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
