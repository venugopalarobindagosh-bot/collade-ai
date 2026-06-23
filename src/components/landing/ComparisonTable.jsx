import { motion } from "framer-motion";

const ROWS = [
  { feature: "Cost", counselor: "₹10,000–50,000", collade: "₹500 one-time" },
  { feature: "Time to get answers", counselor: "⏳ Takes 2 weeks for an appointment", collade: "⚡ Get your roadmap in 30 seconds" },
  { feature: "Data source", counselor: "😶 Based on one person's opinion", collade: "✅ Real-time global job data & AI trends" },
  { feature: "Future-proof careers", counselor: "❌ Shows outdated careers", collade: "✅ AI-resistant careers only" },
  { feature: "Salary data", counselor: "❌ Vague estimates", collade: "✅ Specific India + abroad numbers" },
  { feature: "Global degrees", counselor: "❌ India only", collade: "✅ Worldwide universities" },
  { feature: "Interest matching", counselor: "❌ Basic questionnaire", collade: "✅ AI-powered algorithm" },
  { feature: "Compare paths", counselor: "❌ Not available", collade: "✅ Side-by-side comparison" },
  { feature: "Availability", counselor: "1–2 sessions only", collade: "✅ 24/7 — always available" },
  { feature: "Free trial", counselor: "❌ No", collade: "✅ 5 free searches, no card" },
];

export default function ComparisonTable() {
  return (
    <section className="py-20 px-4 bg-black border-b border-white/8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Why Students Choose Collade Over Expensive Counselors
          </h2>
          <p className="text-white/40 text-sm">Same clarity. A fraction of the cost. Available right now.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden border border-white/8 rounded-2xl"
        >
          <div className="grid grid-cols-3 bg-white/3 border-b border-white/8">
            <div className="p-4 text-xs font-bold text-white/30 uppercase tracking-wider">Feature</div>
            <div className="p-4 text-xs font-bold text-white/30 uppercase tracking-wider text-center border-l border-white/8">Traditional Counselors</div>
            <div className="p-4 text-xs font-bold text-yellow-400/80 uppercase tracking-wider text-center border-l border-white/8">Collade AI ✅</div>
          </div>

          {ROWS.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 border-b border-white/5 last:border-0 ${i % 2 === 0 ? "bg-transparent" : "bg-white/2"}`}>
              <div className="p-3.5 text-sm font-semibold text-white/70">{row.feature}</div>
              <div className="p-3.5 text-xs text-white/30 text-center border-l border-white/5">{row.counselor}</div>
              <div className="p-3.5 text-xs text-yellow-400/70 font-semibold text-center border-l border-white/5">{row.collade}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}