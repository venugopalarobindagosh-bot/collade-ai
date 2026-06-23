import { motion } from "framer-motion";

const FEATURES = [
  { emoji: "🔮", title: "Careers AI Won't Replace", desc: "Future-proof careers that will survive the AI revolution and thrive in the next decade." },
  { emoji: "💰", title: "Real Salary Data", desc: "Local salaries (Indonesia, India, Vietnam & more) + international USD figures — no vague ranges." },
  { emoji: "🌍", title: "Global Degrees", desc: "Universities in India, USA, UK, Canada, and Australia. Find the right program anywhere." },
  { emoji: "🎯", title: "Interest Matching", desc: "Careers matched to YOUR interests — not what everyone else is doing." },
  { emoji: "📊", title: "Compare Careers", desc: "Side-by-side comparison of any 2 careers — salary, growth, work locations, and more." },
  { emoji: "📍", title: "Work Locations", desc: "See exactly where you can work — any Indian city, abroad, or remote from home." },
];

export default function FeaturesGrid() {
  return (
    <section className="w-full py-12 px-4 bg-black border-t border-white/8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Everything You Need to Plan Your Future
          </h2>
          <p className="text-white/40 text-base">One platform. All the answers. Powered by AI.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/3 border border-white/8 rounded-2xl p-5 flex gap-4 items-start hover:border-yellow-400/25 transition-all"
            >
              <div className="text-3xl shrink-0">{f.emoji}</div>
              <div>
                <h3 className="font-bold text-white text-base mb-1">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}