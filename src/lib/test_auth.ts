
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
// Now import database connection and User model after dotenv has loaded the environment variables
import connectDB from "./db";
import User from "../models/User";
async function run() {
  try {
    console.log("Connecting to DB...");
    await connectDB();
    console.log("Connected. Finding user rahul@gmail.com...");
    const user = await User.findOne({ email: "rahul@gmail.com" }).select("+password");
    if (!user) {
      console.log("❌ User not found!");
      process.exit(1);
    }
    console.log("User found. Comparing password 'customer123'...");
    const isValid = await user.comparePassword("customer123");
    if (isValid) {
      console.log("✅ Password is valid! Authentication mock success.");
    } else {
      console.log("❌ Invalid password!");
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  } finally {
    process.exit(0);
  }
}
run();

