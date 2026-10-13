import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, Check, AlertCircle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';

export interface AuthScreenProps {
  initialMode?: 'login' | 'signup';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ initialMode = 'login' }) => {
  const { login, signup, socialLogin, notification, clearNotification } = useAuth();
  const { navigate } = useAppRouter();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync mode if initialMode prop changes from router
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrors({});
    navigate(newMode === 'signup' ? '/signup' : '/login');
  };

  const validate = (): boolean => {
    const nextErrors: { name?: string; email?: string; password?: string } = {};

    if (mode === 'signup' && !name.trim()) {
      nextErrors.name = 'Please enter your name';
    }

    if (!email.trim()) {
      nextErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Please enter a password';
    } else if (password.length < 6) {
      nextErrors.password = 'Must be at least 6 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      if (mode === 'login') {
        // Sequential handshake: user credentials verified & session stored atomically
        await login(email, password, rememberMe);
      } else {
        // Brand-new registration handshake: stores session & forces mandatory onboarding
        await signup(name, email, password);
      }
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Authentication failed. Please check your credentials.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      await login('dattabarsha9@gmail.com', 'demoPass123', true);
    } catch (err: any) {
      setErrors({ general: err?.message || 'Demo access failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'github') => {
    setIsSubmitting(true);
    setErrors({});
    try {
      await socialLogin(provider);
    } catch (err: any) {
      setErrors({ general: err?.message || 'Social authentication failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-between text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      {/* Top Minimal Navigation Bar */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-5 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
            V
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900">
            Vocal Note
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={isSubmitting}
            className="min-h-[48px] px-4 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 transition-colors flex items-center gap-1.5"
          >
            <span>Demo Access</span>
          </button>
        </div>
      </header>

      {/* Main Centered Content Area */}
      <main className="w-full max-w-md mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        {/* Floating Minimalist Card on PC / Clean edge-to-edge layout on Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white sm:rounded-3xl border border-zinc-200/70 sm:shadow-xs p-6 sm:p-9 rounded-2xl"
        >
          {/* Notification Banner for Session Expiry / 401 Alerts */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-2.5 ${
                  notification.type === 'warning' || notification.type === 'error'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="font-medium leading-relaxed">{notification.message}</p>
                </div>
                <button
                  type="button"
                  onClick={clearNotification}
                  className="text-zinc-400 hover:text-zinc-700 p-0.5 rounded-md transition-colors"
                  aria-label="Dismiss notice"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* General Submission Error Banner */}
          {errors.general && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Header Typography */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              {mode === 'login' ? 'Sign in to Vocal Note' : 'Create your account'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 leading-relaxed">
              {mode === 'login'
                ? 'Welcome back. Enter your credentials to access your notes.'
                : 'Experience voice-first thinking with scoped audio dictation.'}
            </p>
          </div>

          {/* Segmented Mode Selector */}
          <div className="p-1 bg-zinc-100 rounded-xl mb-6 flex items-center border border-zinc-200/50">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 min-h-[44px] text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
                mode === 'login'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 min-h-[44px] text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
                mode === 'signup'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            <button
              type="button"
              onClick={() => handleSocial('google')}
              disabled={isSubmitting}
              className="min-h-[48px] px-3 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-xl text-zinc-700 text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocial('github')}
              disabled={isSubmitting}
              className="min-h-[48px] px-3 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-xl text-zinc-700 text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-xs"
            >
              <svg className="w-4 h-4 shrink-0 text-zinc-900" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200/70" />
            </div>
            <span className="relative px-3 bg-white text-[11px] font-medium text-zinc-400">
              or continue with email
            </span>
          </div>

          {/* Form with edge-to-edge inputs */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Barsha Datta"
                  className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border ${
                    errors.name ? 'border-rose-400 focus:ring-1 focus:ring-rose-400' : 'border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                  } text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all`}
                />
                {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`w-full min-h-[48px] pl-3.5 pr-10 rounded-xl bg-white border ${
                    errors.email ? 'border-rose-400 focus:ring-1 focus:ring-rose-400' : 'border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                  } text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all`}
                />
                <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
              {errors.email && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  Password
                </label>
                {mode === 'login' && (
                  <span className="text-[11px] text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full min-h-[48px] pl-3.5 pr-10 rounded-xl bg-white border ${
                    errors.password ? 'border-rose-400 focus:ring-1 focus:ring-rose-400' : 'border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                  } text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.password}</p>}
            </div>

            {/* Remember Me Toggle */}
            <div className="pt-1 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-0 border-zinc-300 accent-zinc-900"
                />
                <span className="text-xs text-zinc-600 font-medium">Keep me signed in</span>
              </label>

              <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>256-bit encrypted</span>
              </div>
            </div>

            {/* Sticky / Full-width Primary Action Button (>= 48px touch target) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] px-4 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account & Continue'}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Switch mode footer */}
          <div className="mt-6 pt-5 border-t border-zinc-100 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-zinc-500">
                New to Vocal Note?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-semibold text-zinc-900 hover:underline ml-0.5"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-zinc-900 hover:underline ml-0.5"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer info */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-6 text-center text-xs text-zinc-400">
        <p>Private & Client-Side Encrypted · Vocal Note v2.4</p>
      </footer>
    </div>
  );
};

export const LoginForm = AuthScreen;
