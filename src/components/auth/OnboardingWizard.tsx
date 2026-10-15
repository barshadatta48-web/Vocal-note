import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, ArrowLeft, User, Briefcase, Sparkles, CheckCircle2, Upload, Camera, Compass, Layers, Palette, Users, Mic, Rocket } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OnboardingData, generateInitialsAvatar } from '../../types/auth';

const ROLES = [
  'Product Designer',
  'Product Manager',
  'Software Engineer',
  'Researcher & Writer',
  'Founder & Executive',
  'Student & Educator',
];

const USE_CASES = [
  {
    id: 'voice-ideation',
    title: 'Voice Brainstorming',
    desc: 'Capture fleeting ideas with real-time audio transcription',
    icon: Mic,
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes & Actions',
    desc: 'Structured summaries, to-do lists, and quick decisions',
    icon: CheckCircle2,
  },
  {
    id: 'visual-sketch',
    title: 'Visual Canvas & Sketching',
    desc: 'Freehand ink diagrams and sticky boards for spatial thinking',
    icon: Layers,
  },
  {
    id: 'daily-journal',
    title: 'Daily Journal & Reflection',
    desc: 'Daily audio logs, mood tracking, and personal retrospectives',
    icon: Compass,
  },
];

const TEAM_SIZES = [
  { id: 'solo', label: 'Solo Thinker', sub: 'Just for me' },
  { id: 'small', label: 'Small Team', sub: '2 – 5 members' },
  { id: 'squad', label: 'Growing Squad', sub: '6 – 20 members' },
  { id: 'org', label: 'Organization', sub: '20+ members' },
];

const THEMES = [
  { id: 'ocean-teal', name: 'Ocean Teal', color: '#0d9488', bgClass: 'from-teal-500 to-emerald-600' },
  { id: 'clean-slate', name: 'Clean Slate', color: '#475569', bgClass: 'from-slate-600 to-slate-800' },
  { id: 'amber-sunset', name: 'Warm Sunset', color: '#d97706', bgClass: 'from-amber-500 to-rose-500' },
  { id: 'indigo-violet', name: 'Indigo Aura', color: '#4f46e5', bgClass: 'from-indigo-600 to-violet-700' },
];

