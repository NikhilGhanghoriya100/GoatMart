import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SellerDashboard from "@/components/seller/SellerDashboard";
import SellerPendingApproval from "@/components/seller/SellerPendingApproval";

export default async function SellerPage() {
  const session = await getSession();
  if (!session || !["seller", "admin"].includes(session.user.role)) {
    redirect("/login");
  }

  // If user is a seller, check their live approval status directly from MongoDB
  if (session.user.role === "seller") {
    await connectDB();
    const dbUser = await User.findById(session.user.id)
      .select("sellerProfile role name email phone createdAt")
      .lean();

    const status = dbUser?.sellerProfile?.status || "pending";

    if (status !== "approved") {
      return (
        <SellerPendingApproval
          user={{
            name: dbUser?.name || session.user.name,
            email: dbUser?.email || session.user.email,
            phone: dbUser?.phone || "",
            farmName: dbUser?.sellerProfile?.farmName || `${session.user.name}'s Farm`,
            status: status as "pending" | "suspended",
            joinedAt: dbUser?.sellerProfile?.joinedAt || dbUser?.createdAt || new Date(),
          }}
        />
      );
    }
  }

  return <SellerDashboard />;
}
