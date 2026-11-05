import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { SplashScreen } from './SplashScreen';
import { ProfileCreationStep } from './ProfileCreationStep';
import { AuthScreen } from './AuthScreen';
import { OnboardingFlow } from './OnboardingFlow';

/**
 * Clean, minimalist Session Verification Skeleton Screen
 * Rendered during async session rehydration to prevent UI flash or unauthorized content leaks.
 */
export const AuthSkeleton: React.FC = () => {
  return (
    <div
      className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center p-6 font-sans antialiased text-zinc-900 select-none"
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center max-w-xs w-full text-center"
      >
        {/* Animated Minimal Logo Badge */}
        <div className="relative mb-5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            V
          </div>
          <div className="absolute -inset-1 rounded-2xl border border-zinc-300/80 animate-ping opacity-25 pointer-events-none" />
        </div>

        <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
          Vocal Note
        </h2>
        <p className="text-xs text-zinc-400 mt-1 mb-5">
          Verifying secure workspace session...
        </p>

        {/* Hairline Progress Indicator */}
        <div className="w-48 h-1 bg-zinc-200/80 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-zinc-900 rounded-full"
            initial={{ x: '-100%', width: '40%' }}
            animate={{ x: '250%' }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: 'easeInOut',
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * State-Driven Routing Guard (AuthGuard)
 * Strictly enforces the 5-step sequential user journey:
 * 1. Splash Screen & User Welcome
 * 2. Profile Creation State (for new users)
 * 3. Sign Up / Sign In Handshake
 * 4. Main Workspace / Dashboard
 * 5. Paid Feature & Subscription Gating
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const {
    isRehydrating,
    isAuthenticated,
    isPasswordRecovery,
    isOnboarded,
    user,
    session,
    hasCompletedSplash,
    completeSplashScreen,
    hasCompletedProfileSetup,
    draftProfile,
    saveDraftProfile,
    skipToAuth,
  } = useAuth();

  const { currentPath, navigate, isPublicRoute } = useAppRouter();

  const hasValidSession = isAuthenticated && !!user && !!session && !isRehydrating;

  // Sync browser path with sequential state
  useEffect(() => {
    if (isRehydrating || !hasCompletedSplash) return;

    const isPublic = isPublicRoute(currentPath);

    // If unauthenticated: ensure path points to login/signup
    if (!hasValidSession) {
      if (!isPublic && currentPath !== '/login' && currentPath !== '/signup') {
        navigate('/login', { replace: true });
      }
      return;
    }

    // If authenticated: ensure path points to dashboard if previously on login/signup
    if (hasValidSession && isPublic) {
      if (currentPath !== '/dashboard' && currentPath !== '/') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isRehydrating, hasCompletedSplash, hasValidSession, currentPath, isPublicRoute, navigate]);

  // STEP 1: SPLASH SCREEN & USER WELCOME (Initial launch gate)
  if (!hasCompletedSplash) {
    return <SplashScreen onComplete={completeSplashScreen} />;
  }

  // REHYDRATION LIFECYCLE: Prevents UI flicker while reading session from persistent storage
  if (isRehydrating) {
    return <AuthSkeleton />;
  }

  // Supabase password-recovery links return an authenticated recovery session.
  if (isPasswordRecovery) {
    return <AuthScreen initialMode="login" draftProfile={draftProfile} />;
  }

  // STEP 2: PROFILE CREATION STATE (For new unauthenticated users before credentials handshake)
  if (!hasValidSession && !hasCompletedProfileSetup) {
    return (
      <ProfileCreationStep
        initialData={draftProfile || undefined}
        onComplete={saveDraftProfile}
        onAlreadyHaveAccount={skipToAuth}
      />
    );
  }

  // STEP 3: SIGN UP / SIGN IN AUTHENTICATION HANDSHAKE
  if (!hasValidSession) {
    const isSignup = currentPath === '/signup' || Boolean(draftProfile);
    return (
      <AuthScreen
        initialMode={isSignup ? 'signup' : 'login'}
        draftProfile={draftProfile}
      />
    );
  }

  // STEP 4: MAIN WORKSPACE / DASHBOARD (+ STEP 5: PAID FEATURE GATING)
  return <>{children}</>;
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthGuard>{children}</AuthGuard>;
};
