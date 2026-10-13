import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  LogOut,
  ChevronDown,
  Settings,
  X,
  CreditCard,
  Sparkles,
  AlertTriangle,
  GraduationCap,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const UserProfileDropdown: React.FC = () => {
  const {
    user,
    openSubscriptionModal,
    openStudentVerificationModal,
    openLogoutModal,
    restartOnboarding,
    expireSession,
    isProfileDrawerOpen,
    openProfileDrawer,
    closeProfileDrawer,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  if (!user) return null;

  const tier = user.subscriptionTier;
  const tierLabel =
    tier === 'student'
      ? 'Student Plan'
      : tier === 'base'
      ? 'Featured Base'
      : tier === 'pro'
      ? 'Pro Studio'
      : 'Starter';

  const studentStatus = user.student_verification_status || 'none';
  const isStudentVerified = studentStatus === 'verified';
  const isStudentPending = studentStatus === 'pending';

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      openProfileDrawer();
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative font-sans antialiased" ref={dropdownRef}>
      {/* Profile Trigger Button in Header (minimum 44-48px touch target) */}
      <button
        type="button"
        onClick={handleToggle}
        className="min-h-[44px] min-w-[44px] p-1 sm:px-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/80 transition-all flex items-center gap-2 group active:scale-[0.98] shadow-xs"
        title="Account & Subscription"
        aria-label="User Account Menu"
      >
        <div className="relative">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-lg object-cover ring-1 ring-zinc-200"
          />
          {isStudentVerified ? (
            <span
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white"
              title="Verified Student"
            >
              <span className="text-[7px] font-black leading-none">🎓</span>
            </span>
          ) : (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                tier === 'student'
                  ? 'bg-emerald-500'
                  : tier === 'base'
                  ? 'bg-zinc-900'
                  : tier === 'pro'
                  ? 'bg-indigo-600'
                  : 'bg-zinc-400'
              }`}
            />
          )}
        </div>

        {/* User Info (Hidden on mobile small screen) */}
        <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-800 truncate max-w-[110px]">
              {user.name}
            </span>
            {isStudentVerified && (
              <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">
                Student
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">{tierLabel}</span>
        </div>

        <ChevronDown
          size={14}
          className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Desktop Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="hidden md:block absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-zinc-200 shadow-xl z-[550] overflow-hidden"
          >
            {/* Header User Card */}
            <div className="p-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-zinc-900 truncate">{user.name}</h4>
                    {isStudentVerified && (
                      <span title="Verified Student" className="inline-flex">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  <span className="inline-block mt-0.5 text-[10px] font-medium text-zinc-500 truncate">
                    {user.institution_name ? `${user.role} · ${user.institution_name}` : user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Subscription Tier Summary */}
            <div className="p-3.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Plan</span>
                <span className="text-xs font-bold text-zinc-900">{tierLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openSubscriptionModal();
                }}
                className="min-h-[34px] px-3 rounded-lg bg-zinc-900 hover:bg-black text-white text-[11px] font-semibold transition-colors"
              >
                {tier === 'base' || tier === 'student' ? 'Plan Specs' : 'Upgrade'}
              </button>
            </div>

            {/* Student Verification Quick Banner in Dropdown */}
            <div
              className={`px-3.5 py-2.5 border-b flex items-center justify-between text-xs ${
                isStudentVerified
                  ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900'
                  : isStudentPending
                  ? 'bg-amber-50/60 border-amber-100 text-amber-900'
                  : 'bg-zinc-50/70 border-zinc-100 text-zinc-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <GraduationCap
                  size={15}
                  className={
                    isStudentVerified
                      ? 'text-emerald-700'
                      : isStudentPending
                      ? 'text-amber-600'
                      : 'text-zinc-500'
                  }
                />
                <span className="text-[11px] font-semibold">
                  {isStudentVerified
                    ? 'Verified Student (50% Off)'
                    : isStudentPending
                    ? 'Student Review Pending'
                    : 'Student? Get 50% Off'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openStudentVerificationModal();
                }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                  isStudentVerified
                    ? 'bg-emerald-200/80 text-emerald-900 hover:bg-emerald-300'
                    : isStudentPending
                    ? 'bg-amber-200/80 text-amber-900 hover:bg-amber-300'
                    : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
                }`}
              >
                {isStudentVerified ? 'Status' : isStudentPending ? 'Check' : 'Verify'}
              </button>
            </div>

            {/* Actions */}
            <div className="p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openSubscriptionModal();
                }}
                className="w-full min-h-[40px] px-3 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2 text-left"
              >
                <CreditCard size={14} className="text-zinc-500" />
                <span>Plans & Pricing (₹)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openStudentVerificationModal();
                }}
                className="w-full min-h-[40px] px-3 rounded-lg text-xs font-medium text-emerald-800 hover:bg-emerald-50/60 transition-colors flex items-center gap-2 text-left"
              >
                <GraduationCap size={14} className="text-emerald-600" />
                <span>Student Verification Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  restartOnboarding();
                }}
                className="w-full min-h-[40px] px-3 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2 text-left"
              >
                <Settings size={14} className="text-zinc-500" />
                <span>Revisit Onboarding</span>
              </button>

              <div className="h-px bg-zinc-100 my-1" />

              {/* Edge Case Test: Simulate 401 Expiry */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  expireSession('Session expired (401 Unauthorized test). Please log in again.');
                }}
                className="w-full min-h-[38px] px-3 rounded-lg text-[11px] font-medium text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-2 text-left"
                title="Test 401/403 session expiration and redirect guard"
              >
                <AlertTriangle size={13} className="text-amber-500" />
                <span>Simulate 401 Expiry</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openLogoutModal();
                }}
                className="w-full min-h-[40px] px-3 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 text-left"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Slide-Up Drawer / Bottom Sheet */}
      <AnimatePresence>
        {isProfileDrawerOpen && (
          <div className="fixed inset-0 z-[1200] md:hidden font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProfileDrawer}
              className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs"
            />

            {/* Slide-Up Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl border-t border-zinc-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3 shrink-0" />

              {/* Drawer Header */}
              <div className="p-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-2xl object-cover ring-1 ring-zinc-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-900">{user.name}</h3>
                      {isStudentVerified && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Student
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                    <span className="text-[11px] font-medium text-zinc-500">
                      {user.institution_name ? `${user.role} · ${user.institution_name}` : user.role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeProfileDrawer}
                  className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center min-h-[44px] min-w-[44px]"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Active Plan Card */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Active Plan</span>
                    <span className="text-sm font-bold text-zinc-900">{tierLabel}</span>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {tier === 'student'
                        ? '20 GB Storage · 50% Academic Discount'
                        : tier === 'base'
                        ? '15 GB Storage · Unlimited Audio'
                        : 'Personal Starter'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openSubscriptionModal}
                    className="min-h-[48px] px-4 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
                  >
                    {tier === 'base' || tier === 'student' ? 'Plan Details' : 'Upgrade Plan'}
                  </button>
                </div>

                {/* Student Verification Mobile Card */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    isStudentVerified
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : isStudentPending
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap
                      size={18}
                      className={
                        isStudentVerified
                          ? 'text-emerald-700'
                          : isStudentPending
                          ? 'text-amber-600'
                          : 'text-zinc-600'
                      }
                    />
                    <div>
                      <span className="text-xs font-bold block">
                        {isStudentVerified
                          ? 'Student Status Verified'
                          : isStudentPending
                          ? 'Verification In Review'
                          : 'Student Subscription (50% Off)'}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {isStudentVerified
                          ? '50% Discount applied to Student Plan'
                          : isStudentPending
                          ? 'Review turnaround < 24 hours'
                          : 'Verify university ID or .edu email'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      closeProfileDrawer();
                      openStudentVerificationModal();
                    }}
                    className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                      isStudentVerified
                        ? 'bg-emerald-700 text-white'
                        : isStudentPending
                        ? 'bg-amber-600 text-white'
                        : 'bg-zinc-900 text-white'
                    }`}
                  >
                    {isStudentVerified ? 'Status' : isStudentPending ? 'Check' : 'Verify'}
                  </button>
                </div>

                {/* Navigation items (all >= 48px touch targets) */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={openSubscriptionModal}
                    className="w-full min-h-[48px] px-4 rounded-xl text-xs font-medium text-zinc-800 hover:bg-zinc-50 border border-zinc-200 flex items-center justify-between"
                  >
                    <span>Plans & Pricing (₹)</span>
                    <span className="text-zinc-400">›</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeProfileDrawer();
                      openStudentVerificationModal();
                    }}
                    className="w-full min-h-[48px] px-4 rounded-xl text-xs font-medium text-emerald-800 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-200/70 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap size={16} className="text-emerald-700" />
                      <span>Student Verification Portal</span>
                    </div>
                    <span className="text-emerald-600 font-bold text-xs">50% Off</span>
                  </button>

                  <button
                    type="button"
                    onClick={restartOnboarding}
                    className="w-full min-h-[48px] px-4 rounded-xl text-xs font-medium text-zinc-800 hover:bg-zinc-50 border border-zinc-200 flex items-center justify-between"
                  >
                    <span>Revisit Onboarding Wizard</span>
                    <span className="text-zinc-400">›</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeProfileDrawer();
                      expireSession('Session expired (401 Unauthorized test). Please log in again.');
                    }}
                    className="w-full min-h-[48px] px-4 rounded-xl text-xs font-medium text-amber-800 bg-amber-50/50 hover:bg-amber-50 border border-amber-200/80 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="text-amber-600" />
                      <span>Test 401 Session Expiry</span>
                    </div>
                    <span className="text-amber-500 text-xs">Simulate</span>
                  </button>
                </div>

                {/* Sign Out */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={openLogoutModal}
                    className="w-full min-h-[48px] px-4 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50/50 hover:bg-rose-50 border border-rose-200/80 flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    <span>Log Out of Vocal Note</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
