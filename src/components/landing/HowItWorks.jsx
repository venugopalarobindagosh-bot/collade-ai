import { motion } from "framer-motion";

const STEPS = [
  { emoji: "🎯", title: "Take the Quiz", time: "30 seconds", desc: "Tell us your interests, salary expectations, and work location." },
  { emoji: "🔐", title: "Sign in with Google", time: "10 seconds", desc: "Get 5 FREE credits instantly. No credit card. Safe Google Sign-In." },
  { emoji: "🚀", title: "Explore Careers", time: "Use credits", desc: "See salaries, study paths, work locations. Compare careers side by side." },
];

export default function HowItWorks({ onLogin }) {
  return (
    <section className="w-full py-12 px-4 bg-black border-t border-white/8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mb-2">
            From Confusion to Clarity in 3 Steps
          </h2>
          <p className="text-white/40 text-base">No technical knowledge needed.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex-1 text-center bg-white/3 border border-white/8 rounded-2xl p-5"
            >
              <div className="relative inline-block mb-4">
                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mx-auto">
                  {step.emoji}
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-yellow-400 text-black text-xs font-extrabold flex items-center justify-center">
                  {i + 1}
                </div>
              </div>
              <h3 className="font-bold text-white text-base mb-1">{step.title}</h3>
              <p className="text-xs font-semibold text-yellow-400/70 mb-2">⏱ {step.time}</p>
              <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onLogin}
            className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black px-10 py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-yellow-400/15"
            style={{ minHeight: 52 }}
          >
            Start Now — It's Free →
          </button>
        </div>
      </div>
    </section>
  );
}