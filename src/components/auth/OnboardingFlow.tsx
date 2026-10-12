import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, ArrowLeft, Mic, FileText, Palette, Compass, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OnboardingData } from '../../types/auth';

const ROLES = [
  'Product Designer',
  'Software Engineer',
  'Product Manager',
  'Founder / Lead',
  'Writer / Creator',
  'Student / Researcher',
];

const USE_CASES = [
  {
    id: 'voice-ideation',
    title: 'Voice Brainstorming',
    desc: 'Capture rapid voice memos with real-time text streaming',
    icon: Mic,
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes & Actions',
    desc: 'Structured summaries, checklists, and key takeaways',
    icon: FileText,
  },
  {
    id: 'visual-canvas',
    title: 'Visual Canvas & Sketching',
    desc: 'Spatial board with freehand sketches and tactile notes',
    icon: Palette,
  },
  {
    id: 'daily-journal',
    title: 'Daily Reflection & Log',
    desc: 'Quick daily thoughts, habits, and voice retrospectives',
    icon: Compass,
  },
];

const TEAM_SIZES = [
  { id: 'solo', label: 'Solo Thinker', desc: 'Personal workspace' },
  { id: 'small', label: '2 – 5 members', desc: 'Agile team' },
  { id: 'mid', label: '6 – 20 members', desc: 'Growing group' },
  { id: 'large', label: '20+ members', desc: 'Organization' },
];

const THEMES = [
  { id: 'clean', name: 'Clean Slate', hex: '#eceff1', desc: 'Light neutral grey' },
  { id: 'ocean', name: 'Ocean Teal', hex: '#0d9488', desc: 'Crisp teal accent' },
  { id: 'paper', name: 'Warm Paper', hex: '#fcfaf7', desc: 'Classic tactile tone' },
  { id: 'dark', name: 'Neo Dark', hex: '#1a1c1e', desc: 'Midnight canvas' },
];

