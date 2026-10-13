import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Sparkles, ArrowRight, Volume2, Shield } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  brandName?: string;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  brandName = 'VocalNote',
  durationMs = 2600,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 150);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  return (
    <div className="fixed inset-0 z-[1500] bg-zinc-950 text-white flex flex-col justify-between p-6 sm:p-10 font-sans antialiased overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-teal-500/15 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header branding */}
      <header className="relative z-10 flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-black text-sm shadow-md">
            V
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-200">
            {brandName}
          </span>
        </div>

        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60">
          Step 1 of 5 · Welcome
        </span>
      </header>

      {/* Central Welcome Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center max-w-lg mx-auto text-center my-auto">
        {/* Animated Soundwave & Icon Centerpiece */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-8"
        >
          {/* Radial pulse rings */}
          <div className="absolute -inset-4 rounded-3xl border border-indigo-500/30 animate-ping opacity-30 pointer-events-none" />
          <div className="absolute -inset-8 rounded-3xl border border-teal-500/20 animate-pulse pointer-events-none" />

          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/80 shadow-2xl flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent opacity-60" />

            {/* Simulated Live Audio Waveform Bars */}
            <div className="flex items-end gap-1.5 h-10 relative z-10">
              {[0.4, 0.9, 0.6, 1.0, 0.7, 0.5, 0.8].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: ['30%', `${h * 100}%`, '35%'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8 + (i % 3) * 0.2,
                    ease: 'easeInOut',
                    delay: i * 0.08,
                  }}
                  className="w-1.5 bg-gradient-to-t from-indigo-400 to-teal-300 rounded-full"
                />
              ))}
            </div>

            <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <Sparkles size={10} className="text-emerald-300" />
            </div>
          </div>
        </motion.div>

        {/* Welcome Typography */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Volume2 size={13} />
            <span>Voice-First Spatial Workspace</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Welcome to <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">{brandName}</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
            Capture unfiltered voice memos, sketch freely on an infinite spatial board, and organize thoughts in seconds.
          </p>
        </motion.div>

        {/* Progress Bar & Fast Transition Button */}
        <div className="w-full max-w-xs mt-8 space-y-4">
          <div className="w-full h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden p-0.5">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>INITIALIZING</span>
            <span>{progress}%</span>
          </div>

          {/* Quick Skip / Continue CTA */}
          <button
            type="button"
            onClick={onComplete}
            className="w-full min-h-[46px] px-4 rounded-xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Get Started</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </main>

      {/* Footer reassurance */}
      <footer className="relative z-10 flex items-center justify-center gap-2 text-xs text-zinc-600 max-w-md mx-auto">
        <Shield size={13} className="text-zinc-500" />
        <span>Private, encrypted, client-side intelligence</span>
      </footer>
    </div>
  );
};
