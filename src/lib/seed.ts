/**
 * Database Seed Script
 * Run: npx ts-node -r tsconfig-paths/register src/lib/seed.ts
 * Or:  npm run seed (after adding "seed": "ts-node src/lib/seed.ts" to package.json)
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import dns from "dns";

try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {
  // Ignore if unsupported
}

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI!;

// ─── Schemas (inline for seed) ─────────────────────────
const UserSchema = new mongoose.Schema({ name:String, email:{ type:String, unique:true }, password:String, phone:String, role:{ type:String, default:"customer" }, sellerProfile:Object, wishlist:[], isEmailVerified:{ type:Boolean, default:false } }, { timestamps:true });
const GoatSchema  = new mongoose.Schema({ name:String, breed:String, weight:Number, age:String, price:Number, status:{ type:String, default:"sale" }, health:String, vaccinated:Boolean, desc:String, images:[String], videoUrl:String, seller:mongoose.Types.ObjectId, sellerName:String, sellerRating:Number, sellerReviews:Number, sellerImg:String, sellerLoc:String, reviews:[], averageRating:{ type:Number, default:0 }, totalReviews:{ type:Number, default:0 }, views:{ type:Number, default:0 }, wishlistCount:{ type:Number, default:0 } }, { timestamps:true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Goat = mongoose.models.Goat || mongoose.model("Goat", GoatSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // Clear existing
  await Promise.all([User.deleteMany({}), Goat.deleteMany({})]);
  console.log("🗑️  Cleared existing data");

  // ─── Create Admin ───
  const adminPass = await bcrypt.hash("BKR@2026#Admin", 12);
  const admin = await User.create({ name:"Bakrawale Admin", email:"admin@bakrawale.com", password:adminPass, role:"admin", isEmailVerified:true });
  console.log("🛡️  Admin created:", admin.email);

  // ─── Create Sellers ───
  const sellerPass = await bcrypt.hash("seller123", 12);
  const seller1 = await User.create({ name:"Mohammed Al-Noor", email:"alnoor@farms.com", password:sellerPass, phone:"9876543210", role:"seller", sellerProfile:{ farmName:"Al-Noor Farms", description:"Premium goat farm in Lucknow", location:"Lucknow, UP", status:"approved", rating:4.8, totalReviews:24, totalSales:12, joinedAt:new Date() }, isEmailVerified:true });
  const seller2 = await User.create({ name:"Rajesh Sharma", email:"rajesh@royal.com", password:sellerPass, phone:"9865432109", role:"seller", sellerProfile:{ farmName:"Royal Goat House", description:"Quality Beetal and Sojat goats", location:"Jaipur, RJ", status:"approved", rating:4.6, totalReviews:18, totalSales:8, joinedAt:new Date() }, isEmailVerified:true });
  const seller3 = await User.create({ name:"Priya Patel", email:"priya@green.com", password:sellerPass, phone:"9854321098", role:"seller", sellerProfile:{ farmName:"Green Valley", description:"Organic farm with Barbari and Totapari", location:"Pune, MH", status:"pending", rating:0, totalReviews:0, totalSales:0, joinedAt:new Date() }, isEmailVerified:true });
  console.log("🏪 Sellers created:", seller1.email, seller2.email, seller3.email);

  // ─── Create Customers ───
  const custPass = await bcrypt.hash("customer123", 12);
  const customers = await User.insertMany([
    { name:"Rahul Sharma", email:"rahul@gmail.com", password:custPass, phone:"9876543210", role:"customer", isEmailVerified:true },
    { name:"Amit Patel",   email:"amit@gmail.com",  password:custPass, phone:"9865432109", role:"customer", isEmailVerified:true },
    { name:"Priya Singh",  email:"priya@gmail.com", password:custPass, phone:"9854321098", role:"customer", isEmailVerified:true },
  ]);
  console.log("👥 Customers created:", customers.length);

  // ─── Create Goats with Real Indian Champion Breed Photography & Video Inspection ───
  const goats = await Goat.insertMany([
    {
      name: "Sultan",
      breed: "Jamunapari",
      weight: 62,
      age: "18 months (2 teeth)",
      price: 48000,
      status: "sale",
      health: "Excellent",
      vaccinated: true,
      tag: "#GM-JAM-9901",
      desc: "Championship-grade Jamunapari buck with distinctive Roman convex nose, 14-inch royal drooping ears, and immaculate cream-white coat. Direct lineage from Etawah champion bloodline.",
      images: [
        "https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1200&q=80",
      ],
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-goats-in-a-field-grazing-42171-large.mp4",
      seller: seller1._id,
      sellerName: "Al-Noor Farms",
      sellerRating: 4.9,
      sellerReviews: 28,
      sellerImg: "https://i.pravatar.cc/80?img=12",
      sellerLoc: "Lucknow, UP",
      averageRating: 4.9,
      totalReviews: 8,
      views: 342,
      wishlistCount: 24,
    },
    {
      name: "Sheru",
      breed: "Beetal",
      weight: 58,
      age: "16 months (2 teeth)",
      price: 42000,
      status: "sale",
      health: "Excellent",
      vaccinated: true,
      tag: "#GM-BTL-8822",
      desc: "Gigantic Amritsari Beetal buck with spiral backward horns and deep chocolate glossy coat. Ideal for elite breeding and heavy weight gain.",
      images: [
        "https://images.unsplash.com/photo-1535083783855-76ae62b2914e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1200&q=80",
      ],
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-flock-of-sheep-and-goats-walking-in-the-field-42170-large.mp4",
      seller: seller2._id,
      sellerName: "Royal Goat House",
      sellerRating: 4.8,
      sellerReviews: 22,
      sellerImg: "https://i.pravatar.cc/80?img=15",
      sellerLoc: "Jaipur, RJ",
      averageRating: 5.0,
      totalReviews: 5,
      views: 290,
      wishlistCount: 19,
    },
    {
      name: "Rana",
      breed: "Sirohi",
      weight: 46,
      age: "14 months",
      price: 28500,
      status: "sale",
      health: "Excellent",
      vaccinated: true,
      tag: "#GM-SRH-7734",
      desc: "Spotted brown compact Sirohi buck with remarkable heat tolerance and rapid weight gain genetics. Certified disease-free by licensed veterinary doctor.",
      images: [
        "https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?auto=format&fit=crop&w=1200&q=80",
      ],
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-goat-grazing-in-a-meadow-42168-large.mp4",
      seller: seller1._id,
      sellerName: "Al-Noor Farms",
      sellerRating: 4.9,
      sellerReviews: 28,
      sellerImg: "https://i.pravatar.cc/80?img=12",
      sellerLoc: "Lucknow, UP",
      averageRating: 4.8,
      totalReviews: 4,
      views: 215,
      wishlistCount: 14,
    },
    {
      name: "Gulab",
      breed: "Sojat",
      weight: 54,
      age: "15 months (2 teeth)",
      price: 38000,
      status: "sale",
      health: "Excellent",
      vaccinated: true,
      tag: "#GM-SJT-6645",
      desc: "Pristine snow-white Sojat buck with pink nose and soft long ears. Outstanding frame and show-quality symmetry.",
      images: [
        "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=1200&q=80",
      ],
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-little-white-goat-eating-grass-42169-large.mp4",
      seller: seller2._id,
      sellerName: "Royal Goat House",
      sellerRating: 4.8,
      sellerReviews: 22,
      sellerImg: "https://i.pravatar.cc/80?img=15",
      sellerLoc: "Jaipur, RJ",
      averageRating: 5.0,
      totalReviews: 6,
      views: 310,
      wishlistCount: 29,
    },
    {
      name: "Chhotu",
      breed: "Barbari",
      weight: 32,
      age: "10 months",
      price: 18500,
      status: "sale",
      health: "Excellent",
      vaccinated: true,
      tag: "#GM-BRB-5561",
      desc: "High-fertility spotted Barbari with erect ears. Best suited for stall-fed commercial goat farming and quick reproduction.",
      images: [
        "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1517451330947-7809dead78d5?auto=format&fit=crop&w=1200&q=80",
      ],
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-goats-in-a-field-grazing-42171-large.mp4",
      seller: seller3._id,
      sellerName: "Green Valley",
      sellerRating: 4.6,
      sellerReviews: 12,
      sellerImg: "https://i.pravatar.cc/80?img=20",
      sellerLoc: "Pune, MH",
      averageRating: 4.7,
      totalReviews: 3,
      views: 180,
      wishlistCount: 11,
    },
    {
      name: "Kala Sona",
      breed: "Black Bengal",
      weight: 26,
      age: "11 months",
      price: 14500,
      status: "sale",
      health: "Good",
      vaccinated: true,
      tag: "#GM-BGL-4472",
      desc: "Pure Black Bengal with unmatched disease resistance and succulent meat quality. High prolificacy and adaptable to any climate.",
      images: [
        "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1200&q=80",
      ],
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-goat-grazing-in-a-meadow-42168-large.mp4",
      seller: seller2._id,
      sellerName: "Royal Goat House",
      sellerRating: 4.8,
      sellerReviews: 22,
      sellerImg: "https://i.pravatar.cc/80?img=15",
      sellerLoc: "Jaipur, RJ",
      averageRating: 4.6,
      totalReviews: 2,
      views: 165,
      wishlistCount: 9,
    },
    {
      name: "Bahubali",
      breed: "Osmanabadi",
      weight: 49,
      age: "14 months",
      price: 27000,
      status: "sale",
      health: "Excellent",
      vaccinated: true,
      tag: "#GM-OSM-3383",
      desc: "Hardy all-black Osmanabadi buck with long legs and muscular build. Adapted to rough weather and arid grazing with low maintenance.",
      images: [
        "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=1200&q=80",
      ],
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-flock-of-sheep-and-goats-walking-in-the-field-42170-large.mp4",
      seller: seller1._id,
      sellerName: "Al-Noor Farms",
      sellerRating: 4.9,
      sellerReviews: 28,
      sellerImg: "https://i.pravatar.cc/80?img=12",
      sellerLoc: "Lucknow, UP",
      averageRating: 4.9,
      totalReviews: 4,
      views: 240,
      wishlistCount: 16,
    },
    {
      name: "Tota",
      breed: "Totapari",
      weight: 44,
      age: "13 months",
      price: 25000,
      status: "sale",
      health: "Excellent",
      vaccinated: true,
      tag: "#GM-TOT-2294",
      desc: "Totapari cross with pronounced parrot-beak facial bone structure. High daily weight gain, docile temperament, and verified bloodline.",
      images: [
        "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1200&q=80",
      ],
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-little-white-goat-eating-grass-42169-large.mp4",
      seller: seller3._id,
      sellerName: "Green Valley",
      sellerRating: 4.6,
      sellerReviews: 12,
      sellerImg: "https://i.pravatar.cc/80?img=20",
      sellerLoc: "Pune, MH",
      averageRating: 4.8,
      totalReviews: 3,
      views: 195,
      wishlistCount: 12,
    },
  ]);
  console.log("🐐 Goats created:", goats.length);

  console.log("\n✅ Seed complete!\n");
  console.log("═══════════════════════════════");
  console.log("🔐 Login Credentials:");
  console.log("─────────────────────");
  console.log("Admin:    admin@bakrawale.com  /  BKR@2026#Admin");
  console.log("Seller 1: alnoor@farms.com     /  seller123");
  console.log("Seller 2: rajesh@royal.com     /  seller123");
  console.log("Customer: rahul@gmail.com      /  customer123");
  console.log("═══════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error("❌ Seed failed:", err); process.exit(1); });
