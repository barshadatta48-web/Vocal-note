import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles, CheckCircle2, Shield, Mic, StickyNote, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

export const LoginForm: React.FC = () => {
  const { login, signup, socialLogin } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: { name?: string; email?: string; password?: string } = {};

    if (mode === 'signup' && !name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password, rememberMe);
      } else {
        await signup(name, email, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    try {
      await login('dattabarsha9@gmail.com', 'password123', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'github') => {
    setIsSubmitting(true);
    try {
      await socialLogin(provider);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-teal-50/40 to-indigo-50/50 flex items-center justify-center p-3 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Subtle Background Glow Spheres */}
      <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] bg-teal-300/25 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-300/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[350px] h-[350px] bg-amber-200/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Container Card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-5xl bg-white/80 backdrop-blur-2xl rounded-3xl sm:rounded-[32px] border border-white/60 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08),0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10"
      >
        {/* Left Side: Artistic Brand & Visual Panel (Desktop only or header banner on mobile) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-teal-700 via-teal-800 to-indigo-950 p-6 sm:p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Decorative artistic gradient blobs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Identity */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                <StickyNote className="w-6 h-6 text-teal-200" />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black tracking-tight leading-none block">
                  <span className="text-teal-300">Vocal</span>
                  <span className="text-white">Note</span>
                </span>
                <span className="text-[10px] font-bold text-teal-200/70 uppercase tracking-widest block mt-0.5">
                  Voice-First Studio
                </span>
              </div>
            </div>

            <div className="mt-8 sm:mt-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-teal-100 mb-4">
                <Sparkles size={12} className="text-amber-300" />
                <span>Next-Gen Speech & Canvas</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                Capture thoughts at the speed of speech.
              </h2>
              <p className="mt-3 text-sm text-teal-100/80 leading-relaxed font-normal">
                Seamless voice dictation, fluid freeform sketching, and tactile sticky notes designed for focused creators.
              </p>
            </div>
          </div>

          {/* Interactive Feature Pills / Glass Cards */}
          <div className="my-8 hidden sm:grid grid-cols-1 gap-3 relative z-10">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/30 flex items-center justify-center text-teal-200 shrink-0">
                <Mic size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Scoped Voice Dictation</p>
                <p className="text-[11px] text-teal-100/70">Real-time local speech streaming with zero lag</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/30 flex items-center justify-center text-amber-200 shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Featured Base Storage</p>
                <p className="text-[11px] text-teal-100/70">Automatic offline caching with multi-device backup</p>
              </div>
            </div>
          </div>

          {/* Bottom Security / Trust indicator */}
          <div className="pt-4 border-t border-white/15 flex items-center justify-between text-xs text-teal-200/70 relative z-10">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-teal-300" />
              <span>Private & Client-Encrypted</span>
            </div>
            <span>v2.4 Active</span>
          </div>
        </div>

        {/* Right Side: Clean Glass Card Authentication Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-center bg-white/60 backdrop-blur-xl">
          <div className="max-w-md w-full mx-auto">
            {/* Header / Mode Switcher */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {mode === 'login' ? 'Welcome back' : 'Create an account'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {mode === 'login'
                    ? 'Enter your credentials to access your notes'
                    : 'Start organizing thoughts with effortless voice notes'}
                </p>
              </div>
            </div>

            {/* Segmented Mode Control */}
            <div className="flex items-center p-1 bg-slate-100/80 rounded-xl mb-6 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all min-h-[40px] flex items-center justify-center ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrors({});
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all min-h-[40px] flex items-center justify-center ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Social Authentication Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleSocial('google')}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 text-xs sm:text-sm font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
                className="min-h-[44px] px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 text-xs sm:text-sm font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative px-3 bg-white/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Or continue with email
              </span>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Barsha Datta"
                      className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-50/80 border ${
                        errors.name ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'
                      } text-slate-800 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400`}
                    />
                  </div>
                  {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`w-full min-h-[46px] pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50/80 border ${
                      errors.email ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'
                    } text-slate-800 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400`}
                  />
                </div>
                {errors.email && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => alert('Password reset link simulated. Please use the quick demo sign-in or any email/password.')}
                      className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className={`w-full min-h-[46px] pl-10 pr-11 py-2.5 rounded-xl bg-slate-50/80 border ${
                      errors.password ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'
                    } text-slate-800 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.password}</p>}
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium">Remember me for 30 days</span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] px-6 py-3 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 mt-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In to Vocal Note' : 'Create Account & Continue'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* 1-Click Fast Demo Login for instant review */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <Sparkles size={14} className="text-teal-600" />
                  <span>One-Click Demo Sign In (Instant Access)</span>
                </button>
              </div>
            </form>

            <div className="mt-8 text-center text-xs text-slate-500">
              {mode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrors({});
                    }}
                    className="font-bold text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    Sign up now
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrors({});
                    }}
                    className="font-bold text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    Log in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
