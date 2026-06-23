import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const CAREERS = [
  {
    title: "AI / Machine Learning Engineer", emoji: "🤖", global: "$100–180k (USA / EU)",
    local: [{ flag: "🇮🇳", label: "India", val: "₹12–25L" }, { flag: "🇵🇭", label: "Philippines", val: "₱600k–1.5M" }, { flag: "🇲🇾", label: "Malaysia", val: "RM 60–130k" }, { flag: "🇮🇩", label: "Indonesia", val: "Rp 180–450M" }],
  },
  {
    title: "UX / Product Designer", emoji: "🎨", global: "$80–140k (USA / EU)",
    local: [{ flag: "🇮🇳", label: "India", val: "₹8–18L" }, { flag: "🇵🇭", label: "Philippines", val: "₱400k–1M" }, { flag: "🇲🇾", label: "Malaysia", val: "RM 42–90k" }, { flag: "🇮🇩", label: "Indonesia", val: "Rp 120–320M" }],
  },
  {
    title: "Data Scientist", emoji: "📊", global: "$90–160k (USA / EU)",
    local: [{ flag: "🇮🇳", label: "India", val: "₹10–22L" }, { flag: "🇵🇭", label: "Philippines", val: "₱500k–1.3M" }, { flag: "🇲🇾", label: "Malaysia", val: "RM 55–120k" }, { flag: "🇮🇩", label: "Indonesia", val: "Rp 150–400M" }],
  },
  {
    title: "Cybersecurity Analyst", emoji: "🔐", global: "$85–155k (USA / EU)",
    local: [{ flag: "🇮🇳", label: "India", val: "₹8–20L" }, { flag: "🇵🇭", label: "Philippines", val: "₱450k–1.2M" }, { flag: "🇲🇾", label: "Malaysia", val: "RM 48–100k" }, { flag: "🇮🇩", label: "Indonesia", val: "Rp 130–360M" }],
  },
];

export default function SampleCareers({ onLogin }) {
  return (
    <section className="w-full py-12 px-4 bg-black border-t border-white/8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Real Careers. Real Salaries.
          </h2>
          <p className="text-white/40 text-base">Sign in free to unlock full study paths and roadmaps.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {CAREERS.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-white/3 border border-white/8 rounded-2xl p-5 relative overflow-hidden group hover:border-yellow-400/20 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.emoji}</span>
                  <h3 className="font-bold text-white text-base leading-snug">{c.title}</h3>
                </div>
                <span className="text-[10px] bg-green-500/15 border border-green-500/25 text-green-400 px-2 py-0.5 rounded-full font-bold shrink-0 ml-2">AI-SAFE</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wide">Global</span>
                  <p className="text-yellow-400 font-bold text-sm mt-0.5">{c.global}</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {c.local.map((l) => (
                    <div key={l.label} className="bg-white/4 rounded-lg px-2.5 py-1.5">
                      <p className="text-white/35 text-[10px]">{l.flag} {l.label}</p>
                      <p className="text-white text-xs font-semibold">{l.val}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Blurred roadmap teaser */}
              <div className="relative mt-4 pt-3 border-t border-white/5">
                <div className="blur-sm select-none pointer-events-none">
                  <p className="text-xs text-white/40 mb-1">Study Roadmap</p>
                  <p className="text-sm text-white/50">B.Tech / BSc → Internship → Senior Role at top company</p>
                </div>
                <button
                  onClick={onLogin}
                  className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg"
                >
                  <Lock className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">Sign in to unlock</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onLogin}
            className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black px-10 py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-yellow-400/15"
            style={{ minHeight: 52 }}
          >
            Unlock All Careers — Free →
          </button>
          <p className="text-sm text-white/30 mt-3">5 free credits on signup. No card needed.</p>
        </div>
      </div>
    </section>
  );
}