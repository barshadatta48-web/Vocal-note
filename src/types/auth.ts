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
  displayName?: string;
  full_name?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  email: string;
  role: string;
  avatar: string;
  avatar_url?: string;
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

export type SequentialFlowStep = 'splash' | 'profile_creation' | 'auth' | 'dashboard';

export interface DraftProfile {
  name: string;
  avatar: string;
  role: string;
  useCase: string;
  themePreference: string;
  isStudent?: boolean;
}

export const generateInitialsAvatar = (name: string): string => {
  const cleanName = (name || 'User').trim();
  const initials =
    cleanName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="28" fill="#18181b"/><text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
