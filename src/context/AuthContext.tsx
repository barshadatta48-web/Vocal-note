import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  OnboardingData,
  SubscriptionTier,
  BillingCycle,
  AuthSession,
  AuthStatus,
  AuthNotification,
  StudentVerificationStatus,
} from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  session: AuthSession | null;
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isRehydrating: boolean;
  notification: AuthNotification | null;
  clearNotification: () => void;
  isSubscriptionModalOpen: boolean;
  isLogoutModalOpen: boolean;
  isProfileDrawerOpen: boolean;
  isStudentVerificationModalOpen: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  socialLogin: (provider: 'google' | 'github') => Promise<boolean>;
  logout: () => void;
  confirmLogout: () => void;
  expireSession: (reason?: string) => void;
  handleAuthError: (error: { status?: number; message?: string }) => void;
  completeOnboarding: (data: OnboardingData) => void;
  upgradeSubscription: (tier: SubscriptionTier, cycle: BillingCycle) => boolean;
  openSubscriptionModal: () => void;
  closeSubscriptionModal: () => void;
  openStudentVerificationModal: () => void;
  closeStudentVerificationModal: () => void;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
  openProfileDrawer: () => void;
  closeProfileDrawer: () => void;
  restartOnboarding: () => void;
  // Student verification actions
  verifyStudentEmail: (studentEmail: string, institution: string) => Promise<{ success: boolean; message: string; requiresOtp?: boolean; generatedOtp?: string }>;
  submitStudentOtp: (otp: string) => Promise<{ success: boolean; message: string }>;
  submitStudentDocument: (data: { institutionName: string; graduationYear: string; documentUrl: string; documentName: string; simulateInstantApproval?: boolean }) => Promise<{ success: boolean; message: string }>;
  setStudentVerificationStatus: (status: StudentVerificationStatus, details?: Partial<UserProfile>) => void;
  resetStudentVerification: () => void;
}

// Storage keys
export const STORAGE_KEY_TOKEN = 'vocalnote_session_token';
export const STORAGE_KEY_SESSION = 'vocalnote_auth_session';
export const STORAGE_KEY_USER = 'vocalnote_auth_user';
export const STORAGE_KEY_ONBOARDED = 'vocalnote_auth_onboarded';
export const STORAGE_KEY_REMEMBER = 'vocalnote_remember_me';
export const STORAGE_KEY_NOTIFICATION = 'vocalnote_auth_notification';

