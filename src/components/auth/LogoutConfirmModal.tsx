import React from 'react';
import { motion } from 'motion/react';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';

export const LogoutConfirmModal: React.FC = () => {
  const { isLogoutModalOpen, closeLogoutModal, confirmLogout, user } = useAuth();
  const { resetRouteToLogin } = useAppRouter();

  const handleConfirm = () => {
    confirmLogout();
    resetRouteToLogin();
  };

  if (!isLogoutModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans antialiased text-zinc-900">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeLogoutModal}
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl border border-zinc-200/80 shadow-lg relative z-10 p-5 sm:p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              Log out of your account?
            </h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Signed in as <span className="font-semibold text-zinc-800">{user?.email || 'user'}</span>. Your notes remain saved locally.
            </p>
          </div>
          <button
            onClick={closeLogoutModal}
            className="w-8 h-8 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors min-h-[36px] min-w-[36px]"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2.5">
          <button
            type="button"
            onClick={closeLogoutModal}
            className="flex-1 min-h-[48px] px-4 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 min-h-[48px] px-4 rounded-xl bg-zinc-100 hover:bg-rose-50 text-rose-600 border border-zinc-200 hover:border-rose-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
