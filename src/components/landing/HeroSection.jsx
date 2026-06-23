import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, TrendingUp, Globe, DollarSign, Shield } from "lucide-react";

const QUIZ_QUESTIONS = [
  {
    q: "What are you most interested in?",
    options: ["Technology & Computers", "Business & Finance", "Creative & Design", "Healthcare & Science", "Engineering & Building", "Not sure yet"],
  },
  {
    q: "How important is salary to you?",
    options: ["Very important — high earning potential", "Somewhat important — balance is fine", "Not important — passion matters more"],
  },
  {
    q: "Where do you want to work?",
    options: ["India (any city)", "Abroad (USA, UK, Canada, Australia)", "Remote / Work from home", "Not sure yet"],
  },
  {
    q: "What's your current education level?",
    options: ["High school (8th–10th)", "Higher secondary (11th–12th)", "College / University", "Graduated / Working"],
  },
];

const VALUE_BULLETS = [
  { icon: Shield, text: "Know which careers AI won't replace in the next 10 years" },
  { icon: DollarSign, text: "See real salaries — local currency + USD globally, no vague ranges" },
  { icon: Globe, text: "Find the exact degree & university to get there" },
  { icon: TrendingUp, text: "Compare paths side-by-side and pick the right one for YOU" },
];

const URGENCY_STATS = [
  { num: "90%", label: "of degrees will be disrupted by AI by 2030" },
  { num: "$30k+", label: "starting salary for AI-safe careers globally" },
  { num: "30 sec", label: "to get your personalised career match" },
];

export default function HeroSection({ quizStep, quizStarted, onAnswer, onStartQuiz, onLogin }) {
  return (
    <section className="w-full pt-20 pb-12 px-4 bg-black relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 bg-yellow-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-32 right-0 w-48 h-48 bg-yellow-400/3 rounded-full blur-2xl pointer-events-none hidden sm:block" />

      <div className="max-w-2xl mx-auto relative">

        {/* Urgency pill */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-5">
          <span className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm px-4 py-2 rounded-full font-bold animate-pulse">
            ⚠️ 90% of students are choosing careers AI will automate
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight text-center"
        >
          Find Careers{" "}
          <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            AI Won't Replace.
          </span>
          <br />
          <span className="text-3xl sm:text-4xl text-white/80">Start with 5 Free Credits.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 text-white/60 text-base sm:text-lg text-center max-w-xl mx-auto leading-relaxed"
        >
          See <strong className="text-white">what to study</strong>, what it leads to, <strong className="text-white">how much you'll earn</strong>, and where you can work — in under 30 seconds.
        </motion.p>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 grid grid-cols-3 gap-2 sm:gap-4"
        >
          {URGENCY_STATS.map((s, i) => (
            <div key={i} className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
              <p className="text-yellow-400 font-extrabold text-lg sm:text-2xl font-heading">{s.num}</p>
              <p className="text-white/40 text-[10px] sm:text-xs leading-snug mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Value bullets */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
        >
          {VALUE_BULLETS.map((b, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/3 border border-white/6 rounded-xl px-4 py-3">
              <b.icon className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white/70 leading-snug">{b.text}</p>
            </div>
          ))}
        </motion.div>

        {/* Quiz Widget */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6 w-full bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-7"
        >
          {!quizStarted && quizStep === 0 && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs px-3 py-1.5 rounded-full mb-4 font-medium">
                ✨ 4 questions — takes 30 seconds
              </div>
              <p className="text-white font-bold text-base sm:text-lg mb-2">
                Which career is right for YOU?
              </p>
              <p className="text-white/40 text-sm mb-6">
                Answer 4 quick questions and see AI-safe careers matched to your interests, salary goals, and location.
              </p>
              <button
                onClick={onStartQuiz}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-yellow-400/20 active:scale-95"
                style={{ minHeight: 56 }}
              >
                Start with 5 Free Credits →
              </button>
              <p className="text-sm text-white/30 mt-3">No credit card. No sign-up required to take the quiz.</p>
            </div>
          )}

          {quizStarted && quizStep >= 1 && quizStep <= 4 && (
            <AnimatePresence mode="wait">
              <motion.div
                key={quizStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${i <= quizStep ? "bg-yellow-400" : "bg-white/10"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-white/40 font-medium shrink-0">Q{quizStep}/4</span>
                </div>
                <p className="font-bold text-white mb-4 text-base sm:text-lg">{QUIZ_QUESTIONS[quizStep - 1].q}</p>
                <div className="space-y-2.5">
                  {QUIZ_QUESTIONS[quizStep - 1].options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onAnswer(opt)}
                      className="w-full text-left px-4 py-3.5 rounded-xl border border-white/10 hover:border-yellow-400/50 hover:bg-yellow-400/5 active:bg-yellow-400/10 text-base text-white/70 hover:text-white transition-all font-medium"
                      style={{ minHeight: 52 }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {quizStep === 5 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="h-16 w-16 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-yellow-400" />
              </div>
              <p className="font-bold text-white text-xl mb-2">Your Results Are Ready! 🎉</p>
              <p className="text-base text-white/50 mb-5 max-w-xs mx-auto">
                We've matched careers to your answers. Sign in free to see your personalised roadmap + 5 free credits.
              </p>
              <button
                onClick={onLogin}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-yellow-400/20 active:scale-95"
                style={{ minHeight: 56 }}
              >
                Start with 5 Free Credits →
              </button>
              <p className="text-sm text-white/30 mt-3">Google Sign-In · No credit card required</p>
            </motion.div>
          )}
        </motion.div>

        {/* Trust row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex flex-wrap justify-center gap-3 mt-5 text-sm text-white/30">
          {["✅ 500+ students enrolled", "🔒 Google Sign-In", "🚫 No subscription ever"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}