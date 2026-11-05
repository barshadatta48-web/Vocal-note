import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, Check, AlertCircle, X, Info, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { DraftProfile } from '../../types/auth';

export interface AuthScreenProps {
  initialMode?: 'login' | 'signup';
  draftProfile?: DraftProfile | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  draftProfile,
}) => {
  const { login, signup, socialLogin, sendPasswordReset, updatePassword, isPasswordRecovery, notification, clearNotification } = useAuth();
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
    if (newMode === 'signup') {
      setName('');
    }
    navigate(newMode === 'signup' ? '/signup' : '/login');
  };

  const validate = (): boolean => {
    const nextErrors: { name?: string; email?: string; password?: string } = {};

    if (isPasswordRecovery) {
      if (password.length < 8) nextErrors.password = 'Use at least 8 characters for your new password.';
      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    }

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
      if (isPasswordRecovery) {
        await updatePassword(password);
        navigate('/dashboard', { replace: true });
      } else if (mode === 'login') {
        await login(email, password, rememberMe);
        navigate('/dashboard', { replace: true });
      } else {
        const authenticated = await signup(name, email, password);
        if (authenticated) navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Authentication failed. Please verify your credentials.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'github') => {
    setIsSubmitting(true);
    setErrors({});
    try {
      await socialLogin(provider);
      // Supabase redirects the browser to Google/GitHub; do not navigate before OAuth returns.
    } catch (err: any) {
      setErrors({ general: err?.message || 'Social authentication failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-between font-sans antialiased text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Header Bar */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between border-b border-zinc-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
            V
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900">
            VocalNote
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
            Step 3 of 5 · Authentication
          </span>
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
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Draft profile indicator if user prepared profile in Step 2 */}
          {draftProfile && mode === 'signup' && (
            <div className="mb-5 p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-3">
              <img
                src={draftProfile.avatar}
                alt={name.trim() || draftProfile.name || 'User'}
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-200"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-900 truncate">
                  {name.trim() || draftProfile.name || 'Your Profile'}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{draftProfile.role}</div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Profile Ready
              </span>
            </div>
          )}

          {/* Header Copy */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              {isPasswordRecovery ? 'Choose a new password' : mode === 'login' ? 'Sign in to Vocal Note' : 'Create your account'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              {isPasswordRecovery ? 'Enter a new password for your account.' : mode === 'login'
                ? 'Enter your credentials to access your audio workspace.'
                : 'Link your credentials to save and sync your vocal collection.'}
            </p>
          </div>

          {!isPasswordRecovery && (
          <>
          {/* Social Auth Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocial('google')}
              disabled={isSubmitting}
              className="min-h-[48px] px-3.5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/70 text-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocial('github')}
              disabled={isSubmitting}
              className="min-h-[48px] px-3.5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/70 text-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-zinc-900" viewBox="0 0 24 24">
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
          </>
          )}

          {/* Form with edge-to-edge inputs */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  placeholder="e.g. Alex Rivera"
                  className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border ${
                    errors.name ? 'border-rose-400 focus:ring-1 focus:ring-rose-400' : 'border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                  } text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all`}
                />
                {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name}</p>}
              </div>
            )}

            {!isPasswordRecovery && (
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

            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  {isPasswordRecovery ? 'New Password' : 'Password'}
                </label>
                {mode === 'login' && !isPasswordRecovery && (
                  <button
                    type="button"
                    onClick={async () => {
                      setErrors({});
                      try {
                        await sendPasswordReset(email);
                        setErrors({ general: 'If an account exists for this email, a password reset link has been sent.' });
                      } catch (err: any) {
                        setErrors({ general: err?.message || 'Could not send the password reset email.' });
                      }
                    }}
                    disabled={isSubmitting}
                    className="text-[11px] text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
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
            {!isPasswordRecovery && <div className="pt-1 flex items-center justify-between">
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
            </div>}

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
                    <span>{isPasswordRecovery ? 'Update Password' : mode === 'login' ? 'Sign In' : 'Create Account & Continue'}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Switch mode footer */}
          {!isPasswordRecovery && <div className="mt-6 pt-5 border-t border-zinc-100 text-center">
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
          </div>}
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
