import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileStickyBar({ onLogin }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/10 px-4 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={onLogin}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-4 rounded-xl font-extrabold text-base shadow-lg shadow-yellow-400/20"
            style={{ minHeight: 52 }}
          >
            Sign In with Google — Free →
          </button>
          <p className="text-center text-white/30 text-xs mt-2">5 free credits. No card needed.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}