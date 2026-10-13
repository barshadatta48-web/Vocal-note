export type SubscriptionTier = 'free' | 'base' | 'pro' | 'student';
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

export type StudentVerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

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
  subscription_plan?: string;
  billingCycle: BillingCycle;
  createdAt: string;

  // Student Subscription & Verification Schema
  is_student?: boolean;
  student_verification_status?: StudentVerificationStatus;
  institution_name?: string;
  student_email?: string;
  verification_document_url?: string;
  verification_document_name?: string;
  graduation_year?: string;
  student_verified_at?: string;
  rejection_reason?: string;
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
  isStudentOnly?: boolean;
  features: string[];
  specs: {
    storageLimit: string;
    audioTranscribeLimit: string;
    canvasNotes: string;
    support: string;
  };
}
