export type SubscriptionTier = 'free' | 'base' | 'pro';
export type BillingCycle = 'monthly' | 'annual';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
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
