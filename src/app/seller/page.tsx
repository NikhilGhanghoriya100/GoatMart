import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SellerDashboard from "@/components/seller/SellerDashboard";

export default async function SellerPage() {
  const session = await getSession();
  if (!session || !["seller","admin"].includes(session.user.role)) redirect("/login");
  if (session.user.sellerStatus === "pending") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="bg-[#1a1a1a] rounded-3xl border border-[#252525] p-10 text-center max-w-md">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-xl font-bold text-[#ddd] mb-2 font-serif">Application Under Review</h1>
          <p className="text-sm text-[#666] font-sans leading-relaxed">
            Your seller application is being reviewed by our team. You will be notified within 24-48 hours once approved.
          </p>
          <a href="/" className="inline-block mt-6 px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm">
            Back to Home
          </a>
        </div>
      </div>
    );
  }
  return <SellerDashboard />;
}
