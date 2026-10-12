import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, ChevronDown, Settings, X, CreditCard, Sparkles } from 'lucide-react';
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
    tier === 'base' ? 'Featured Base' : tier === 'pro' ? 'Pro Studio' : 'Starter';

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
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-1 ring-zinc-200"
          />
          {tier === 'base' && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-zinc-900 border border-white rounded-full"
              title="Featured Base Plan Active"
            />
          )}
        </div>

        <div className="hidden md:flex flex-col items-start text-left leading-none">
          <span className="text-xs font-semibold text-zinc-900 truncate max-w-[100px]">
            {user.name.split(' ')[0]}
          </span>
          <span className="text-[10px] font-medium text-zinc-400 mt-0.5">
            {tier === 'base' ? 'Base Tier' : tierLabel}
          </span>
        </div>

        <ChevronDown
          size={13}
          className="hidden md:block text-zinc-400 group-hover:text-zinc-700 transition-colors"
        />
      </button>

      {/* Desktop Minimal Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="hidden md:block absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-md border border-zinc-200/80 z-[1000] overflow-hidden text-zinc-900"
          >
            {/* Header User Summary */}
            <div className="p-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-200"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-zinc-900 truncate">{user.name}</h4>
                  <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-medium text-zinc-500">
                    {user.role}
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
                {tier === 'base' ? 'Plan Specs' : 'Upgrade'}
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
                <span>Featured Base Pricing (₹)</span>
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

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl border-t border-zinc-200/80 shadow-lg overflow-hidden flex flex-col"
            >
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto my-3" />

              <div className="px-5 pb-4 flex items-center justify-between border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-11 h-11 rounded-xl object-cover ring-1 ring-zinc-200"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">{user.name}</h3>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={closeProfileDrawer}
                  className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-700 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Active Plan Card */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Active Plan</span>
                    <span className="text-sm font-bold text-zinc-900">{tierLabel}</span>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {tier === 'base' ? '15 GB Storage · Unlimited Audio' : 'Personal Starter'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openSubscriptionModal}
                    className="min-h-[48px] px-4 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
                  >
                    {tier === 'base' ? 'Plan Details' : 'Upgrade Plan'}
                  </button>
                </div>

                {/* Navigation items (all >= 48px touch targets) */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={openSubscriptionModal}
                    className="w-full min-h-[48px] px-4 rounded-xl text-xs font-medium text-zinc-800 hover:bg-zinc-50 border border-zinc-200 flex items-center justify-between"
                  >
                    <span>Featured Base Subscription (₹)</span>
                    <span className="text-zinc-400">›</span>
                  </button>

                  <button
                    type="button"
                    onClick={restartOnboarding}
                    className="w-full min-h-[48px] px-4 rounded-xl text-xs font-medium text-zinc-800 hover:bg-zinc-50 border border-zinc-200 flex items-center justify-between"
                  >
                    <span>Revisit Onboarding Wizard</span>
                    <span className="text-zinc-400">›</span>
                  </button>
                </div>

                {/* Sign Out */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={openLogoutModal}
                    className="w-full min-h-[48px] px-4 bg-zinc-100 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-200 transition-colors"
                  >
                    <LogOut size={15} />
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
