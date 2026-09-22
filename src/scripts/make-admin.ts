// Run: npx ts-node -r tsconfig-paths/register src/scripts/make-admin.ts
// Pehle ADMIN_EMAIL mein apna email daalo

import mongoose from "mongoose";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ADMIN_EMAIL = "YOUR_EMAIL_HERE"; // <-- Apna email yahan daalo

async function makeAdmin() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const result = await mongoose
    .connection!.db!.collection("users")
    .findOneAndUpdate(
      { email: ADMIN_EMAIL.toLowerCase() },
      { $set: { role: "admin" } },
      { returnDocument: "after" }
    );

  if (result) {
    console.log(`✅ Role set to admin for: ${result.email} (was: ${result.role})`);
  } else {
    console.log(`❌ User not found: ${ADMIN_EMAIL}`);
    
    // List all users
    const users = await mongoose.connection!.db!.collection("users").find({}, { projection: { email: 1, role: 1, name: 1 } }).toArray();
    console.log("\nExisting users:");
    users.forEach(u => console.log(`  ${u.email} - role: ${u.role} - name: ${u.name}`));
  }

  await mongoose.disconnect();
}

makeAdmin().catch(console.error);
