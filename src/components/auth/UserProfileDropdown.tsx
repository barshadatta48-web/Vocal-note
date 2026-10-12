import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, Sparkles, Zap, ChevronDown, CheckCircle2, Shield, Settings, X, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const UserProfileDropdown: React.FC = () => {
  const {
    user,
    openSubscriptionModal,
    openLogoutModal,
    restartOnboarding,
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
    tier === 'base' ? 'Featured Base' : tier === 'pro' ? 'Pro Studio' : 'Free Starter';
  const tierColor =
    tier === 'base'
      ? 'bg-teal-100 text-teal-800 border-teal-200'
      : tier === 'pro'
      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      openProfileDrawer();
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Profile Trigger Button in Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="min-h-[38px] sm:min-h-[42px] p-1 sm:p-1.5 md:pr-3 rounded-full md:rounded-2xl bg-white/70 hover:bg-white border border-black/5 hover:border-black/10 transition-all flex items-center gap-2 group active:scale-95 shadow-xs"
        title="Account & Subscription"
        aria-label="User Account Menu"
      >
        <div className="relative">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-teal-500/30"
          />
          {tier === 'base' && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 border-2 border-white rounded-full shadow-xs"
              title="Featured Base Plan Active"
            />
          )}
        </div>

        <div className="hidden md:flex flex-col items-start text-left leading-none">
          <span className="text-[11px] font-black text-slate-800 truncate max-w-[100px]">
            {user.name.split(' ')[0]}
          </span>
          <span className="text-[9px] font-bold text-teal-700 tracking-wider uppercase mt-0.5">
            {tier === 'base' ? 'Base Tier' : tier.toUpperCase()}
          </span>
        </div>

        <ChevronDown
          size={14}
          className="hidden md:block text-slate-400 group-hover:text-slate-700 transition-transform duration-200"
        />
      </button>

      {/* Desktop Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="hidden md:block absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/10 z-[1000] overflow-hidden text-slate-800"
          >
            {/* Header User Summary */}
            <div className="p-4 bg-slate-50/90 border-b border-black/5">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-slate-900 truncate">{user.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-md">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Subscription Badge Card */}
            <div className="p-3.5 border-b border-black/5 bg-gradient-to-r from-teal-50/50 via-white to-indigo-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Subscription Tier</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${tierColor}`}>
                      {tierLabel}
                    </span>
                    {tier === 'base' && <Sparkles size={13} className="text-amber-500" />}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openSubscriptionModal();
                  }}
                  className="min-h-[34px] px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1 active:scale-95"
                >
                  <CreditCard size={12} />
                  <span>{tier === 'base' ? 'Plan Details' : 'Upgrade'}</span>
                </button>
              </div>

              {tier === 'base' && (
                <p className="text-[11px] text-teal-800 font-medium mt-2 leading-tight">
                  ✓ 15 GB Cloud Storage Active · Unlimited Voice Dictation
                </p>
              )}
            </div>

            {/* Actions list */}
            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openSubscriptionModal();
                }}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100/80 transition-colors flex items-center gap-2.5 text-left"
              >
                <Zap size={15} className="text-teal-600" />
                <span>Featured Base Pricing & Plans</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  restartOnboarding();
                }}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100/80 transition-colors flex items-center gap-2.5 text-left"
              >
                <Settings size={15} className="text-slate-500" />
                <span>Review Workspace Preferences</span>
              </button>

              <div className="h-px bg-slate-100 my-1" />

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openLogoutModal();
                }}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2.5 text-left"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Slide-Out Drawer / Modal Sheet */}
      <AnimatePresence>
        {isProfileDrawerOpen && (
          <div className="fixed inset-0 z-[1200] md:hidden font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProfileDrawer}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Slide-Up / Slide-In Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-3xl shadow-2xl border-t border-black/10 overflow-hidden flex flex-col"
            >
              {/* Drawer Handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3" />

              {/* Header */}
              <div className="px-5 pb-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-teal-500/20"
                  />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{user.name}</h3>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={closeProfileDrawer}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Subscription Tier Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/80 via-white to-indigo-50/80 border border-teal-200/80 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Tier</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${tierColor}`}>
                          {tierLabel}
                        </span>
                        {tier === 'base' && <Sparkles size={14} className="text-amber-500" />}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={openSubscriptionModal}
                      className="min-h-[44px] px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95"
                    >
                      {tier === 'base' ? 'Plan Specs' : 'Upgrade Plan'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 mt-2.5">
                    {tier === 'base'
                      ? '✓ 15 GB Cloud Storage Active · Unlimited Voice Dictation'
                      : 'Upgrade to Featured Base for unlimited audio and cloud backups.'}
                  </p>
                </div>

                {/* Quick actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={openSubscriptionModal}
                    className="w-full min-h-[46px] px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap size={16} className="text-teal-600" />
                      <span>Featured Base Subscription (₹ Pricing)</span>
                    </div>
                    <span className="text-slate-400">›</span>
                  </button>

                  <button
                    type="button"
                    onClick={restartOnboarding}
                    className="w-full min-h-[46px] px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings size={16} className="text-slate-600" />
                      <span>Revisit Onboarding & Setup</span>
                    </div>
                    <span className="text-slate-400">›</span>
                  </button>
                </div>

                {/* Sign out */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={openLogoutModal}
                    className="w-full min-h-[48px] px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Sign Out of Vocal Note</span>
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
