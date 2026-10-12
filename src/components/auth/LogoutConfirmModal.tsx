import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LogoutConfirmModal: React.FC = () => {
  const { isLogoutModalOpen, closeLogoutModal, confirmLogout, user } = useAuth();

  if (!isLogoutModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeLogoutModal}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 border border-white/80 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)] relative z-10 overflow-hidden"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shrink-0">
            <LogOut size={24} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Sign out of Vocal Note?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to log out of{' '}
              <span className="font-semibold text-slate-700">{user?.email || 'your account'}</span>?
            </p>
          </div>

          <button
            onClick={closeLogoutModal}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Cancel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-2.5 text-xs text-slate-600">
          <ShieldCheck size={16} className="text-teal-600 shrink-0" />
          <span>Your local voice notes, canvas sketches, and settings remain securely preserved.</span>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={closeLogoutModal}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-all active:scale-95"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={confirmLogout}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