export const OnboardingWizard: React.FC = () => {
  const { user, completeOnboarding } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(user?.name || 'Barsha Datta');
  const [role, setRole] = useState(user?.role || 'Product Designer');
  const [customRole, setCustomRole] = useState('');
  
  const [useCase, setUseCase] = useState(user?.useCase || USE_CASES[0].title);
  const [teamSize, setTeamSize] = useState(user?.teamSize || TEAM_SIZES[0].label);
  const [themePreference, setThemePreference] = useState(user?.themePreference || THEMES[0].name);

  // Automatically derive default initials avatar from name
  const autoAvatar = generateInitialsAvatar(name.trim() || user?.name || 'User');

  const handleFinish = () => {
    const data: OnboardingData = {
      name: name.trim() || user?.name || 'Barsha Datta',
      role: customRole.trim() || role || 'Product Designer',
      avatar: autoAvatar,
      useCase,
      teamSize,
      themePreference,
    };
    completeOnboarding(data);
  };

  const handleSkip = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3);
    } else {
      handleFinish();
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-teal-50/40 to-indigo-100/40 flex items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-200/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-200/25 rounded-full blur-[120px] pointer-events-none" />

      {/* Centered Modal / Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl bg-white/85 backdrop-blur-2xl rounded-3xl sm:rounded-[32px] border border-white/70 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.1),0_2px_4px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col relative z-10"
      >
        {/* Top Progress Bar & Steps Indicator */}
        <div className="px-6 sm:px-10 pt-7 sm:pt-9 pb-5 border-b border-slate-100/80 bg-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-teal-700 uppercase tracking-widest">
                Step {step} of 3
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-semibold text-slate-500">
                {step === 1 ? 'Profile Setup' : step === 2 ? 'Goals & Preferences' : 'Workspace Ready'}
              </span>
            </div>

            {/* Skip Button for quick onboarding exit */}
            {step < 3 && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 min-h-[38px] px-2.5 flex items-center transition-colors"
              >
                Skip Step
              </button>
            )}
          </div>

          {/* Connected Progress Dots */}
          <div className="flex items-center gap-2 sm:gap-3 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center">
                <div
                  className={`h-2 rounded-full flex-1 transition-all duration-300 ${
                    s === step
                      ? 'bg-gradient-to-r from-teal-500 to-indigo-600 shadow-sm'
                      : s < step
                      ? 'bg-teal-500'
                      : 'bg-slate-200/80'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Step Content Area */}
        <div className="px-6 sm:px-10 py-7 sm:py-9 flex-1 overflow-y-auto max-h-[calc(100vh-240px)]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Set up your creator profile
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Personalize your presence so your notes and transcripts reflect your identity.
                  </p>
                </div>

                {/* Avatar Selection & Upload */}
                {/* Automatic Initials Avatar Badge (bypasses manual avatar selection) */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 mb-2">
                  <img
                    src={autoAvatar}
                    alt={name || 'Avatar'}
                    className="w-12 h-12 rounded-xl object-cover shadow-xs border border-slate-200"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {name.trim() || 'Your Name'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Initials avatar automatically generated
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                    Auto-Assigned
                  </span>
                </div>

                {/* Full Name Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Full Name
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Barsha Datta"
                      className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-slate-800 text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Professional Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Professional Role / Persona
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setRole(r);
                          setCustomRole('');
                        }}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                          role === r && !customRole
                            ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-sm ring-1 ring-teal-200'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="truncate">{r}</span>
                        {role === r && !customRole && <Check size={14} className="text-teal-600 shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>

                  {/* Or Custom Role */}
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={customRole}
                      onChange={(e) => {
                        setCustomRole(e.target.value);
                        setRole(e.target.value);
                      }}
                      placeholder="Or enter custom role (e.g. Creative Technologist)"
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50/60 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-xs text-slate-800 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Preferences & Goals
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Help us customize your workspace defaults and note templates.
                  </p>
                </div>

                {/* Primary Use Case */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Primary Use Case
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {USE_CASES.map((uc) => {
                      const IconComp = uc.icon;
                      const isSelected = useCase === uc.title;
                      return (
                        <button
                          key={uc.id}
                          type="button"
                          onClick={() => setUseCase(uc.title)}
                          className={`min-h-[56px] p-3 rounded-2xl text-left transition-all border flex items-start gap-3 ${
                            isSelected
                              ? 'bg-teal-50/80 border-teal-500 shadow-sm ring-2 ring-teal-300/40 text-slate-900'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <IconComp size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-extrabold text-slate-800 truncate">{uc.title}</p>
                              {isSelected && <Check size={14} className="text-teal-600 shrink-0 ml-1" />}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{uc.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Team Size */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Team Size
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TEAM_SIZES.map((ts) => {
                      const isSelected = teamSize === ts.label;
                      return (
                        <button
                          key={ts.id}
                          type="button"
                          onClick={() => setTeamSize(ts.label)}
                          className={`min-h-[50px] p-2.5 rounded-xl text-center transition-all border flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-200 text-indigo-900'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="text-xs font-bold">{ts.label}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{ts.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theme Preference */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Default Workspace Aesthetic
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {THEMES.map((th) => {
                      const isSelected = themePreference === th.name;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setThemePreference(th.name)}
                          className={`min-h-[50px] p-2.5 rounded-xl text-left transition-all border flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-400/30'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-gradient-to-tr ${th.bgClass} shrink-0 shadow-sm`}
                          />
                          <span className="text-xs font-bold truncate">{th.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-center py-2"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-teal-500 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/25">
                  <Rocket size={32} className="sm:w-9 sm:h-9" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-xs font-bold text-teal-700 mb-2">
                    <Sparkles size={13} />
                    <span>Workspace Configured</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome aboard, {name.split(' ')[0]}!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    Your {role} workspace is tuned and ready. Dictate notes with zero delay, sketch ideas on the canvas, and stay organized effortlessly.
                  </p>
                </div>

                {/* Summary Card */}
                <div className="max-w-md mx-auto bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/70 text-left shadow-inner space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60">
                    <img
                      src={autoAvatar}
                      alt={name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-sm"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500 font-medium">{role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 bg-white rounded-xl border border-slate-200/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Focus</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">{useCase.split(' ')[0]}</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Team</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">{teamSize.split(' ')[0]}</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Theme</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">{themePreference.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="px-6 sm:px-10 py-4 sm:py-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3)}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl bg-gradient-to-r from-teal-600 via-indigo-600 to-indigo-700 hover:brightness-105 text-white text-sm font-extrabold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Rocket size={18} />
              <span>Launch Workspace</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
