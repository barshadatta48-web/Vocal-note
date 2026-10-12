import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, OnboardingData, SubscriptionTier, BillingCycle } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isSubscriptionModalOpen: boolean;
  isLogoutModalOpen: boolean;
  isProfileDrawerOpen: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  socialLogin: (provider: 'google' | 'github') => Promise<boolean>;
  logout: () => void;
  confirmLogout: () => void;
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

const STORAGE_KEY_USER = 'vocalnote_auth_user';
const STORAGE_KEY_ONBOARDED = 'vocalnote_auth_onboarded';
const STORAGE_KEY_REMEMBER = 'vocalnote_remember_me';

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
  createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        return JSON.parse(savedUser);
      }
      // If user had a remembered session previously, load default demo user
      const isRemembered = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
      if (isRemembered) {
        return DEFAULT_DEMO_USER;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    try {
      const savedOnboarded = localStorage.getItem(STORAGE_KEY_ONBOARDED);
      if (savedOnboarded !== null) {
        return savedOnboarded === 'true';
      }
      return true; // default true if existing user
    } catch {
      return true;
    }
  });

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  // Sync state to localStorage
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      } catch (e) {
        console.error('Failed to save user to localStorage', e);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ONBOARDED, String(isOnboarded));
    } catch (e) {
      console.error('Failed to save onboarding state', e);
    }
  }, [isOnboarded]);

  const login = async (email: string, _password: string, rememberMe = true): Promise<boolean> => {
    // Simulate auth network response
    await new Promise((res) => setTimeout(res, 450));
    
    // Check if name can be inferred from email or existing user
    const existingName = user?.email === email ? user.name : email.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = existingName.charAt(0).toUpperCase() + existingName.slice(1);

    const loggedUser: UserProfile = {
      id: user?.id || `usr_${Date.now()}`,
      name: formattedName || 'Barsha Datta',
      email: email.trim().toLowerCase(),
      role: user?.role || 'Creator & Thinker',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      teamSize: user?.teamSize || 'Solo Thinker',
      useCase: user?.useCase || 'Voice Ideation',
      themePreference: user?.themePreference || 'Ocean Teal',
      subscriptionTier: user?.subscriptionTier || 'base',
      billingCycle: user?.billingCycle || 'monthly',
      createdAt: user?.createdAt || new Date().toISOString(),
    };

    setUser(loggedUser);
    setIsOnboarded(true);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_REMEMBER);
    }
    return true;
  };

  const signup = async (name: string, email: string, _password: string): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 500));
    
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'Member',
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name || 'User')}&backgroundColor=e2e8f0`,
      subscriptionTier: 'free',
      billingCycle: 'monthly',
      createdAt: new Date().toISOString(),
    };

    setUser(newUser);
    // Newly signed up users MUST go through the onboarding wizard!
    setIsOnboarded(false);
    localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
    return true;
  };

  const socialLogin = async (provider: 'google' | 'github'): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 400));
    const socialUser: UserProfile = {
      id: `usr_${provider}_${Date.now()}`,
      name: provider === 'google' ? 'Barsha Datta' : 'Barsha Dev',
      email: 'dattabarsha9@gmail.com',
      role: provider === 'google' ? 'Product Strategist' : 'Senior Engineer',
      avatar: provider === 'google'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
        : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      teamSize: '2-5 members',
      useCase: 'Meeting Notes & Voice Canvas',
      themePreference: 'Ocean Teal',
      subscriptionTier: 'base',
      billingCycle: 'monthly',
      createdAt: new Date().toISOString(),
    };

    setUser(socialUser);
    setIsOnboarded(true);
    localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
    return true;
  };

  const logout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setUser(null);
    setIsOnboarded(false);
    setIsLogoutModalOpen(false);
    setIsProfileDrawerOpen(false);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);
  };

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
    };
    setUser(updated);
    setIsOnboarded(true);
  };

  const restartOnboarding = () => {
    setIsOnboarded(false);
    setIsProfileDrawerOpen(false);
  };

  const upgradeSubscription = (tier: SubscriptionTier, cycle: BillingCycle) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      subscriptionTier: tier,
      billingCycle: cycle,
    };
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
        isAuthenticated: !!user,
        isOnboarded,
        isSubscriptionModalOpen,
        isLogoutModalOpen,
        isProfileDrawerOpen,
        login,
        signup,
        socialLogin,
        logout,
        confirmLogout,
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
