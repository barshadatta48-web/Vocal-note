import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  OnboardingData,
  SubscriptionTier,
  BillingCycle,
  AuthSession,
  AuthStatus,
  AuthNotification,
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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  socialLogin: (provider: 'google' | 'github') => Promise<boolean>;
  logout: () => void;
  confirmLogout: () => void;
  expireSession: (reason?: string) => void;
  handleAuthError: (error: { status?: number; message?: string }) => void;
  completeOnboarding: (data: OnboardingData) => void;
  upgradeSubscription: (tier: SubscriptionTier, cycle: BillingCycle) => void;
  openSubscriptionModal: () => void;
  closeSubscriptionModal: () => void;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
  openProfileDrawer: () => void;
  closeProfileDrawer: () => void;
  restartOnboarding: () => void;
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
  billingCycle: 'monthly',
  isFirstLogin: false,
  createdAt: new Date().toISOString(),
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
        // Small async micro-tick to allow clean layout hydration and avoid flash
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Check for any pending notification in storage (e.g. from expired session or redirect)
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
          // No valid session token exists in storage
          if (isMounted) {
            setUser(null);
            setSession(null);
            setAuthStatus('unauthenticated');
            setIsOnboarded(false);
            setIsRehydrating(false);
          }
          return;
        }

        const parsedSession: AuthSession = JSON.parse(storedSessionJson);
        const parsedUser: UserProfile = JSON.parse(storedUserJson);

        // Verification check: Check if session token has expired
        const now = Date.now();
        if (parsedSession.expiresAt && now >= parsedSession.expiresAt) {
          console.warn('[Auth] Session token has expired. Clearing local session state.');
          // Clean up storage completely
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          localStorage.removeItem(STORAGE_KEY_SESSION);
          localStorage.removeItem(STORAGE_KEY_USER);
          localStorage.removeItem(STORAGE_KEY_ONBOARDED);
          localStorage.removeItem(STORAGE_KEY_REMEMBER);

          if (isMounted) {
            setUser(null);
            setSession(null);
            setAuthStatus('unauthenticated');
            setIsOnboarded(false);
            setNotification({
              type: 'warning',
              message: 'Session expired. Please log in again.',
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
        // Clean corrupted tokens
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

  /**
   * HELPER: Trigger Session Expired (401 / 403 or manual token expiry)
   * Wipes state immediately and stores notification message for the login screen.
   */
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

  /**
   * LOGIN HANDSHAKE:
   * 1. Validate credentials.
   * 2. Issue session token and expiry timestamp (24h validity).
   * 3. Securely store session tokens, metadata, and user profile in LocalStorage FIRST.
   * 4. Update React state and resolve promise so navigation proceeds safely.
   */
  const login = async (email: string, _password: string, rememberMe = true): Promise<boolean> => {
    // Simulated credential verification latency
    await new Promise((res) => setTimeout(res, 350));

    const token = `vocal_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry
    const cleanEmail = email.trim().toLowerCase();

    // Check if this was the pre-existing user or demo user
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
          billingCycle: 'monthly',
          sessionToken: token,
          isFirstLogin: false,
          createdAt: new Date().toISOString(),
        };

    const newSession: AuthSession = {
      token,
      expiresAt,
      issuedAt: Date.now(),
      userId: profile.id,
      role: profile.role,
    };

    // ATOMIC STORAGE WRITE BEFORE ROUTING:
    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true'); // Existing login has completed onboarding
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEY_REMEMBER);
      }
    } catch (e) {
      console.error('[Auth] Failed to write session to localStorage:', e);
    }

    // State rehydration
    setUser(profile);
    setSession(newSession);
    setIsOnboarded(true);
    setAuthStatus('authenticated');
    setNotification(null);
    return true;
  };

  /**
   * SIGNUP / FIRST LOGIN HANDSHAKE:
   * 1. Create fresh user identity and session token.
   * 2. Persist token, session, user to LocalStorage FIRST with isOnboarded = false.
   * 3. Mark user as isFirstLogin = true.
   * 4. State updates trigger routing guard to force mandatory /onboarding.
   */
  const signup = async (name: string, email: string, _password: string): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 400));

    const token = `vocal_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || 'New Creator';

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: 'Member',
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=e2e8f0`,
      subscriptionTier: 'free',
      billingCycle: 'monthly',
      sessionToken: token,
      isFirstLogin: true,
      createdAt: new Date().toISOString(),
    };

    const newSession: AuthSession = {
      token,
      expiresAt,
      issuedAt: Date.now(),
      userId: newUser.id,
      role: newUser.role,
    };

    // ATOMIC STORAGE WRITE BEFORE ROUTING:
    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
      // First login users MUST go through onboarding wizard!
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'false');
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
    } catch (e) {
      console.error('[Auth] Failed to write signup session to localStorage:', e);
    }

    setUser(newUser);
    setSession(newSession);
    setIsOnboarded(false);
    setAuthStatus('authenticated');
    setNotification(null);
    return true;
  };

  /**
   * SOCIAL LOGIN HANDSHAKE:
   * Generates valid session token and persists state before triggering navigation.
   */
  const socialLogin = async (provider: 'google' | 'github'): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 350));

    const token = `vocal_sess_${provider}_${Date.now()}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const socialUser: UserProfile = {
      id: `usr_${provider}_${Date.now()}`,
      name: provider === 'google' ? 'Barsha Datta' : 'Barsha Dev',
      email: 'dattabarsha9@gmail.com',
      role: provider === 'google' ? 'Product Strategist' : 'Senior Engineer',
      avatar:
        provider === 'google'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
          : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      teamSize: '2-5 members',
      useCase: 'Meeting Notes & Voice Canvas',
      themePreference: 'Ocean Teal',
      subscriptionTier: 'base',
      billingCycle: 'monthly',
      sessionToken: token,
      isFirstLogin: false,
      createdAt: new Date().toISOString(),
    };

    const newSession: AuthSession = {
      token,
      expiresAt,
      issuedAt: Date.now(),
      userId: socialUser.id,
      role: socialUser.role,
    };

    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(socialUser));
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
    } catch (e) {
      console.error('[Auth] Failed to store social session:', e);
    }

    setUser(socialUser);
    setSession(newSession);
    setIsOnboarded(true);
    setAuthStatus('authenticated');
    setNotification(null);
    return true;
  };

  const logout = () => {
    setIsLogoutModalOpen(true);
  };

  /**
   * COMPLETE LOGOUT:
   * 1. Wipes all session tokens and user state completely.
   * 2. Clears localStorage entries.
   * 3. Resets authStatus to unauthenticated.
   */
  const confirmLogout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_ONBOARDED);
      localStorage.removeItem(STORAGE_KEY_REMEMBER);
      localStorage.removeItem(STORAGE_KEY_NOTIFICATION);
    } catch (e) {
      console.error('[Auth] Error clearing storage on logout:', e);
    }

    setUser(null);
    setSession(null);
    setIsOnboarded(false);
    setAuthStatus('unauthenticated');
    setIsLogoutModalOpen(false);
    setIsProfileDrawerOpen(false);
    setNotification({
      type: 'info',
      message: 'You have been logged out successfully.',
    });
  };

  /**
   * ONBOARDING COMPLETION HANDSHAKE:
   * 1. Updates user profile with role, goals, preferences.
   * 2. Sets isFirstLogin to false.
   * 3. Writes isOnboarded = true to storage.
   * 4. Permits routing guard to grant access to dashboard.
   */
  const completeOnboarding = (data: OnboardingData) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      name: data.name || user.name,
      role: data.role || user.role,
      avatar: data.avatar || user.avatar,
      useCase: data.useCase,
      teamSize: data.teamSize,
      themePreference: data.themePreference,
      isFirstLogin: false,
    };

    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
    } catch (e) {
      console.error('[Auth] Error saving completed onboarding:', e);
    }

    setUser(updated);
    setIsOnboarded(true);
  };

  const restartOnboarding = () => {
    setIsOnboarded(false);
    localStorage.setItem(STORAGE_KEY_ONBOARDED, 'false');
    setIsProfileDrawerOpen(false);
  };

  const upgradeSubscription = (tier: SubscriptionTier, cycle: BillingCycle) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      subscriptionTier: tier,
      billingCycle: cycle,
    };
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch (e) {
      console.error('[Auth] Error updating subscription tier:', e);
    }
    setUser(updated);
  };

  const openSubscriptionModal = () => {
    setIsProfileDrawerOpen(false);
    setIsSubscriptionModalOpen(true);
  };

  const closeSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
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
        openLogoutModal,
        closeLogoutModal,
        openProfileDrawer,
        closeProfileDrawer,
        restartOnboarding,
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
