/**
 * GoatMart Maintenance Script: Release Legacy Reserved Goats
 * 
 * Safe, idempotent cleanup script for goats stranded in "reserved" status
 * due to pre-fix checkout flow where checkout created pending/unpaid reservations.
 * 
 * Usage:
 *   Dry run (default or with --dry-run):
 *     $env:TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}'; npx ts-node -r tsconfig-paths/register src/scripts/cleanup-legacy-reservations.ts --dry-run
 * 
 *   Live execution (--execute):
 *     $env:TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}'; npx ts-node -r tsconfig-paths/register src/scripts/cleanup-legacy-reservations.ts --execute
 */

import dns from "dns";
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {
  // Ignore DNS config restriction
}

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import Goat from "../models/Goat";
import Order from "../models/Order";

interface CleanupReportItem {
  goatId: string;
  goatName: string;
  breed: string;
  price: number;
  currentStatus: string;
  currentOrderId: string | null;
  associatedOrderNumber?: string;
  orderStatus?: string;
  paymentStatus?: string;
  action: "RELEASED" | "WOULD_RELEASE" | "SKIPPED_PAID_ORDER" | "SKIPPED_NOT_RESERVED";
  reason: string;
}

async function runCleanup() {
  const isExecute = process.argv.includes("--execute");
  const isDryRun = !isExecute || process.argv.includes("--dry-run");

  console.log("==================================================================");
  console.log("GoatMart: Legacy Reservation Cleanup Maintenance Script");
  console.log(`MODE: ${isDryRun ? "🔍 DRY-RUN (No changes will be written)" : "⚡ LIVE EXECUTION (Database will be updated)"}`);
  console.log("==================================================================\n");

  await connectDB();
  console.log(" Connected to MongoDB.\n");

  // Query all goats currently marked as "reserved"
  const reservedGoats = await Goat.find({ status: "reserved" });
  console.log(`Found ${reservedGoats.length} goat(s) with status = "reserved".\n`);

  const report: CleanupReportItem[] = [];
  let releasedCount = 0;
  let skippedCount = 0;

  for (const goat of reservedGoats) {
    const goatId = goat._id.toString();
    const item: CleanupReportItem = {
      goatId,
      goatName: goat.name,
      breed: goat.breed,
      price: goat.price,
      currentStatus: goat.status,
      currentOrderId: goat.currentOrderId ? goat.currentOrderId.toString() : null,
      action: "WOULD_RELEASE",
      reason: "",
    };

    let associatedOrder = null;
    if (goat.currentOrderId) {
      associatedOrder = await Order.findById(goat.currentOrderId);
    }

    if (associatedOrder) {
      item.associatedOrderNumber = associatedOrder.orderId;
      item.orderStatus = associatedOrder.status;
      item.paymentStatus = associatedOrder.payment?.status;

      const isPaid = associatedOrder.payment?.status === "paid" || associatedOrder.status === "payment_confirmed";
      if (isPaid) {
        item.action = "SKIPPED_PAID_ORDER";
        item.reason = `Associated order ${associatedOrder.orderId} is paid (${associatedOrder.payment?.status}) with status "${associatedOrder.status}". Must NOT release.`;
        skippedCount++;
        report.push(item);
        continue;
      } else {
        item.reason = `Associated order ${associatedOrder.orderId} is unpaid (${associatedOrder.payment?.status ?? "none"}) with status "${associatedOrder.status}". Safe to release.`;
      }
    } else if (goat.currentOrderId) {
      item.reason = `Referenced order ${goat.currentOrderId.toString()} does not exist. Safe to release orphaned reference.`;
    } else {
      item.reason = "Goat has status 'reserved' with no currentOrderId assigned. Safe to release.";
    }

    if (isDryRun) {
      item.action = "WOULD_RELEASE";
      releasedCount++;
    } else {
      // Atomic update: only update if still reserved
      const updateResult = await Goat.updateOne(
        { _id: goat._id, status: "reserved" },
        { $set: { status: "sale", currentOrderId: null } }
      );

      if (updateResult.modifiedCount > 0) {
        item.action = "RELEASED";
        releasedCount++;
      } else {
        item.action = "SKIPPED_NOT_RESERVED";
        item.reason = "Goat was concurrently modified or no longer in reserved state.";
        skippedCount++;
      }
    }

    report.push(item);
  }

  // Print Detailed Report
  console.log("------------------------------------------------------------------");
  console.log("DETAILED INSPECTION & ACTIONS REPORT");
  console.log("------------------------------------------------------------------");
  for (const item of report) {
    console.log(`Goat ID:        ${item.goatId}`);
    console.log(`Name / Breed:   ${item.goatName} (${item.breed}) - ₹${item.price}`);
    console.log(`Status Before:  ${item.currentStatus}`);
    console.log(`Current Order:  ${item.currentOrderId ?? "None"}`);
    if (item.associatedOrderNumber) {
      console.log(`Order Details:  Order ${item.associatedOrderNumber} | Status: ${item.orderStatus} | Payment: ${item.paymentStatus}`);
    }
    console.log(`Action:         ${item.action}`);
    console.log(`Reason:         ${item.reason}`);
    console.log("------------------------------------------------------------------");
  }

  console.log("\n==================================================================");
  console.log("CLEANUP SUMMARY");
  console.log("==================================================================");
  console.log(`Total Reserved Goats Found:     ${reservedGoats.length}`);
  console.log(`${isDryRun ? "Would Release to 'sale':" : "Successfully Released to 'sale':"} ${releasedCount}`);
  console.log(`Skipped (Unsafe / Concurrently modified): ${skippedCount}`);
  console.log("==================================================================\n");

  await mongoose.disconnect();
  console.log(" MongoDB disconnected cleanly.");
}

runCleanup().catch((err) => {
  console.error("Cleanup script error:", err);
  process.exit(1);
});
