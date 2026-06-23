import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function FinalCTA({ onLogin }) {
  return (
    <section className="w-full py-14 px-4 bg-black border-t border-white/8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-64 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-xl mx-auto text-center relative">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading text-3xl sm:text-4xl font-extrabold text-white mb-3"
        >
          Stop Guessing Your Future.{" "}
          <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">Start Planning It.</span>
        </motion.h2>
        <p className="text-white/50 text-base mb-2">Join 500+ students who found their career path with Collade AI.</p>
        <p className="text-white/30 text-sm mb-8">No credit card required. Sign in with Google.</p>

        <button
          onClick={onLogin}
          className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black px-10 py-4 rounded-xl font-extrabold text-base transition-all shadow-2xl shadow-yellow-400/20 inline-flex items-center justify-center gap-2"
          style={{ minHeight: 52 }}
        >
          Get 5 Free Credits <ArrowRight className="h-5 w-5" />
        </button>

        <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-white/25">
          {["🔒 No auto-renewal", "💸 No hidden fees", "🔄 7-day refund on unused credits"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}