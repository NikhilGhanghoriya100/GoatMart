import HeroBanner from "@/components/HeroBanner";
import CategoryStrip from "@/components/CategoryStrip";
import GoatGrid from "@/components/GoatGrid";
import WhySection from "@/components/WhySection";
import StatsStrip from "@/components/StatsStrip";
import SellerCTA from "@/components/SellerCTA";
import {
  BreedExplorerHeader,
  FeaturedGoatsHeader,
  HowBuyingWorks,
} from "@/components/home/HomeSections";
import type { Goat } from "@/types";

// ─── Fetch real goats directly from MongoDB (No mock/fake data) ───────────
async function getFeaturedGoats(): Promise<Goat[]> {
  try {
    const { default: connectDB } = await import("@/lib/db");
    const { default: GoatModel } = await import("@/models/Goat");

    await connectDB();

    // Fetch all real goats from DB
    const goats = await GoatModel.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    if (goats && goats.length > 0) {
      return JSON.parse(JSON.stringify(goats));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch featured goats from DB:", error);
    return [];
  }
}

export default async function HomePage() {
  const featuredGoats = await getFeaturedGoats();

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-10 sm:space-y-16 pb-12">
      {/* 1. Hero Section */}
      <HeroBanner />

      {/* 2. Breed Explorer Strip */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <BreedExplorerHeader />
        <CategoryStrip />
      </section>

      {/* 3. Featured Championship Livestock Grid */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <FeaturedGoatsHeader count={featuredGoats.length} />
        <GoatGrid goats={featuredGoats} />
      </section>

      {/* 4. Live Trust & Escrow Stats Strip */}
      <StatsStrip />

      {/* 5. How Buying on GoatMart Works */}
      <HowBuyingWorks />

      {/* 6. Why Buyers Choose GoatMart */}
      <WhySection />

      {/* 7. Seller CTA Banner */}
      <SellerCTA />
    </div>
  );
}
