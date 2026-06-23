import { motion } from "framer-motion";

const STATS = [
  { emoji: "🎯", value: "95%", label: "found a career path they love" },
  { emoji: "📈", value: "500+", label: "students already enrolled" },
  { emoji: "💰", value: "2x", label: "higher salary confidence" },
];

export default function SocialProof() {
  return (
    <section className="w-full py-12 px-4 bg-black border-t border-white/8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Students Trust Collade AI
          </h2>
          <p className="text-white/40 text-base">Real results. No fluff.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/4 border border-white/10 rounded-2xl p-6 text-center"
            >
              <div className="text-4xl mb-3">{s.emoji}</div>
              <p className="text-4xl font-extrabold text-yellow-400 font-heading mb-1">{s.value}</p>
              <p className="text-base text-white/50 leading-snug">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}