export const OnboardingFlow: React.FC = () => {
  const { user, completeOnboarding } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(user?.name || 'Barsha Datta');
  const [role, setRole] = useState(user?.role || ROLES[0]);
  const [customRole, setCustomRole] = useState('');
  
  const [useCase, setUseCase] = useState(user?.useCase || USE_CASES[0].title);
  const [teamSize, setTeamSize] = useState(user?.teamSize || TEAM_SIZES[0].label);
  const [themePreference, setThemePreference] = useState(user?.themePreference || THEMES[0].name);

  const handleFinish = () => {
    const data: OnboardingData = {
      name: name.trim() || 'Barsha Datta',
      role: customRole.trim() || role || 'Product Designer',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      useCase,
      teamSize,
      themePreference,
    };
    completeOnboarding(data);
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-between text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      {/* Top Hairline Progress Bar */}
      <div className="w-full bg-zinc-200/60 h-1 fixed top-0 left-0 right-0 z-30">
        <motion.div
          className="h-full bg-zinc-900"
          initial={{ width: '33%' }}
          animate={{
            width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%',
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top Header */}
      <header className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-7 sm:pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Step {step} of 3
          </span>
          <span className="text-zinc-300">·</span>
          <span className="text-xs font-medium text-zinc-600">
            {step === 1 ? 'Profile' : step === 2 ? 'Preferences' : 'Launch'}
          </span>
        </div>

        {step < 3 && (
          <button
            type="button"
            onClick={handleNext}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-800 transition-colors py-2 px-1 min-h-[44px] flex items-center"
          >
            Skip
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-10 shadow-xs">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                    Your Profile
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed">
                    Set up your identity for your personal notes and audio transcripts.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Barsha Datta"
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">
                      Professional Role / Persona
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ROLES.map((r) => {
                        const isSelected = role === r && !customRole;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setRole(r);
                              setCustomRole('');
                            }}
                            className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border flex items-center justify-between ${
                              isSelected
                                ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                                : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                            }`}
                          >
                            <span className="truncate">{r}</span>
                            {isSelected && <Check size={14} className="shrink-0 ml-1 text-white" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5">
                      <input
                        type="text"
                        value={customRole}
                        onChange={(e) => {
                          setCustomRole(e.target.value);
                          setRole(e.target.value);
                        }}
                        placeholder="Or enter custom role (e.g. Creative Director)"
                        className="w-full min-h-[44px] px-3.5 rounded-xl bg-zinc-50/50 border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                    Preferences & Goals
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed">
                    Tailor your workspace defaults to match how you think and work.
                  </p>
                </div>

                {/* Primary Use Case */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-2">
                    Primary Use Case
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {USE_CASES.map((uc) => {
                      const isSelected = useCase === uc.title;
                      const Icon = uc.icon;
                      return (
                        <button
                          key={uc.id}
                          type="button"
                          onClick={() => setUseCase(uc.title)}
                          className={`min-h-[64px] p-3.5 rounded-2xl text-left transition-all border flex items-start gap-3 ${
                            isSelected
                              ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 text-zinc-900'
                              : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-600'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'
                            }`}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-zinc-900 truncate">{uc.title}</p>
                              {isSelected && <Check size={14} className="text-zinc-900 shrink-0 ml-1" />}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{uc.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Team Size */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-2">
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
                              ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 text-zinc-900 font-semibold'
                              : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-600'
                          }`}
                        >
                          <span className="text-xs">{ts.label}</span>
                          <span className="text-[10px] text-zinc-400 mt-0.5">{ts.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theme Preference */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-2">
                    Aesthetic Mode
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {THEMES.map((th) => {
                      const isSelected = themePreference === th.name;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setThemePreference(th.name)}
                          className={`min-h-[48px] p-2.5 rounded-xl text-left transition-all border flex items-center gap-2 ${
                            isSelected
                              ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 text-zinc-900 font-semibold'
                              : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-600'
                          }`}
                        >
                          <div
                            className="w-4 h-4 rounded-full border border-zinc-300 shrink-0"
                            style={{ backgroundColor: th.hex }}
                          />
                          <span className="text-xs truncate">{th.name}</span>
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                    Workspace Ready
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed">
                    Welcome, {name.split(' ')[0]}. Your workspace is initialized and calibrated for focused ideation.
                  </p>
                </div>

                {/* Clean Summary Card */}
                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200/70 space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200/50">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{name}</p>
                      <p className="text-xs text-zinc-500">{customRole || role}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-700 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">
                      Standard Profile
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-zinc-200/50">
                      <span className="text-[10px] text-zinc-400 block font-medium">Focus</span>
                      <span className="text-zinc-800 font-semibold truncate block mt-0.5">{useCase.split(' ')[0]}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-zinc-200/50">
                      <span className="text-[10px] text-zinc-400 block font-medium">Team</span>
                      <span className="text-zinc-800 font-semibold truncate block mt-0.5">{teamSize.split(' ')[0]}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-zinc-200/50">
                      <span className="text-[10px] text-zinc-400 block font-medium">Theme</span>
                      <span className="text-zinc-800 font-semibold truncate block mt-0.5">{themePreference.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 leading-relaxed">
                  You can now create sticky notes, use scoped real-time voice transcription inside individual note cards, and sketch freely on your canvas.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Sticky Bottom Navigation Bar for Mobile Thumb-Reach */}
      <footer className="w-full bg-white border-t border-zinc-200/70 py-3.5 sm:py-4 px-4 sm:px-6 sticky bottom-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[48px] px-4 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={15} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="min-h-[48px] px-6 py-3 bg-zinc-900 hover:bg-black text-white text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 active:scale-[0.99] shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3 bg-zinc-900 hover:bg-black text-white text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99] shadow-xs"
            >
              <span>Get Started</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export const OnboardingWizard = OnboardingFlow;
