import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide completely
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="p-2 md:px-3 md:py-2.5 rounded-xl md:rounded-2xl transition-all bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 text-xs font-bold shrink-0"
        title="Install Vocal Note App"
        aria-label="Install Vocal Note as App"
      >
        <Download size={16} />
        <span className="hidden lg:inline text-[11px] font-black uppercase tracking-wider">INSTALL</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="p-2 md:px-3 md:py-2.5 rounded-xl md:rounded-2xl transition-all bg-black/5 hover:bg-black/10 text-slate-700 border border-black/5 flex items-center gap-1.5 text-xs font-bold shrink-0"
          title="Install on iPhone / iPad"
          aria-label="Install on iPhone / iPad"
        >
          <Share size={15} className="text-teal-600" />
          <span className="hidden lg:inline text-[11px] font-black uppercase tracking-wider">INSTALL</span>
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-black/10 text-slate-800"
              >
                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Download size={18} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">Install Vocal Note</h3>
                  </div>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <p className="text-xs">
                      Tap the <strong className="text-slate-900">Share</strong> button in Safari's toolbar.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <p className="text-xs">
                      Scroll down and tap <strong className="text-slate-900">Add to Home Screen</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <p className="text-xs">
                      Tap <strong className="text-slate-900">Add</strong> in the top right to open full screen.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-5 w-full rounded-2xl bg-slate-900 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 transition"
                >
                  Got It
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};
