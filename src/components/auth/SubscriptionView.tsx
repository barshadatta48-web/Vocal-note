import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  Lock,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SubscriptionTier, BillingCycle } from '../../types/auth';

export const SubscriptionView: React.FC = () => {
  const {
    user,
    isSubscriptionModalOpen,
    closeSubscriptionModal,
    upgradeSubscription,
    openStudentVerificationModal,
    gatedFeatureContext,
    clearGatedFeatureContext,
  } = useAuth();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('dattabarsha@okhdfcbank');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  if (!isSubscriptionModalOpen) return null;

  const currentTier = user?.subscriptionTier || 'free';
  const studentStatus = user?.student_verification_status || 'none';
  const isStudentVerified = studentStatus === 'verified';
  const isStudentPending = studentStatus === 'pending';

  const handleSelect = (tier: SubscriptionTier) => {
    if (tier === currentTier) return;

    // Student plan gate check
    if (tier === 'student') {
      if (!isStudentVerified) {
        // Automatically trigger verification workflow
        closeSubscriptionModal();
        openStudentVerificationModal();
        return;
      }
    }

    setSelectedTier(tier);
    setCheckoutStep('checkout');
  };

  const handleAuthorizePayment = async () => {
    if (!selectedTier) return;
    setIsAuthorizing(true);
    await new Promise((res) => setTimeout(res, 750));
    setIsAuthorizing(false);
    const success = upgradeSubscription(selectedTier, billingCycle);
    if (success) {
      setCheckoutStep('success');
    }
  };

  const handleClose = () => {
    clearGatedFeatureContext();
    setCheckoutStep('plans');
    setSelectedTier(null);
    closeSubscriptionModal();
  };

  const getPrice = (tier: SubscriptionTier) => {
    if (tier === 'free') return 0;
    if (tier === 'student') return billingCycle === 'annual' ? 149 : 199;
    if (tier === 'base') return billingCycle === 'annual' ? 399 : 499;
    return billingCycle === 'annual' ? 799 : 999;
  };

  const getPlanName = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'student':
        return 'Student Plan (Verified Academic)';
      case 'base':
        return 'Featured Base Tier';
      case 'pro':
        return 'Pro Studio Tier';
      default:
        return 'Starter Plan';
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans antialiased text-zinc-900">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs"
      />

      {/* Main Container: Mobile Bottom-Sheet, PC Centered Modal */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-5xl bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200/80 shadow-2xl relative z-10 max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Top Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-500">
                Workspace Subscription Plans
              </span>
              <span className="text-zinc-300">·</span>
              <span className="text-[11px] font-semibold text-zinc-400">INR (₹)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 mt-0.5">
              {checkoutStep === 'plans'
                ? 'Choose your workspace plan'
                : checkoutStep === 'checkout'
                ? 'Confirm activation'
                : 'Plan activated'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-5 sm:px-8 py-5 sm:py-6 overflow-y-auto flex-1 space-y-6">
          {checkoutStep === 'plans' && (
            <div className="space-y-6">
              {/* Contextual Gated Feature Alert Banner */}
              {gatedFeatureContext && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/90 text-indigo-950 text-xs flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <span className="font-bold block">Unlock {gatedFeatureContext}</span>
                      <span className="text-[11px] text-indigo-700">
                        Choose Featured Base or the discounted Student Plan (₹149/mo) to activate full access.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearGatedFeatureContext}
                    className="p-1 text-indigo-400 hover:text-indigo-800 rounded-lg transition-colors"
                    aria-label="Dismiss banner"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Student Status Quick Notification Bar */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between flex-wrap gap-3 transition-colors ${
                  isStudentVerified
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : isStudentPending
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isStudentVerified
                        ? 'bg-emerald-600 text-white'
                        : isStudentPending
                        ? 'bg-amber-500 text-white'
                        : 'bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <GraduationCap size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">
                        {isStudentVerified
                          ? 'Student Status Verified · 50% Discount Applied'
                          : isStudentPending
                          ? 'Student Verification In Review (Pending)'
                          : 'Are you an active college or school student?'}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isStudentVerified
                            ? 'bg-emerald-200 text-emerald-800'
                            : isStudentPending
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        {studentStatus.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {isStudentVerified
                        ? `Verified for ${user?.institution_name || 'Academic Institution'}. Student Plan is unlocked for checkout at ₹149/mo.`
                        : isStudentPending
                        ? 'Your credentials are being reviewed by the automated queue. You can check status anytime.'
                        : 'Verify your institutional .edu email or student ID card to unlock the Student Plan at 50% off.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    closeSubscriptionModal();
                    openStudentVerificationModal();
                  }}
                  className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs shrink-0 ${
                    isStudentVerified
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : isStudentPending
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-zinc-900 hover:bg-black text-white'
                  }`}
                >
                  <GraduationCap size={14} />
                  <span>{isStudentVerified ? 'View Student Credentials' : isStudentPending ? 'Check Verification' : 'Verify Student ID'}</span>
                </button>
              </div>

              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center">
                <div className="p-1 bg-zinc-100 rounded-xl flex items-center border border-zinc-200/60">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`min-h-[44px] px-4 rounded-lg text-xs font-semibold transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`min-h-[44px] px-4 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      billingCycle === 'annual'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-white">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid: Responsive 4-Column Grid on Desktop, Clean Stack on Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                {/* 1. Free Starter */}
                <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 flex flex-col justify-between hover:border-zinc-300 transition-colors">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-zinc-900">Starter</h3>
                      {currentTier === 'free' && (
                        <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-normal">
                      For basic personal notes and light dictation.
                    </p>

                    <div className="my-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold tracking-tight text-zinc-900">₹0</span>
                        <span className="text-xs text-zinc-400">/ mo</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Free forever</span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-zinc-600 border-t border-zinc-100 pt-3">
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>15 Vocal Notes & sketches</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>Voice dictation up to 2 min/note</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>500 MB local cache</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>Standard community web support</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-2">
                    <button
                      type="button"
                      disabled={currentTier === 'free'}
                      onClick={() => handleSelect('free')}
                      className={`w-full min-h-[48px] rounded-xl text-xs font-semibold border transition-all ${
                        currentTier === 'free'
                          ? 'bg-zinc-50 text-zinc-400 border-zinc-200 cursor-default'
                          : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {currentTier === 'free' ? 'Active' : 'Downgrade to Starter'}
                    </button>
                  </div>
                </div>

                {/* 2. NEW STUDENT PLAN TIER (Discounted & Exclusively Gated) */}
                <div
                  className={`relative rounded-2xl p-5 border-2 flex flex-col justify-between transition-all ${
                    isStudentVerified
                      ? 'bg-emerald-50/20 border-emerald-500 shadow-sm'
                      : 'bg-white border-emerald-500/50 hover:border-emerald-600'
                  }`}
                >
                  {/* Student Tag */}
                  <div className="absolute -top-3 left-4">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                      <GraduationCap size={12} />
                      <span>50% Student Discount</span>
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between pt-1">
                      <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
                        <span>Student Plan</span>
                        {isStudentVerified && (
                          <span title="Student Status Verified" className="inline-flex">
                            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          </span>
                        )}
                      </h3>
                      {currentTier === 'student' && (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Active Plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-normal">
                      For active college students & researchers.
                    </p>

                    <div className="my-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold tracking-tight text-emerald-700">
                          ₹{getPrice('student')}
                        </span>
                        <span className="text-xs text-zinc-400">/ mo</span>
                        <span className="text-xs text-zinc-400 line-through ml-1.5 font-medium">₹499</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                        {billingCycle === 'annual'
                          ? '₹1,788 billed annually (Save ₹3,000/yr)'
                          : 'Billed monthly · 50% discount'}
                      </span>
                    </div>

                    {/* Verification Requirement Badge Box */}
                    <div
                      className={`p-2.5 rounded-xl border mb-3 text-xs flex items-start gap-2 ${
                        isStudentVerified
                          ? 'bg-emerald-100/60 border-emerald-300 text-emerald-900'
                          : isStudentPending
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      {isStudentVerified ? (
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : isStudentPending ? (
                        <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <GraduationCap size={14} className="text-zinc-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold text-[11px] leading-tight">
                          {isStudentVerified
                            ? 'Student Status Verified'
                            : isStudentPending
                            ? 'Verification In Review'
                            : 'Academic Verification Required'}
                        </p>
                        <p className="text-[10px] opacity-80 mt-0.5 leading-snug">
                          {isStudentVerified
                            ? `${user?.institution_name || 'Academic'} credential confirmed.`
                            : isStudentPending
                            ? 'Verification is pending automated review.'
                            : 'Requires active .edu email or student ID card.'}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-zinc-700 border-t border-zinc-100 pt-3">
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>20 GB lossless cloud audio & note storage</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>Unlimited lecture recordings & dictation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>Auto-save and real-time audio transcript</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>Offline study sync for classrooms & libraries</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-2">
                    <button
                      type="button"
                      disabled={currentTier === 'student'}
                      onClick={() => handleSelect('student')}
                      className={`w-full min-h-[48px] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                        currentTier === 'student'
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : isStudentVerified
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.99]'
                          : 'bg-zinc-900 hover:bg-black text-white active:scale-[0.99]'
                      }`}
                    >
                      {currentTier === 'student' ? (
                        'Current Plan'
                      ) : isStudentVerified ? (
                        <>
                          <span>Select Student Plan</span>
                          <ArrowRight size={14} />
                        </>
                      ) : (
                        <>
                          <GraduationCap size={14} />
                          <span>Verify to Unlock ₹{getPrice('student')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. FEATURED BASE TIER (Most Popular Highlighted Card) */}
                <div className="relative bg-white rounded-2xl p-5 border-2 border-zinc-900 shadow-md flex flex-col justify-between">
                  {/* Clean Minimal Badge */}
                  <div className="absolute -top-3 left-4">
                    <span className="px-2.5 py-0.5 rounded-md bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-300" />
                      <span>Featured Base · Most Popular</span>
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between pt-1">
                      <h3 className="text-base font-bold text-zinc-900">Featured Base</h3>
                      {currentTier === 'base' && (
                        <span className="text-[10px] font-semibold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">
                          Active Plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-normal">
                      The core standard for productive voice thinkers.
                    </p>

                    <div className="my-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold tracking-tight text-zinc-900">
                          ₹{getPrice('base')}
                        </span>
                        <span className="text-xs text-zinc-400">/ mo</span>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {billingCycle === 'annual' ? '₹4,788 billed annually' : 'Billed monthly'}
                      </span>
                    </div>

                    {/* Elevated Specifications Box */}
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 mb-3 text-xs space-y-1">
                      <div className="flex justify-between text-zinc-700 font-medium">
                        <span>Cloud Storage:</span>
                        <span className="font-semibold text-zinc-900">15 GB Storage</span>
                      </div>
                      <div className="flex justify-between text-zinc-700 font-medium">
                        <span>Dictation:</span>
                        <span className="font-semibold text-zinc-900">Unlimited continuous</span>
                      </div>
                      <div className="flex justify-between text-zinc-700 font-medium">
                        <span>Support SLA:</span>
                        <span className="font-semibold text-zinc-900">Priority &lt;24h</span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-zinc-700 border-t border-zinc-100 pt-3">
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>Unlimited notes & freeform sketches</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>Continuous speech-to-text with auto-save</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>Multi-device sync & offline PWA backup</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>Clean text formatting & export</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-2">
                    <button
                      type="button"
                      disabled={currentTier === 'base'}
                      onClick={() => handleSelect('base')}
                      className={`w-full min-h-[48px] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        currentTier === 'base'
                          ? 'bg-zinc-100 text-zinc-400 cursor-default'
                          : 'bg-zinc-900 hover:bg-black text-white active:scale-[0.99] shadow-xs'
                      }`}
                    >
                      {currentTier === 'base' ? 'Current Plan' : 'Select Featured Base'}
                    </button>
                  </div>
                </div>

                {/* 4. Pro Studio */}
                <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 flex flex-col justify-between hover:border-zinc-300 transition-colors">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-zinc-900">Pro Studio</h3>
                      {currentTier === 'pro' && (
                        <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-normal">
                      For teams and intensive research squads.
                    </p>

                    <div className="my-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold tracking-tight text-zinc-900">
                          ₹{getPrice('pro')}
                        </span>
                        <span className="text-xs text-zinc-400">/ mo</span>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {billingCycle === 'annual' ? '₹9,588 billed annually' : 'Billed monthly'}
                      </span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-zinc-600 border-t border-zinc-100 pt-3">
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>100 GB Cloud Storage</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>AI Note Summarizer & Action items</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>Collaborative boards (up to 10 users)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>24/7 dedicated support</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-2">
                    <button
                      type="button"
                      disabled={currentTier === 'pro'}
                      onClick={() => handleSelect('pro')}
                      className={`w-full min-h-[48px] rounded-xl text-xs font-semibold border transition-all ${
                        currentTier === 'pro'
                          ? 'bg-zinc-50 text-zinc-400 border-zinc-200 cursor-default'
                          : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {currentTier === 'pro' ? 'Active' : 'Upgrade to Pro'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checkout Sheet */}
          {checkoutStep === 'checkout' && selectedTier && (
            <div className="max-w-md mx-auto py-2 space-y-5">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">Plan</p>
                    <p className="text-base font-bold text-zinc-900 mt-0.5 flex items-center gap-1.5">
                      {selectedTier === 'student' && <GraduationCap size={16} className="text-emerald-600" />}
                      <span>{getPlanName(selectedTier)}</span>
                    </p>
                    {selectedTier === 'student' && (
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        50% Student Discount Verified
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-zinc-400">Amount</p>
                    <p className="text-xl font-bold text-zinc-900 mt-0.5">
                      ₹{getPrice(selectedTier)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-zinc-500 flex justify-between">
                  <span>Billing interval</span>
                  <span className="font-semibold capitalize text-zinc-800">{billingCycle}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`min-h-[48px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                        : 'border-zinc-200 bg-white text-zinc-700'
                    }`}
                  >
                    <span>Instant UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`min-h-[48px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                        : 'border-zinc-200 bg-white text-zinc-700'
                    }`}
                  >
                    <span>Credit / Debit Card</span>
                  </button>
                </div>

                {paymentMethod === 'upi' ? (
                  <div>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@upi"
                      className="w-full min-h-[48px] px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-900"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1.5">
                      Compatible with GPay, PhonePe, Paytm, BHIM & NetBanking
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      defaultValue="4242 •••• •••• 4242"
                      className="w-full min-h-[48px] px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        defaultValue="12/28"
                        className="min-h-[44px] px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 outline-none"
                      />
                      <input
                        type="password"
                        defaultValue="123"
                        className="min-h-[44px] px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCheckoutStep('plans')}
                  className="min-h-[48px] px-4 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 border border-zinc-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isAuthorizing}
                  onClick={handleAuthorizePayment}
                  className="flex-1 min-h-[48px] px-5 bg-zinc-900 hover:bg-black text-white text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99] shadow-xs"
                >
                  {isAuthorizing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock size={14} />
                      <span>Confirm & Authorize ₹{getPrice(selectedTier)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success Confirmation */}
          {checkoutStep === 'success' && selectedTier && (
            <div className="max-w-md mx-auto py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-900">
                  {selectedTier === 'student'
                    ? 'Student Plan Activated!'
                    : selectedTier === 'base'
                    ? 'Featured Base Activated!'
                    : 'Pro Studio Activated!'}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  {selectedTier === 'student'
                    ? `Your student discount has been applied for ${user?.institution_name || 'your institution'}. Enjoy 20 GB storage and unlimited voice dictation.`
                    : 'Your workspace is updated. High-capacity cloud storage and unlimited voice dictation are unlocked.'}
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full min-h-[48px] px-6 bg-zinc-900 hover:bg-black text-white text-xs sm:text-sm font-semibold rounded-xl transition-all active:scale-[0.99]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const SubscriptionModal = SubscriptionView;
