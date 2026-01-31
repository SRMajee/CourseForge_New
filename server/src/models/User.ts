import mongoose, { Schema, Document } from "mongoose";

// ✅ FIX 1: Relax Enum to accept "free" and "pro" (lowercase)
export const PLAN_TYPES = ["FREE", "PRO", "free", "pro"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "unpaid"
  | "free";

export interface IUser extends Document {
  auth0Id: string;
  email: string;
  name?: string;
  picture?: string;
  credits: number;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd?: Date;
  planType: PlanType;
  hasUsedProTrial: boolean;
  preferences: {
    defaultProMode: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    auth0Id: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    email: { type: String, required: true },
    name: { type: String },
    picture: { type: String },

    credits: { type: Number, default: 50 },

    // ✅ FIX 2: Remove 'unique' from sparse fields to avoid null collision errors
    stripeCustomerId: { type: String, sparse: true },
    subscriptionId: { type: String, sparse: true },

    subscriptionStatus: {
      type: String,
      default: "free",
      index: true,
    },
    currentPeriodEnd: { type: Date },

    planType: {
      type: String,
      enum: PLAN_TYPES, // ✅ Uses the relaxed list
      default: "FREE",
    },
    hasUsedProTrial: { type: Boolean, default: false },
    preferences: {
      defaultProMode: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", userSchema);