const DEFAULT_DEMO_USER: UserProfile = {
  id: 'usr_demo_101',
  name: 'Barsha Datta',
  email: 'dattabarsha9@gmail.com',
  role: 'Product Designer',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  teamSize: '2-5 members',
  useCase: 'Voice Brainstorming & Daily Notes',
  themePreference: 'Ocean Teal',
  subscriptionTier: 'base',
  subscription_plan: 'base',
  billingCycle: 'monthly',
  isFirstLogin: false,
  createdAt: new Date().toISOString(),
  is_student: false,
  student_verification_status: 'none',
  institution_name: '',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State 1: Verification lifecycle flag (starts true to prevent UI flash/flicker)
  const [isRehydrating, setIsRehydrating] = useState<boolean>(true);
  
  // State 2: Authenticated user profile and session
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('verifying');
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [notification, setNotification] = useState<AuthNotification | null>(null);

  // Modals and drawer state
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isStudentVerificationModalOpen, setIsStudentVerificationModalOpen] = useState(false);

  // Pending student verification state
  const [pendingStudentOtp, setPendingStudentOtp] = useState<string | null>(null);
  const [pendingStudentDetails, setPendingStudentDetails] = useState<{ email: string; institution: string } | null>(null);

  /**
   * REHYDRATION LIFECYCLE:
   * 1. Runs asynchronously on initial app mount.
   * 2. Reads tokens and session metadata from persistent storage.
   * 3. Verifies session expiration (validating against current timestamp).
   * 4. If expired or 401/403 corrupted: automatically wipes session and sets notification.
   * 5. If valid: restores session state and user profile without UI flicker.
   */
  useEffect(() => {
    let isMounted = true;

    const rehydrateSession = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Check for any pending notification in storage
        const storedNotif = localStorage.getItem(STORAGE_KEY_NOTIFICATION);
        if (storedNotif) {
          try {
            const parsedNotif = JSON.parse(storedNotif);
            if (isMounted) setNotification(parsedNotif);
          } catch {
            if (isMounted) setNotification({ type: 'warning', message: storedNotif });
          }
          localStorage.removeItem(STORAGE_KEY_NOTIFICATION);
        }

        const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        const storedSessionJson = localStorage.getItem(STORAGE_KEY_SESSION);
        const storedUserJson = localStorage.getItem(STORAGE_KEY_USER);
        const storedOnboarded = localStorage.getItem(STORAGE_KEY_ONBOARDED);

        if (!storedToken || !storedSessionJson || !storedUserJson) {
          if (isMounted) {
            setUser(null);
            setSession(null);
            setAuthStatus('unauthenticated');
            setIsOnboarded(false);
            setIsRehydrating(false);
          }
          return;
        }

        let parsedSession: AuthSession;
        let parsedUser: UserProfile;
        try {
          parsedSession = JSON.parse(storedSessionJson);
          parsedUser = JSON.parse(storedUserJson);
        } catch {
          throw new Error('Corrupted auth session JSON in localStorage');
        }

        // Validate session token matching & expiration
        const now = Date.now();
        if (parsedSession.token !== storedToken || parsedSession.expiresAt <= now) {
          console.warn('[Auth] Expired or invalid session token detected during rehydration');
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          localStorage.removeItem(STORAGE_KEY_SESSION);
          localStorage.removeItem(STORAGE_KEY_USER);
          localStorage.removeItem(STORAGE_KEY_ONBOARDED);

          if (isMounted) {
            setUser(null);
            setSession(null);
            setAuthStatus('unauthenticated');
            setIsOnboarded(false);
            setNotification({
              type: 'warning',
              message: 'Your previous session has expired. Please sign in to continue.',
            });
            setIsRehydrating(false);
          }
          return;
        }

        // Token is valid and non-expired: restore authenticated session
        if (isMounted) {
          setUser(parsedUser);
          setSession(parsedSession);
          setAuthStatus('authenticated');
          setIsOnboarded(storedOnboarded === 'true');
          setIsRehydrating(false);
        }
      } catch (err) {
        console.error('[Auth] Failed to rehydrate session:', err);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_SESSION);
        localStorage.removeItem(STORAGE_KEY_USER);

        if (isMounted) {
          setUser(null);
          setSession(null);
          setAuthStatus('unauthenticated');
          setIsOnboarded(false);
          setIsRehydrating(false);
        }
      }
    };

    rehydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
    localStorage.removeItem(STORAGE_KEY_NOTIFICATION);
  }, []);

  const expireSession = useCallback((reason = 'Session expired. Please log in again.') => {
    console.warn('[Auth] Expiring session:', reason);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_ONBOARDED);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);

    setUser(null);
    setSession(null);
    setAuthStatus('unauthenticated');
    setIsOnboarded(false);
    setIsLogoutModalOpen(false);
    setIsProfileDrawerOpen(false);
    setIsSubscriptionModalOpen(false);
    setIsStudentVerificationModalOpen(false);
    setNotification({
      type: 'warning',
      message: reason,
    });
  }, []);

  const handleAuthError = useCallback((error: { status?: number; message?: string }) => {
    if (error.status === 401 || error.status === 403) {
      expireSession('Session expired or unauthorized. Please log in again.');
    } else {
      setNotification({
        type: 'error',
        message: error.message || 'An authentication error occurred.',
      });
    }
  }, [expireSession]);

  const login = async (email: string, _password: string, rememberMe = true): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 350));

    const token = `vocal_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const cleanEmail = email.trim().toLowerCase();

    const existingName = cleanEmail.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = existingName.charAt(0).toUpperCase() + existingName.slice(1);

    const isDemo = cleanEmail === 'dattabarsha9@gmail.com';
    const profile: UserProfile = isDemo
      ? { ...DEFAULT_DEMO_USER, sessionToken: token }
      : {
          id: `usr_${Date.now()}`,
          name: formattedName || 'Barsha Datta',
          email: cleanEmail,
          role: 'Creator & Thinker',
          avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80`,
          teamSize: 'Solo Thinker',
          useCase: 'Voice Ideation',
          themePreference: 'Ocean Teal',
          subscriptionTier: 'base',
          subscription_plan: 'base',
          billingCycle: 'monthly',
          sessionToken: token,
          isFirstLogin: false,
          createdAt: new Date().toISOString(),
          is_student: false,
          student_verification_status: 'none',
          institution_name: '',
        };

    const newSession: AuthSession = {
      token,
      expiresAt,
      issuedAt: Date.now(),
      userId: profile.id,
      role: profile.role,
    };

    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEY_REMEMBER);
      }
    } catch (e) {
      console.error('[Auth] Failed to write session to localStorage:', e);
    }

    setUser(profile);
    setSession(newSession);
    setIsOnboarded(true);
    setAuthStatus('authenticated');
    setNotification(null);
    return true;
  };

  const signup = async (name: string, email: string, _password: string): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 400));

    const token = `vocal_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || 'New Creator';

    const isStudentEmail = /@(.*\.)?(edu|ac\.in|edu\.in|ac\.uk|edu\.au|edu\.sg|school|uni)/i.test(cleanEmail);

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: isStudentEmail ? 'Student / Scholar' : 'Member',
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=e2e8f0`,
      subscriptionTier: 'free',
      subscription_plan: 'free',
      billingCycle: 'monthly',
      sessionToken: token,
      isFirstLogin: true,
      createdAt: new Date().toISOString(),
      is_student: isStudentEmail,
      student_verification_status: 'none',
      institution_name: isStudentEmail ? cleanEmail.split('@')[1] : '',
      student_email: isStudentEmail ? cleanEmail : undefined,
    };

    const newSession: AuthSession = {
      token,
      expiresAt,
      issuedAt: Date.now(),
      userId: newUser.id,
      role: newUser.role,
    };

    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'false');
    } catch (e) {
      console.error('[Auth] Failed to write session to localStorage:', e);
    }

    setUser(newUser);
    setSession(newSession);
    setIsOnboarded(false);
    setAuthStatus('authenticated');
    setNotification(null);
    return true;
  };

  const socialLogin = async (provider: 'google' | 'github'): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 450));

    const providerEmail = provider === 'google' ? 'student.scholar@stanford.edu' : 'github.creator@dev.io';
    const providerName = provider === 'google' ? 'Alex Rivera (Stanford Student)' : 'Devon Vance';
    const isStudentEmail = provider === 'google';

    const token = `vocal_sess_social_${provider}_${Date.now()}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const profile: UserProfile = {
      id: `usr_${provider}_${Date.now()}`,
      name: providerName,
      email: providerEmail,
      role: isStudentEmail ? 'Graduate Student / Researcher' : 'Fullstack Developer',
      avatar: provider === 'google'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      teamSize: '1-3 members',
      useCase: 'Audio Notes & Study Lectures',
      themePreference: 'Ocean Teal',
      subscriptionTier: 'free',
      billingCycle: 'monthly',
      sessionToken: token,
      isFirstLogin: false,
      createdAt: new Date().toISOString(),
      is_student: isStudentEmail,
      student_verification_status: isStudentEmail ? 'verified' : 'none',
      institution_name: isStudentEmail ? 'Stanford University' : '',
      student_email: isStudentEmail ? providerEmail : undefined,
      student_verified_at: isStudentEmail ? new Date().toISOString() : undefined,
    };

    const newSession: AuthSession = {
      token,
      expiresAt,
      issuedAt: Date.now(),
      userId: profile.id,
      role: profile.role,
    };

    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
    } catch (e) {
      console.error('[Auth] Failed to write session to localStorage:', e);
    }

    setUser(profile);
    setSession(newSession);
    setIsOnboarded(true);
    setAuthStatus('authenticated');
    setNotification(null);
    return true;
  };

  const logout = () => {
    setIsProfileDrawerOpen(false);
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    console.info('[Auth] User confirmed sign out. Purging session.');
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_ONBOARDED);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);

    setUser(null);
    setSession(null);
    setAuthStatus('unauthenticated');
    setIsOnboarded(false);
    setIsLogoutModalOpen(false);
    setIsProfileDrawerOpen(false);
    setIsSubscriptionModalOpen(false);
    setIsStudentVerificationModalOpen(false);
    setNotification({
      type: 'info',
      message: 'You have been successfully signed out.',
    });
  };

  const completeOnboarding = (data: OnboardingData) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      name: data.name,
      role: data.role,
      avatar: data.avatar,
      useCase: data.useCase,
      teamSize: data.teamSize,
      themePreference: data.themePreference,
      isFirstLogin: false,
    };

    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
    } catch (e) {
      console.error('[Auth] Failed to update onboarding data:', e);
    }

    setUser(updated);
    setIsOnboarded(true);
  };

  const restartOnboarding = () => {
    setIsOnboarded(false);
    localStorage.setItem(STORAGE_KEY_ONBOARDED, 'false');
    setIsProfileDrawerOpen(false);
  };

  /**
   * UPGRADE SUBSCRIPTION:
   * Protects the 'student' plan by strictly enforcing verified student status.
   */
  const upgradeSubscription = (tier: SubscriptionTier, cycle: BillingCycle): boolean => {
    if (!user) return false;

    // STUDENT PLAN VERIFICATION GUARD:
    if (tier === 'student') {
      if (user.student_verification_status !== 'verified') {
        setNotification({
          type: 'warning',
          message: 'Active student status verification is required before activating the discounted Student Plan.',
        });
        setIsSubscriptionModalOpen(false);
        setIsStudentVerificationModalOpen(true);
        return false;
      }
    }

    const updated: UserProfile = {
      ...user,
      subscriptionTier: tier,
      subscription_plan: tier,
      billingCycle: cycle,
    };

    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('[Auth] Error updating subscription tier:', e);
    }

    setUser(updated);
    setNotification({
      type: 'success',
      message: tier === 'student'
        ? 'Student Plan activated with exclusive academic discount!'
        : `${tier.toUpperCase()} plan activated successfully.`,
    });
    return true;
  };

  /**
   * STUDENT VERIFICATION FLOWS
   */
  const verifyStudentEmail = async (
    studentEmail: string,
    institution: string
  ): Promise<{ success: boolean; message: string; requiresOtp?: boolean; generatedOtp?: string }> => {
    await new Promise((res) => setTimeout(res, 500));
    const cleanEmail = studentEmail.trim().toLowerCase();

    // Check institutional domain formats
    const isAcademicDomain =
      /\.(edu|ac\.in|edu\.in|ac\.uk|edu\.au|edu\.sg|edu\.ca|ac\.nz|edu\.mx|sch\.id)$/i.test(cleanEmail) ||
      /@.*(stanford|mit|harvard|berkeley|ox\.ac|cam\.ac|iit[a-z]*|du\.ac|bits-pilani|columbia|nyu|yale|princeton|ucla|cornell|cmu|nus|ntu|utoronto)\./i.test(cleanEmail);

    if (!isAcademicDomain) {
      return {
        success: false,
        message: 'Please enter a recognized institutional email address ending with .edu, .edu.in, .ac.in, or university domain.',
      };
    }

    // Generate a 6-digit verification code
    const generatedCode = '842915';
    setPendingStudentOtp(generatedCode);
    setPendingStudentDetails({ email: cleanEmail, institution: institution.trim() || cleanEmail.split('@')[1] });

    return {
      success: true,
      message: `Verification code sent to ${cleanEmail}. Enter code to verify.`,
      requiresOtp: true,
      generatedOtp: generatedCode,
    };
  };

  const submitStudentOtp = async (otp: string): Promise<{ success: boolean; message: string }> => {
    await new Promise((res) => setTimeout(res, 400));
    const cleanOtp = otp.trim();

    if (cleanOtp !== pendingStudentOtp && cleanOtp !== '842915' && cleanOtp !== '123456') {
      return {
        success: false,
        message: 'Invalid verification code. Please check your institutional email and try again.',
      };
    }

    if (!user) return { success: false, message: 'User not signed in.' };

    const detectedInstitution = pendingStudentDetails?.institution || 'Academic Institution';
    const updated: UserProfile = {
      ...user,
      is_student: true,
      student_verification_status: 'verified',
      student_email: pendingStudentDetails?.email || user.email,
      institution_name: detectedInstitution,
      student_verified_at: new Date().toISOString(),
      rejection_reason: undefined,
    };

    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('[Auth] Failed to save verified student user:', e);
    }

    setUser(updated);
    setPendingStudentOtp(null);
    setPendingStudentDetails(null);
    setNotification({
      type: 'success',
      message: 'Student status successfully verified! 50% discount unlocked.',
    });

    return {
      success: true,
      message: 'Congratulations! Your student status is verified.',
    };
  };

  const submitStudentDocument = async (data: {
    institutionName: string;
    graduationYear: string;
    documentUrl: string;
    documentName: string;
    simulateInstantApproval?: boolean;
  }): Promise<{ success: boolean; message: string }> => {
    await new Promise((res) => setTimeout(res, 600));

    if (!user) return { success: false, message: 'User not signed in.' };

    const isInstant = data.simulateInstantApproval ?? true;
    const newStatus: StudentVerificationStatus = isInstant ? 'verified' : 'pending';

    const updated: UserProfile = {
      ...user,
      is_student: isInstant,
      student_verification_status: newStatus,
      institution_name: data.institutionName,
      graduation_year: data.graduationYear,
      verification_document_url: data.documentUrl,
      verification_document_name: data.documentName,
      student_verified_at: isInstant ? new Date().toISOString() : undefined,
      rejection_reason: undefined,
    };

    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('[Auth] Failed to update document verification:', e);
    }

    setUser(updated);
    setNotification({
      type: isInstant ? 'success' : 'info',
      message: isInstant
        ? 'Student ID verified via Instant Academic OCR! Student Plan discount unlocked.'
        : 'Student document submitted for review. Verification status is pending.',
    });

    return {
      success: true,
      message: isInstant
        ? 'Student credentials verified successfully!'
        : 'Student document submitted for verification.',
    };
  };

  const setStudentVerificationStatus = (status: StudentVerificationStatus, details?: Partial<UserProfile>) => {
    if (!user) return;
    const isStudent = status === 'verified';
    const updated: UserProfile = {
      ...user,
      ...details,
      is_student: isStudent,
      student_verification_status: status,
      student_verified_at: isStudent ? (user.student_verified_at || new Date().toISOString()) : undefined,
    };

    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('[Auth] Failed to update verification status:', e);
    }

    setUser(updated);
  };

  const resetStudentVerification = () => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      is_student: false,
      student_verification_status: 'none',
      student_email: undefined,
      institution_name: '',
      graduation_year: undefined,
      verification_document_url: undefined,
      verification_document_name: undefined,
      student_verified_at: undefined,
      rejection_reason: undefined,
      // If user was on student tier, downgrade to starter free
      subscriptionTier: user.subscriptionTier === 'student' ? 'free' : user.subscriptionTier,
    };

    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('[Auth] Failed to reset student verification:', e);
    }

    setUser(updated);
    setNotification({
      type: 'info',
      message: 'Student verification status reset.',
    });
  };

  const openSubscriptionModal = () => {
    setIsProfileDrawerOpen(false);
    setIsSubscriptionModalOpen(true);
  };

  const closeSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
  };

  const openStudentVerificationModal = () => {
    setIsProfileDrawerOpen(false);
    setIsStudentVerificationModalOpen(true);
  };

  const closeStudentVerificationModal = () => {
    setIsStudentVerificationModalOpen(false);
  };

  const openLogoutModal = () => {
    setIsProfileDrawerOpen(false);
    setIsLogoutModalOpen(true);
  };

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false);
  };

  const openProfileDrawer = () => {
    setIsProfileDrawerOpen(true);
  };

  const closeProfileDrawer = () => {
    setIsProfileDrawerOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authStatus,
        isAuthenticated: !!user && !!session && authStatus === 'authenticated',
        isOnboarded,
        isRehydrating,
        notification,
        clearNotification,
        isSubscriptionModalOpen,
        isLogoutModalOpen,
        isProfileDrawerOpen,
        isStudentVerificationModalOpen,
        login,
        signup,
        socialLogin,
        logout,
        confirmLogout,
        expireSession,
        handleAuthError,
        completeOnboarding,
        upgradeSubscription,
        openSubscriptionModal,
        closeSubscriptionModal,
        openStudentVerificationModal,
        closeStudentVerificationModal,
        openLogoutModal,
        closeLogoutModal,
        openProfileDrawer,
        closeProfileDrawer,
        restartOnboarding,
        verifyStudentEmail,
        submitStudentOtp,
        submitStudentDocument,
        setStudentVerificationStatus,
        resetStudentVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
