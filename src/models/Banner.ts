import mongoose, { Schema, models, model } from "mongoose";

export interface IBanner {
  slideIndex: 0 | 1 | 2;
  imageUrl: string;
  isActive: boolean;
}

const BannerSchema = new Schema<IBanner>(
  {
    slideIndex: {
      type: Number,
      required: true,
      enum: [0, 1, 2],
      unique: true,
    },
    imageUrl: {
      type: String,
      required: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default models.Banner || model<IBanner>("Banner", BannerSchema);
