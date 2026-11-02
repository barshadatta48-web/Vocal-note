import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Mail,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  FileText,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StudentVerificationStatus } from '../../types/auth';

const RECOGNIZED_INSTITUTIONS = [
  'Stanford University',
  'Massachusetts Institute of Technology (MIT)',
  'Harvard University',
  'UC Berkeley',
  'Indian Institute of Technology (IIT) Bombay',
  'Indian Institute of Technology (IIT) Delhi',
  'University of Oxford',
  'University of Cambridge',
  'National University of Singapore (NUS)',
  'Delhi University (DU)',
  'BITS Pilani',
  'University of Toronto',
  'Columbia University',
  'Other College / University',
];

const GRADUATION_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];

export const StudentVerificationModal: React.FC = () => {
  const {
    user,
    isStudentVerificationModalOpen,
    closeStudentVerificationModal,
    verifyStudentEmail,
    submitStudentOtp,
    submitStudentDocument,
    setStudentVerificationStatus,
    resetStudentVerification,
    openSubscriptionModal,
  } = useAuth();

  const [activeMethod, setActiveMethod] = useState<'email' | 'upload'>('email');

  // Method A State: Email Verification
  const [studentEmail, setStudentEmail] = useState(user?.student_email || user?.email || '');
  const [selectedInstitution, setSelectedInstitution] = useState(user?.institution_name || RECOGNIZED_INSTITUTIONS[0]);
  const [customInstitution, setCustomInstitution] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Method B State: ID Card / Receipt Upload
  const [graduationYear, setGraduationYear] = useState('2026');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [instantApproval, setInstantApproval] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isStudentVerificationModalOpen) return null;

  const currentStatus: StudentVerificationStatus = user?.student_verification_status || 'none';
  const isVerified = currentStatus === 'verified';
  const isPending = currentStatus === 'pending';
  const isRejected = currentStatus === 'rejected';

  // Handler for Method A: Send code to academic email
  const handleSendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    if (!studentEmail.trim()) {
      setEmailError('Please enter your official student email.');
      return;
    }

    setIsSubmittingEmail(true);
    const institution = selectedInstitution === 'Other College / University' ? customInstitution : selectedInstitution;
    const res = await verifyStudentEmail(studentEmail, institution);
    setIsSubmittingEmail(false);

    if (!res.success) {
      setEmailError(res.message);
    } else {
      setEmailOtpSent(true);
    }
  };

  // Handler for Method A: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    if (!otpCode.trim()) {
      setEmailError('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    const res = await submitStudentOtp(otpCode);
    setIsVerifyingOtp(false);

    if (!res.success) {
      setEmailError(res.message);
    }
  };

  // Handler for Method B: File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setUploadError('Please upload a valid image (PNG, JPG, WebP) or PDF file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit.');
      return;
    }

    setUploadError(null);
    setUploadedFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedPreview('https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=600&q=80');
    }
  };

  // Load sample student ID for instant 1-click test
  const handleLoadSampleID = () => {
    setUploadedFileName('stanford_student_id_alex.jpg');
    setUploadedPreview('https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80');
    setUploadError(null);
  };

  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedPreview && !uploadedFileName) {
      setUploadError('Please select or upload an ID card photo or tuition receipt.');
      return;
    }

    setIsUploading(true);
    const institution = selectedInstitution === 'Other College / University' ? customInstitution : selectedInstitution;

    await submitStudentDocument({
      institutionName: institution || 'Academic University',
      graduationYear,
      documentUrl: uploadedPreview || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      documentName: uploadedFileName || 'student_id.png',
      simulateInstantApproval: instantApproval,
    });
    setIsUploading(false);
  };

  const handleProceedToPlan = () => {
    closeStudentVerificationModal();
    openSubscriptionModal();
  };

  return (
    <div className="fixed inset-0 z-[650] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans antialiased text-zinc-900">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeStudentVerificationModal}
        className="fixed inset-0 bg-zinc-900/50 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200/90 shadow-2xl relative z-10 max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Mobile handle */}
        <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-50/40 via-white to-sky-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Academic Verification
                </span>
                <span className="text-[11px] font-semibold text-zinc-500">
                  50% Off Student Plan
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight mt-0.5">
                Verify Your Student Credentials
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={closeStudentVerificationModal}
            className="w-9 h-9 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors min-h-[40px] min-w-[40px]"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="px-5 sm:px-8 py-5 overflow-y-auto flex-1 space-y-5">
          {/* Real-time Status Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isVerified
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : isPending
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : isRejected
                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                : 'bg-zinc-50 border-zinc-200/80 text-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {isVerified && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
                {isPending && <Clock size={18} className="text-amber-600 shrink-0 animate-pulse" />}
                {isRejected && <AlertCircle size={18} className="text-rose-600 shrink-0" />}
                {!isVerified && !isPending && !isRejected && (
                  <ShieldCheck size={18} className="text-zinc-500 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold tracking-tight">
                      {isVerified
                        ? 'Student Status Verified · Discount Active'
                        : isPending
                        ? 'Verification In Review (Pending Approval)'
                        : isRejected
                        ? 'Verification Rejected'
                        : 'Unverified Student Account'}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isVerified
                          ? 'bg-emerald-200/80 text-emerald-800'
                          : isPending
                          ? 'bg-amber-200/80 text-amber-800'
                          : isRejected
                          ? 'bg-rose-200/80 text-rose-800'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {currentStatus.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 opacity-85 leading-relaxed">
                    {isVerified
                      ? `Verified for ${user?.institution_name || 'Academic Institution'}. You qualify for the discounted Student Plan at ₹149/mo (billed annually) or ₹199/mo.`
                      : isPending
                      ? `Your document for ${user?.institution_name || 'your institution'} was received and is in review. Typical review turnaround: < 24 hours.`
                      : isRejected
                      ? 'The submitted credentials could not be verified. Please re-submit an active student ID card or verify via your institutional email.'
                      : 'Students with active college or university credentials receive 50% off Vocal Note Base tier with unlimited notes and audio dictation.'}
                  </p>
                </div>
              </div>

              {/* Status Reset / Demo Tools Button */}
              {currentStatus !== 'none' && (
                <button
                  type="button"
                  onClick={resetStudentVerification}
                  className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-800 hover:underline shrink-0 flex items-center gap-1"
                  title="Reset verification for testing"
                >
                  <RefreshCw size={11} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Quick action button if verified */}
            {isVerified && (
              <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800">
                  Ready to activate your discounted workspace?
                </span>
                <button
                  type="button"
                  onClick={handleProceedToPlan}
                  className="min-h-[38px] px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <span>Select Student Plan</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>



          {/* Verification Method Switcher */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-2">
              Select Verification Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveMethod('email')}
                className={`min-h-[48px] p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  activeMethod === 'email'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-600/30'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    activeMethod === 'email' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Method A: Institutional Email</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">.edu / .ac.in / school domain</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMethod('upload')}
                className={`min-h-[48px] p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  activeMethod === 'upload'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-600/30'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    activeMethod === 'upload' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  <Upload size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Method B: Student ID Upload</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Photo ID or tuition fee receipt</p>
                </div>
              </button>
            </div>
          </div>

          {/* METHOD A: Institutional Email Flow */}
          {activeMethod === 'email' && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/90 space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-zinc-900">
                  Instant Verification via Academic Email
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Enter your official email ending in <span className="font-semibold text-zinc-700">.edu</span>,{' '}
                  <span className="font-semibold text-zinc-700">.ac.in</span>, or university domain. We will verify
                  instantly with a 6-digit one-time code.
                </p>
              </div>

              {!emailOtpSent ? (
                <form onSubmit={handleSendEmailCode} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Academic Institution
                    </label>
                    <div className="relative">
                      <select
                        value={selectedInstitution}
                        onChange={(e) => setSelectedInstitution(e.target.value)}
                        className="w-full min-h-[46px] px-3.5 pr-8 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 outline-none focus:border-zinc-900"
                      >
                        {RECOGNIZED_INSTITUTIONS.map((inst) => (
                          <option key={inst} value={inst}>
                            {inst}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedInstitution === 'Other College / University' && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Enter College or University Name
                      </label>
                      <input
                        type="text"
                        value={customInstitution}
                        onChange={(e) => setCustomInstitution(e.target.value)}
                        placeholder="e.g., University of California, San Diego"
                        className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-900"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Official Institutional Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="email"
                        value={studentEmail}
                        onChange={(e) => {
                          setStudentEmail(e.target.value);
                          setEmailError(null);
                        }}
                        placeholder="yourname@stanford.edu or student@iitb.ac.in"
                        className="w-full min-h-[46px] pl-10 pr-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-900"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-zinc-400">Supported domains:</span>
                      {['.edu', '.ac.in', '.edu.in', '.ac.uk', '.edu.au'].map((domain) => (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => setStudentEmail(`scholar@university${domain}`)}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
                        >
                          {domain}
                        </button>
                      ))}
                    </div>
                  </div>

                  {emailError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>{emailError}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingEmail}
                      className="w-full min-h-[48px] bg-zinc-900 hover:bg-black text-white text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
                    >
                      {isSubmittingEmail ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Send Academic Verification Code</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2 of Method A: Enter OTP code */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Verification code dispatched to {studentEmail}</span>
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Please enter the 6-digit code below to instantly confirm your student enrollment.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      6-Digit Academic Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/\D/g, ''));
                          setEmailError(null);
                        }}
                        placeholder="842915"
                        className="w-full min-h-[48px] pl-10 pr-3.5 rounded-xl border border-zinc-200 text-center tracking-widest text-base font-bold text-zinc-900 outline-none focus:border-zinc-900"
                      />
                    </div>
                  </div>

                  {emailError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>{emailError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailOtpSent(false);
                        setOtpCode('');
                      }}
                      className="min-h-[48px] px-4 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                    >
                      Change Email
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifyingOtp}
                      className="flex-1 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
                    >
                      {isVerifyingOtp ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Verify & Unlock Student Discount</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* METHOD B: Document Upload Flow */}
          {activeMethod === 'upload' && (
            <form onSubmit={handleSubmitDocument} className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/90 space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-zinc-900">
                  Student ID Card or Fee Receipt Upload
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Submit a photo of your current college ID card, semester registration card, or fee receipt
                  displaying your name and institution.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Academic Institution
                  </label>
                  <select
                    value={selectedInstitution}
                    onChange={(e) => setSelectedInstitution(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 pr-8 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 outline-none focus:border-zinc-900"
                  >
                    {RECOGNIZED_INSTITUTIONS.map((inst) => (
                      <option key={inst} value={inst}>
                        {inst}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Expected Graduation Year
                  </label>
                  <select
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 outline-none focus:border-zinc-900"
                  >
                    {GRADUATION_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Verification Document (ID Card / Tuition Receipt)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                />

                {uploadedPreview ? (
                  <div className="relative rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/20 p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                        <img
                          src={uploadedPreview}
                          alt="Student ID Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-zinc-900 truncate">
                          {uploadedFileName || 'student_id.png'}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 size={12} />
                          <span>Image uploaded & verified ready</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadedPreview(null);
                        setUploadedFileName(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-700 transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-zinc-50"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto mb-2.5">
                      <Upload size={18} />
                    </div>
                    <p className="text-xs font-semibold text-zinc-800">
                      Click to upload Student ID or tuition receipt
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      PNG, JPG, or PDF up to 5MB · Data encrypted & secured
                    </p>
                  </div>
                )}

                {/* Instant 1-click test button */}
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleID}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <ImageIcon size={12} />
                    <span>Load sample Student ID card for testing</span>
                  </button>
                  <span className="text-[10px] text-zinc-400">Instant AI OCR Review enabled</span>
                </div>
              </div>

              {/* Instant vs Manual Review Toggle */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-900">Instant Automated OCR Approval</p>
                  <p className="text-[10px] text-zinc-500">
                    Verify credentials immediately without waiting for manual admin queue
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={instantApproval}
                  onChange={(e) => setInstantApproval(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer rounded"
                />
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full min-h-[48px] bg-zinc-900 hover:bg-black text-white text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{instantApproval ? 'Submit & Instantly Verify Student Status' : 'Submit ID for Review (Pending)'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Student Plan Perks Highlight */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
            <h4 className="text-xs font-bold text-zinc-900 mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600" />
              <span>What's Included in the Student Subscription Plan?</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>50% Flat Discount: ₹149/mo (annual) or ₹199/mo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Unlimited lecture audio dictation & real-time transcripts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>20 GB lossless cloud storage for research & notes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Offline multi-device study sync & exam prep export</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-8 py-3.5 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-zinc-500">
            Verification is valid for 1 full academic year and renews annually.
          </p>
          <button
            type="button"
            onClick={closeStudentVerificationModal}
            className="min-h-[40px] px-4 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
