import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: "customer" | "seller" | "admin";
  avatar?: string;
  firebaseUid?: string;
  authProvider?: "credentials" | "google";
  address?: {
    street: string;
    city: string;
    state: string;
    pin: string;
  };
  sellerProfile?: {
    farmName: string;
    description: string;
    location: string;
    status: "pending" | "approved" | "suspended";
    rating: number;
    totalReviews: number;
    totalSales: number;
    joinedAt: Date;
  };
  wishlist: mongoose.Types.ObjectId[];
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 150 },
    password: { type: String, required: false, minlength: 6, select: false },
    phone: { type: String, trim: true, maxlength: 20 },
    role: { type: String, enum: ["customer", "seller", "admin"], default: "customer" },
    avatar: { type: String, default: "" },
    firebaseUid: { type: String, default: "" },
    authProvider: { type: String, enum: ["credentials", "google"], default: "credentials" },
    address: {
      street: { type: String, default: "", maxlength: 200 },
      city: { type: String, default: "", maxlength: 100 },
      state: { type: String, default: "", maxlength: 100 },
      pin: { type: String, default: "", maxlength: 10 },
    },
    sellerProfile: {
      farmName: { type: String, default: "", maxlength: 100 },
      description: { type: String, default: "", maxlength: 1000 },
      location: { type: String, default: "", maxlength: 100 },
      status: { type: String, enum: ["pending", "approved", "suspended"], default: "pending" },
      rating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0, min: 0 },
      totalSales: { type: Number, default: 0, min: 0 },
      joinedAt: { type: Date, default: Date.now },
    },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Goat" }],
    isEmailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password automatically before saving if modified
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password helper using bcrypt
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
