import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Sparkles, Shield, Zap, CreditCard, CheckCircle2, ArrowRight, Star, HeartHandshake, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SubscriptionTier, BillingCycle } from '../../types/auth';

export const SubscriptionModal: React.FC = () => {
  const { user, isSubscriptionModalOpen, closeSubscriptionModal, upgradeSubscription } = useAuth();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'plan_select' | 'payment' | 'success'>('plan_select');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('dattabarsha@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isSubscriptionModalOpen) return null;

  const currentTier = user?.subscriptionTier || 'free';

  const handleSelectPlan = (tier: SubscriptionTier) => {
    if (tier === currentTier) {
      return; // Already on this tier
    }
    setSelectedTier(tier);
    setCheckoutStep('payment');
  };

  const handleSimulatePayment = async () => {
    if (!selectedTier) return;
    setIsProcessing(true);
    await new Promise((res) => setTimeout(res, 900));
    setIsProcessing(false);
    upgradeSubscription(selectedTier, billingCycle);
    setCheckoutStep('success');
  };

  const handleClose = () => {
    setCheckoutStep('plan_select');
    setSelectedTier(null);
    closeSubscriptionModal();
  };

  const getAmount = (tier: SubscriptionTier) => {
    if (tier === 'free') return 0;
    if (tier === 'base') {
      return billingCycle === 'annual' ? 399 : 499;
    }
    // pro
    return billingCycle === 'annual' ? 799 : 999;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      {/* Main Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-5xl bg-white/95 backdrop-blur-2xl rounded-3xl sm:rounded-[36px] border border-white/80 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.25)] relative z-10 overflow-hidden flex flex-col my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 sm:px-10 pt-7 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-teal-50/30 to-indigo-50/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-teal-700 bg-teal-100/70 px-2.5 py-0.5 rounded-full">
                Vocal Note Plans & Pricing
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-semibold text-slate-500">
                INR Pricing (₹)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {checkoutStep === 'plan_select'
                ? 'Elevate your note-taking experience'
                : checkoutStep === 'payment'
                ? 'Complete Secure Activation'
                : 'Plan Activated Successfully!'}
            </h2>
          </div>

          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors min-w-[40px] min-h-[40px]"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-10 max-h-[calc(100vh-180px)] overflow-y-auto">
          {checkoutStep === 'plan_select' && (
            <div>
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center mb-8">
                <div className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`min-h-[42px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Monthly Billing
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`min-h-[42px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                      billingCycle === 'annual'
                        ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-wider">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* 3-Column PC / 1-Column Mobile Pricing Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* 1. Free Starter */}
                <div className="bg-white/90 rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-800">Free Starter</h3>
                      {currentTier === 'free' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 uppercase tracking-wider">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Essential vocal note-taking for occasional personal use.</p>

                    <div className="my-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">₹0</span>
                        <span className="text-xs text-slate-400 font-bold">/ month</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Always free for individual creators.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Features included</p>
                      <ul className="space-y-2.5 text-xs text-slate-600">
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>15 Vocal Notes & sketches</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>Standard voice dictation (up to 2 mins)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>500 MB Local device storage</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>Basic color themes & JSON backup</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>Community web support</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      disabled={currentTier === 'free'}
                      onClick={() => handleSelectPlan('free')}
                      className={`w-full min-h-[46px] rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                        currentTier === 'free'
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      {currentTier === 'free' ? 'Current Active Tier' : 'Downgrade to Starter'}
                    </button>
                  </div>
                </div>

                {/* 2. FEATURED BASE TIER (Most Popular Highlighted Card) */}
                <div className="relative bg-gradient-to-b from-teal-50/70 via-white to-indigo-50/40 rounded-3xl p-6 sm:p-7 border-2 border-teal-500 shadow-xl shadow-teal-500/10 flex flex-col justify-between scale-[1.02] ring-4 ring-teal-500/20">
                  {/* Glowing Most Popular Badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 rounded-full bg-gradient-to-r from-teal-600 via-indigo-600 to-indigo-700 text-white text-[11px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-300" />
                      <span>Most Popular · Featured Base</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          <span>Featured Base</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                        </h3>
                        <p className="text-xs text-teal-800/80 font-medium mt-0.5">
                          The sweet spot for active vocal note takers.
                        </p>
                      </div>
                      {currentTier === 'base' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-600 text-white uppercase tracking-wider">
                          Active Plan
                        </span>
                      )}
                    </div>

                    <div className="my-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">
                          ₹{billingCycle === 'annual' ? 399 : 499}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">/ month</span>
                      </div>
                      <p className="text-[11px] text-teal-700 font-semibold mt-1">
                        {billingCycle === 'annual'
                          ? '₹4,788 billed annually (Save ₹1,200/yr)'
                          : 'Billed monthly · Cancel anytime'}
                      </p>
                    </div>

                    {/* Featured Base Specifications Box */}
                    <div className="p-3 bg-teal-500/10 rounded-2xl border border-teal-500/20 mb-4 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-semibold">Storage & Usage Limit:</span>
                        <span className="font-black text-teal-800">15 GB Cloud Storage</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-semibold">Voice Dictation:</span>
                        <span className="font-black text-teal-800">Unlimited streaming</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-semibold">Support SLA:</span>
                        <span className="font-black text-teal-800">Standard priority (&lt;24h)</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-teal-100 space-y-2.5">
                      <p className="text-[11px] font-black uppercase tracking-wider text-teal-800">
                        Everything in Free, plus:
                      </p>
                      <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-teal-600 shrink-0 mt-0.5" />
                          <span>Unlimited vocal notes & freeform canvas sketches</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-teal-600 shrink-0 mt-0.5" />
                          <span>Continuous real-time speech-to-text with auto-save</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-teal-600 shrink-0 mt-0.5" />
                          <span>High-speed AI speech punctuation & grammar polish</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-teal-600 shrink-0 mt-0.5" />
                          <span>Seamless PWA multi-device offline sync</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-teal-600 shrink-0 mt-0.5" />
                          <span>Custom color themes & rich templates</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      disabled={currentTier === 'base'}
                      onClick={() => handleSelectPlan('base')}
                      className={`w-full min-h-[48px] rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 ${
                        currentTier === 'base'
                          ? 'bg-teal-700 text-white cursor-default opacity-90'
                          : 'bg-gradient-to-r from-teal-600 via-indigo-600 to-indigo-700 hover:brightness-110 text-white shadow-teal-600/25 active:scale-98'
                      }`}
                    >
                      {currentTier === 'base' ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Currently Active</span>
                        </>
                      ) : (
                        <>
                          <span>Select Featured Base</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. Pro Studio Tier */}
                <div className="bg-white/90 rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-800">Pro Studio</h3>
                      {currentTier === 'pro' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                          Active Plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">For heavy power-thinkers, researchers & collaborative squads.</p>

                    <div className="my-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">
                          ₹{billingCycle === 'annual' ? 799 : 999}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">/ month</span>
                      </div>
                      <p className="text-[11px] text-indigo-600 font-semibold mt-1">
                        {billingCycle === 'annual' ? '₹9,588 billed annually' : 'Billed monthly'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Advanced privileges</p>
                      <ul className="space-y-2.5 text-xs text-slate-600">
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span>100 GB Lossless Audio & Canvas Cloud Storage</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span>AI Note Summarizer & Action Item extraction</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span>Collaborative shared boards (up to 10 users)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span>Lossless audio exports (MP3 / WAV)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span>Dedicated 24/7 VIP concierge support</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      disabled={currentTier === 'pro'}
                      onClick={() => handleSelectPlan('pro')}
                      className={`w-full min-h-[46px] rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                        currentTier === 'pro'
                          ? 'bg-indigo-600 text-white border-indigo-600 cursor-default'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      {currentTier === 'pro' ? 'Current Active Tier' : 'Upgrade to Pro Studio'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checkout & Payment Step */}
          {checkoutStep === 'payment' && selectedTier && (
            <div className="max-w-xl mx-auto py-2">
              <div className="bg-slate-50/80 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-inner">
                <div className="flex items-center justify-between pb-5 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700">Order Summary</span>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5">
                      {selectedTier === 'base' ? 'Featured Base Plan' : selectedTier === 'pro' ? 'Pro Studio Plan' : 'Free Starter'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Billing interval: <span className="font-bold capitalize">{billingCycle}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-black text-teal-800">
                      ₹{getAmount(selectedTier)}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Total payable</span>
                  </div>
                </div>

                {/* Simulated Payment Methods */}
                <div className="my-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    Select Payment Gateway (India)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`min-h-[48px] p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === 'upi'
                          ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-sm ring-2 ring-teal-200'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Zap size={16} className="text-amber-500" />
                      <span>Instant UPI / QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`min-h-[48px] p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === 'card'
                          ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-sm ring-2 ring-teal-200'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <CreditCard size={16} className="text-indigo-600" />
                      <span>Debit / Credit Card</span>
                    </button>
                  </div>

                  {paymentMethod === 'upi' ? (
                    <div className="mt-4 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-600">Enter UPI ID</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@upi"
                          className="w-full min-h-[46px] px-3.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-200 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-medium">
                        <Shield size={12} className="text-emerald-500" />
                        <span>Supports GPay, PhonePe, Paytm, and BHIM UPI</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-600">Simulated Card Details</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full min-h-[46px] px-3.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-200 focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <input
                          type="text"
                          defaultValue="12/28"
                          className="min-h-[42px] px-3 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                          placeholder="MM/YY"
                        />
                        <input
                          type="password"
                          defaultValue="789"
                          className="min-h-[42px] px-3 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                          placeholder="CVV"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated Payment Trigger */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('plan_select')}
                    className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all"
                  >
                    Change Plan
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSimulatePayment}
                    className="flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Authorizing ₹{getAmount(selectedTier)}...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Authorize ₹{getAmount(selectedTier)} (Instant Activation)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Confirmation Step */}
          {checkoutStep === 'success' && selectedTier && (
            <div className="max-w-md mx-auto py-8 text-center space-y-5">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={44} />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-700 uppercase tracking-wider">
                  Payment Confirmed
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                  You are now on {selectedTier === 'base' ? 'Featured Base' : 'Pro Studio'}!
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Your account tier has been updated immediately. Storage limits, unlimited voice streaming, and priority features are now unlocked.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Activated Plan:</span>
                  <span className="text-teal-700 font-black uppercase">{selectedTier} Tier</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Billing Cycle:</span>
                  <span className="capitalize">{billingCycle}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Cloud Storage Status:</span>
                  <span className="text-emerald-600 font-bold">15 GB Active</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full min-h-[48px] px-6 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-98"
              >
                Return to Workspace
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
