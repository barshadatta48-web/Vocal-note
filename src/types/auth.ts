export type SubscriptionTier = 'free' | 'base' | 'pro';
export type BillingCycle = 'monthly' | 'annual';

export interface AuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
  issuedAt: number;
  userId: string;
  role: string;
}

export type AuthStatus = 'verifying' | 'unauthenticated' | 'authenticated';

export interface AuthNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  sessionToken?: string;
  isFirstLogin?: boolean;
  teamSize?: string;
  useCase?: string;
  themePreference?: string;
  subscriptionTier: SubscriptionTier;
  billingCycle: BillingCycle;
  createdAt: string;
}

export interface OnboardingData {
  name: string;
  role: string;
  avatar: string;
  useCase: string;
  teamSize: string;
  themePreference: string;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  badge?: string;
  tagline: string;
  monthlyPriceINR: number;
  annualPriceINRPerMonth: number;
  annualBilledTotalINR: number;
  discountTag?: string;
  isFeatured?: boolean;
  features: string[];
  specs: {
    storageLimit: string;
    audioTranscribeLimit: string;
    canvasNotes: string;
    support: string;
  };
}
