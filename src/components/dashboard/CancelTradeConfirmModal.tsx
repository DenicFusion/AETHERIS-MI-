import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface CancelTradeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isCancelling: boolean;
}

export function CancelTradeConfirmModal({ isOpen, onClose, onConfirm, isCancelling }: CancelTradeConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={isCancelling ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-[#121420] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500/0 via-rose-500 to-rose-500/0" />
            
            <button
              onClick={isCancelling ? undefined : onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              
              <h3 className="text-lg font-bold text-white tracking-tight mb-2">Cancel Trade?</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to cancel and disable this trade? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Keep Trade
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-lg shadow-rose-500/20 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isCancelling ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Cancelling...
                    </span>
                  ) : (
                    "Yes, Cancel"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
