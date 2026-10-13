import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
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
          Verifying authentication session...
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
 * Strictly enforces sequential lifecycle:
 * Registration / First Login -> Initial State Setup -> Authentication Session Verification -> Protected Access
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isRehydrating, isAuthenticated, isOnboarded, user, session } = useAuth();
  const { currentPath, navigate, isPublicRoute } = useAppRouter();

  // 1. REHYDRATION CHECK:
  // While rehydrating session from storage, halt navigation checks to prevent UI flicker
  const hasValidSession = isAuthenticated && !!user && !!session && !isRehydrating;

  // 2. STATE-DRIVEN REDIRECT CHECKS:
  useEffect(() => {
    if (isRehydrating) return;

    const isPublic = isPublicRoute(currentPath);

    // CASE A: User is unauthenticated and attempting to access a protected route
    if (!hasValidSession && !isPublic) {
      if (currentPath !== '/login') {
        console.log(`[AuthGuard] Intercepting unauthorized route "${currentPath}" -> Redirecting to /login`);
        navigate('/login', { replace: true });
      }
      return;
    }

    // CASE B: User is authenticated but is a FIRST-TIME / UN-ONBOARDED user
    if (hasValidSession && !isOnboarded) {
      if (currentPath !== '/onboarding') {
        console.log(`[AuthGuard] Intercepting un-onboarded user at "${currentPath}" -> Redirecting to /onboarding`);
        navigate('/onboarding', { replace: true });
      }
      return;
    }

    // CASE C: User is fully authenticated & onboarded but on a public route (e.g. /login, /signup, /landing)
    if (hasValidSession && isOnboarded && isPublic) {
      if (currentPath !== '/dashboard' && currentPath !== '/') {
        console.log(`[AuthGuard] Authenticated user on public path "${currentPath}" -> Redirecting to /dashboard`);
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    // CASE D: User is fully onboarded but visiting /onboarding
    if (hasValidSession && isOnboarded && currentPath === '/onboarding') {
      console.log(`[AuthGuard] Already onboarded -> Redirecting to /dashboard`);
      navigate('/dashboard', { replace: true });
    }
  }, [isRehydrating, hasValidSession, isOnboarded, currentPath, isPublicRoute, navigate]);

  // RENDER LIFECYCLE 1: Session Rehydration Screen
  if (isRehydrating) {
    return <AuthSkeleton />;
  }

  // RENDER LIFECYCLE 2: Public Unauthenticated Views
  if (!hasValidSession) {
    const isSignupPath = currentPath === '/signup';
    return <AuthScreen initialMode={isSignupPath ? 'signup' : 'login'} />;
  }

  // RENDER LIFECYCLE 3: Mandatory First-Login Onboarding Screen
  if (!isOnboarded || currentPath === '/onboarding') {
    return <OnboardingFlow />;
  }

  // RENDER LIFECYCLE 4: Verified Protected Application Workspace
  return <>{children}</>;
};

/**
 * ProtectedRoute Component
 * Can be wrapped around specific views or layouts to enforce auth session validation.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthGuard>{children}</AuthGuard>;
};
