import type { Goat } from "@/types";

// Static seed data has been removed for live production database mode
export const REAL_CHAMPION_GOATS: Array<Omit<Goat, "_id"> & { _id: string }> = [];
