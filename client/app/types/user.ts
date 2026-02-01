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

export interface User {
  _id: string;
  auth0Id: string;
  email: string;
  name?: string;
  picture?: string;

  // Wallet
  credits: number;

  // Subscription Data
  planType: PlanType;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string;
  currentPeriodEnd?: string; // Dates over JSON are strings

  // ✅ Phase 1: Pro Mode Logic
  hasUsedProTrial: boolean;
  preferences?: {
    defaultProMode: boolean;
  };

  createdAt: string;
  updatedAt: string;
}

// Auth State Helper
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
