import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGoat extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  breed: string;
  weight: number;
  age: string;
  price: number;
  status: "sale" | "sold" | "reserved" | string;
  health: string;
  vaccinated: boolean;
  tag?: string;
  desc: string;
  images: string[];
  videoUrl?: string;
  seller: mongoose.Types.ObjectId | string;
  sellerName: string;
  sellerRating: number;
  sellerReviews: number;
  sellerImg: string;
  sellerLoc: string;
  reviews: {
    user: mongoose.Types.ObjectId;
    userName: string;
    userAvatar: string;
    rating: number;
    text: string;
    createdAt: Date;
  }[];
  averageRating: number;
  totalReviews: number;
  views: number;
  wishlistCount: number;
  currentOrderId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GoatSchema = new Schema<IGoat>(
  {
    name: { type: String, required: true, trim: true },
    breed: { type: String, required: true, trim: true },
    weight: { type: Number, required: true },
    age: { type: String, required: true },
    price: { type: Number, required: true },
    status: { type: String, default: "sale" },
    currentOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    health: { type: String, default: "Good" },
    vaccinated: { type: Boolean, default: false },
    tag: { type: String },
    desc: { type: String, default: "" },
    images: [{ type: String }],
    videoUrl: { type: String },
    seller: { type: Schema.Types.Mixed, required: true },
    sellerName: { type: String, default: "Farm Seller" },
    sellerRating: { type: Number, default: 5 },
    sellerReviews: { type: Number, default: 0 },
    sellerImg: { type: String, default: "" },
    sellerLoc: { type: String, default: "" },
    reviews: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        userName: String,
        userAvatar: String,
        rating: { type: Number, min: 1, max: 5 },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, default: 5 },
    totalReviews: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

GoatSchema.index({ breed: 1, status: 1 });
GoatSchema.index({ seller: 1 });
GoatSchema.index({ price: 1 });
GoatSchema.index({ name: "text", breed: "text", desc: "text" });

const Goat: Model<IGoat> =
  mongoose.models.Goat || mongoose.model<IGoat>("Goat", GoatSchema);
export default Goat;
