import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ArrowRight, ShieldCheck, Zap, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SubscriptionTier, BillingCycle } from '../../types/auth';

export const SubscriptionView: React.FC = () => {
  const { user, isSubscriptionModalOpen, closeSubscriptionModal, upgradeSubscription } = useAuth();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('dattabarsha@okhdfcbank');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  if (!isSubscriptionModalOpen) return null;

  const currentTier = user?.subscriptionTier || 'free';

  const handleSelect = (tier: SubscriptionTier) => {
    if (tier === currentTier) return;
    setSelectedTier(tier);
    setCheckoutStep('checkout');
  };

  const handleAuthorizePayment = async () => {
    if (!selectedTier) return;
    setIsAuthorizing(true);
    await new Promise((res) => setTimeout(res, 750));
    setIsAuthorizing(false);
    upgradeSubscription(selectedTier, billingCycle);
    setCheckoutStep('success');
  };

  const handleClose = () => {
    setCheckoutStep('plans');
    setSelectedTier(null);
    closeSubscriptionModal();
  };

  const getPrice = (tier: SubscriptionTier) => {
    if (tier === 'free') return 0;
    if (tier === 'base') return billingCycle === 'annual' ? 399 : 499;
    return billingCycle === 'annual' ? 799 : 999;
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
        className="w-full max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200/80 shadow-lg relative z-10 max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
      >
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Top Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
              Pricing & Plans
            </span>
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
        <div className="px-5 sm:px-8 py-5 sm:py-6 overflow-y-auto flex-1">
          {checkoutStep === 'plans' && (
            <div className="space-y-6">
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
                    Monthly
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
                    <span>Annual</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-white">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid: Mobile Stack, PC 3-Column */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                {/* 1. Free Starter */}
                <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 flex flex-col justify-between">
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
                        <span>500 MB local device cache</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-zinc-900 shrink-0 mt-0.5" />
                        <span>Community support</span>
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

                {/* 2. FEATURED BASE TIER (Center & Prominently Elevated) */}
                <div className="relative bg-white rounded-2xl p-5 border-2 border-zinc-900 shadow-sm flex flex-col justify-between order-first sm:order-none">
                  {/* Clean Minimal Badge */}
                  <div className="absolute -top-3 left-4">
                    <span className="px-2.5 py-0.5 rounded-md bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider">
                      Featured Base · Most Popular
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

                {/* 3. Pro Studio */}
                <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 flex flex-col justify-between">
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
                      For teams and intensive research ideation.
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
                    <p className="text-base font-bold text-zinc-900 mt-0.5">
                      {selectedTier === 'base' ? 'Featured Base Tier' : 'Pro Studio Tier'}
                    </p>
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
                      Compatible with GPay, PhonePe, Paytm, and BHIM
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
              <div className="w-14 h-14 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-900">
                  {selectedTier === 'base' ? 'Featured Base' : 'Pro Studio'} Activated
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Your workspace is updated. 15 GB storage and unlimited voice dictation are now unlocked.
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
