import HeroBanner from "@/components/HeroBanner";
import CategoryStrip from "@/components/CategoryStrip";
import GoatGrid from "@/components/GoatGrid";
import {
  BreedExplorerHeader,
  FeaturedGoatsHeader,
  ViewAllGoatsCTA,
} from "@/components/home/HomeSections";
import type { Goat } from "@/types";

// ─── Fetch real goats directly from MongoDB (For Sale only, up to 20) ─────
async function getFeaturedGoats(): Promise<Goat[]> {
  try {
    const { default: connectDB } = await import("@/lib/db");
    const { default: GoatModel } = await import("@/models/Goat");

    await connectDB();

    // Fetch up to 20 goats that are FOR SALE (exclude sold out)
    const goats = await GoatModel.find({
      status: { $nin: ["sold", "Sold", "SOLD"] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
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
    <div className="w-full max-w-full overflow-x-hidden space-y-8 sm:space-y-12 pb-14">
      {/* 1. Hero Carousel Banner */}
      <HeroBanner />

      {/* 2. Popular Breeds Strip */}
      <section className="max-w-[1280px] mx-auto px-3 sm:px-6">
        <BreedExplorerHeader />
        <CategoryStrip />
      </section>

      {/* 3. Featured Goats Grid (20 Goats for sale + View All Goats Button) */}
      <section className="max-w-[1280px] mx-auto px-3 sm:px-6">
        <FeaturedGoatsHeader count={featuredGoats.length} />
        <GoatGrid goats={featuredGoats} />
        <ViewAllGoatsCTA />
      </section>
    </div>
  );
}
