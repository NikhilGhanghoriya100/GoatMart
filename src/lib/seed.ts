/**
 * Database Seed Script
 * Run: npx ts-node -r tsconfig-paths/register src/lib/seed.ts
 * Or:  npm run seed (after adding "seed": "ts-node src/lib/seed.ts" to package.json)
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

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

  // ─── Create Goats ───
  const goats = await Goat.insertMany([
    { name:"Sultan",   breed:"Jamunapari", weight:48, age:"14 months", price:28000, status:"sale",  health:"Excellent", vaccinated:true,  desc:"Majestic Jamunapari with long drooping ears and outstanding milk genetics. Farm-raised, fully vaccinated.", images:["https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Jamunapari_goat.jpg/400px-Jamunapari_goat.jpg"], seller:seller1._id, sellerName:"Al-Noor Farms", sellerRating:4.8, sellerReviews:24, sellerImg:"https://i.pravatar.cc/80?img=12", sellerLoc:"Lucknow, UP", averageRating:4.5, totalReviews:2, views:142 },
    { name:"Noor",     breed:"Beetal",     weight:42, age:"12 months", price:22000, status:"sale",  health:"Excellent", vaccinated:true,  desc:"Pure Beetal lineage with glossy coat. High meat yield genetics.", images:["https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Beetal_goat.jpg/400px-Beetal_goat.jpg"], seller:seller2._id, sellerName:"Royal Goat House", sellerRating:4.6, sellerReviews:18, sellerImg:"https://i.pravatar.cc/80?img=15", sellerLoc:"Jaipur, RJ", averageRating:5, totalReviews:1, views:98 },
    { name:"Badshah",  breed:"Sirohi",     weight:38, age:"10 months", price:18500, status:"sold",  health:"Good",      vaccinated:true,  desc:"Award-winning Sirohi from Rajasthan. Known for heat tolerance.", images:["https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Goat_at_the_San_Diego_Zoo.jpg/400px-Goat_at_the_San_Diego_Zoo.jpg"], seller:seller1._id, sellerName:"Al-Noor Farms", sellerRating:4.8, sellerReviews:24, sellerImg:"https://i.pravatar.cc/80?img=12", sellerLoc:"Lucknow, UP", views:75 },
    { name:"Rani",     breed:"Barbari",    weight:30, age:"9 months",  price:15000, status:"sale",  health:"Excellent", vaccinated:false, desc:"Compact and prolific Barbari doe with excellent twinning ability.", images:["https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Barbari_Goat.jpg/400px-Barbari_Goat.jpg"], seller:seller3._id, sellerName:"Green Valley", sellerRating:4.3, sellerReviews:9, sellerImg:"https://i.pravatar.cc/80?img=20", sellerLoc:"Pune, MH", views:63 },
    { name:"Arjun",    breed:"Black Bengal",weight:22,age:"8 months",  price:12000, status:"sale",  health:"Good",      vaccinated:true,  desc:"Authentic Black Bengal. High-quality meat and strong disease resistance.", images:["https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Black_Bengal_goat.jpg/400px-Black_Bengal_goat.jpg"], seller:seller2._id, sellerName:"Royal Goat House", sellerRating:4.6, sellerReviews:18, sellerImg:"https://i.pravatar.cc/80?img=15", sellerLoc:"Jaipur, RJ", views:88 },
    { name:"Shaan",    breed:"Osmanabadi", weight:44, age:"15 months", price:24000, status:"sale",  health:"Excellent", vaccinated:true,  desc:"Heavy-bodied Osmanabadi from Maharashtra. Superior meat quality.", images:["https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Osmanabadi_goat.jpg/400px-Osmanabadi_goat.jpg"], seller:seller1._id, sellerName:"Al-Noor Farms", sellerRating:4.8, sellerReviews:24, sellerImg:"https://i.pravatar.cc/80?img=12", sellerLoc:"Lucknow, UP", views:112 },
    { name:"Moti",     breed:"Totapari",   weight:36, age:"11 months", price:19500, status:"sale",  health:"Good",      vaccinated:false, desc:"Totapari crossbreed with outstanding growth rate.", images:["https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Domestic_goat_kid_in_capeweed.jpg/400px-Domestic_goat_kid_in_capeweed.jpg"], seller:seller3._id, sellerName:"Green Valley", sellerRating:4.3, sellerReviews:9, sellerImg:"https://i.pravatar.cc/80?img=20", sellerLoc:"Pune, MH", views:54 },
    { name:"Hira",     breed:"Sojat",      weight:41, age:"13 months", price:21000, status:"sold",  health:"Excellent", vaccinated:true,  desc:"Championship-winning Sojat with impressive frame.", images:["https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Goat_on_Sapa_trek.jpg/400px-Goat_on_Sapa_trek.jpg"], seller:seller2._id, sellerName:"Royal Goat House", sellerRating:4.6, sellerReviews:18, sellerImg:"https://i.pravatar.cc/80?img=15", sellerLoc:"Jaipur, RJ", views:79 },
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
