import React, { useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
const SplashScreen = lazy(() => import('./SplashScreen').then((module) => ({ default: module.SplashScreen })));
const ProfileCreationStep = lazy(() => import('./ProfileCreationStep').then((module) => ({ default: module.ProfileCreationStep })));
const AuthScreen = lazy(() => import('./AuthScreen').then((module) => ({ default: module.AuthScreen })));

const AuthRouteFallback: React.FC = () => (
  <div className="min-h-screen w-full bg-zinc-50 flex items-center justify-center text-zinc-500 text-sm" role="status">
    Preparing secure sign-in…
  </div>
);

/**
 * Clean, minimalist Session Verification Skeleton Screen
 * Rendered during async session rehydration to prevent UI flash or unauthorized content leaks.
 */
export const AuthSkeleton: React.FC = () => (
  <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center p-6 font-sans antialiased text-zinc-900" role="status" aria-live="polite">
    <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg mb-4">V</div>
    <p className="text-sm font-semibold">Vocal Note</p>
    <p className="text-xs text-zinc-400 mt-1">Verifying secure workspace session…</p>
    <div className="w-40 h-1 bg-zinc-200 rounded-full overflow-hidden mt-5">
      <div className="h-full w-1/3 bg-zinc-800 rounded-full animate-pulse" />
    </div>
  </div>
);

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
    return <Suspense fallback={<AuthRouteFallback />}><SplashScreen onComplete={completeSplashScreen} /></Suspense>;
  }

  // REHYDRATION LIFECYCLE: Prevents UI flicker while reading session from persistent storage
  if (isRehydrating) {
    return <AuthSkeleton />;
  }

  // Supabase password-recovery links return an authenticated recovery session.
  if (isPasswordRecovery) {
    return <Suspense fallback={<AuthRouteFallback />}><AuthScreen initialMode="login" draftProfile={draftProfile} /></Suspense>;
  }

  // STEP 2: PROFILE CREATION STATE (For new unauthenticated users before credentials handshake)
  if (!hasValidSession && !hasCompletedProfileSetup) {
    return (
      <Suspense fallback={<AuthRouteFallback />}>
        <ProfileCreationStep
          initialData={draftProfile || undefined}
          onComplete={saveDraftProfile}
          onAlreadyHaveAccount={skipToAuth}
        />
      </Suspense>
    );
  }

  // STEP 3: SIGN UP / SIGN IN AUTHENTICATION HANDSHAKE
  if (!hasValidSession) {
    const isSignup = currentPath === '/signup' || Boolean(draftProfile);
    return (
      <Suspense fallback={<AuthRouteFallback />}>
        <AuthScreen
          initialMode={isSignup ? 'signup' : 'login'}
          draftProfile={draftProfile}
        />
      </Suspense>
    );
  }

  // STEP 4: MAIN WORKSPACE / DASHBOARD (+ STEP 5: PAID FEATURE GATING)
  return <>{children}</>;
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthGuard>{children}</AuthGuard>;
};
