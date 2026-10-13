import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Sparkles, Check, ArrowRight, ArrowLeft, Mic, GraduationCap, Palette, Briefcase, FileText } from 'lucide-react';
import { DraftProfile } from '../../types/auth';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
];

const ROLES = [
  { id: 'student', label: 'Student / Scholar', icon: GraduationCap, desc: 'Lectures & thesis notes' },
  { id: 'designer', label: 'Product Designer', icon: Palette, desc: 'Visual board & sketch memos' },
  { id: 'engineer', label: 'Software Engineer', icon: Briefcase, desc: 'Technical specs & brainstorms' },
  { id: 'creator', label: 'Writer / Creator', icon: FileText, desc: 'Daily journals & voice flow' },
];

const USE_CASES = [
  { id: 'voice', label: 'Voice Brainstorming & Transcription' },
  { id: 'spatial', label: 'Infinite Spatial Canvas & Sketching' },
  { id: 'academic', label: 'Academic Study & Lecture Summaries' },
  { id: 'tasks', label: 'Meeting Takeaways & Action Cards' },
];

interface ProfileCreationStepProps {
  initialData?: Partial<DraftProfile>;
  onComplete: (data: DraftProfile) => void;
  onAlreadyHaveAccount: () => void;
}

export const ProfileCreationStep: React.FC<ProfileCreationStepProps> = ({
  initialData,
  onComplete,
  onAlreadyHaveAccount,
}) => {
  const [name, setName] = useState(initialData?.name || 'Barsha Datta');
  const [avatar, setAvatar] = useState(initialData?.avatar || AVATAR_OPTIONS[0]);
  const [selectedRole, setSelectedRole] = useState(initialData?.role || ROLES[0].label);
  const [useCase, setUseCase] = useState(initialData?.useCase || USE_CASES[0].label);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    const isStudent = selectedRole.toLowerCase().includes('student');

    const draft: DraftProfile = {
      name: name.trim(),
      avatar,
      role: selectedRole,
      useCase,
      themePreference: 'Warm Paper',
      isStudent,
    };

    onComplete(draft);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-between p-4 sm:p-8 font-sans antialiased text-zinc-900">
      {/* Header Bar */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between pb-6 border-b border-zinc-200/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-sm">
            V
          </div>
          <span className="font-bold text-sm tracking-tight text-zinc-900">VocalNote</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
            Step 2 of 5 · Profile Setup
          </span>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="max-w-xl w-full mx-auto my-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm"
        >
          {/* Header Title */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              Create Your Profile
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Personalize your workspace before authenticating your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Name Input */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Display Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. Barsha Datta"
                  className={`w-full min-h-[48px] px-4 rounded-xl bg-zinc-50 border ${
                    error ? 'border-rose-400 focus:ring-1 focus:ring-rose-400' : 'border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900'
                  } text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all`}
                />
              </div>
              {error && <p className="text-[11px] text-rose-500 mt-1.5 font-medium">{error}</p>}
            </div>

            {/* 2. Avatar Choice */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Choose an Avatar
              </label>
              <div className="grid grid-cols-6 gap-2 sm:gap-3">
                {AVATAR_OPTIONS.map((imgUrl, idx) => {
                  const isSelected = avatar === imgUrl;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(imgUrl)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all p-0.5 ${
                        isSelected
                          ? 'border-zinc-900 ring-2 ring-zinc-900/20 scale-105'
                          : 'border-zinc-200 hover:border-zinc-400 opacity-80 hover:opacity-100'
                      }`}
                      title={`Avatar option ${idx + 1}`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Avatar ${idx + 1}`}
                        className="w-full h-full object-cover rounded-xl"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <Check size={14} className="text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Primary Role / Persona */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Primary Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.label;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.label)}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                          : 'bg-zinc-50 hover:bg-zinc-100/70 border-zinc-200/80 text-zinc-800'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-white/10 text-white' : 'bg-white border border-zinc-200 text-zinc-700'}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{r.label}</div>
                        <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                          {r.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Primary Use Case */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Primary Goal
              </label>
              <div className="space-y-1.5">
                {USE_CASES.map((u) => {
                  const isSelected = useCase === u.label;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUseCase(u.label)}
                      className={`w-full min-h-[42px] px-3.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-zinc-100 border-zinc-900 text-zinc-900 font-semibold'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      <span>{u.label}</span>
                      {isSelected && <Check size={14} className="text-zinc-900 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Button (min 48px touch target) */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full min-h-[48px] px-4 rounded-xl bg-zinc-900 hover:bg-black active:scale-[0.99] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Continue to Authentication</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>

          {/* Jump to sign-in for existing users */}
          <div className="mt-6 pt-5 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onAlreadyHaveAccount}
                className="font-semibold text-zinc-900 hover:underline ml-0.5"
              >
                Sign In Directly
              </button>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl w-full mx-auto text-center text-xs text-zinc-400 pt-4">
        <span>Step 2 of the 5-step sequential onboarding flow</span>
      </footer>
    </div>
  );
};
