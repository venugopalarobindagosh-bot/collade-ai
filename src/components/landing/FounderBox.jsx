import { motion } from "framer-motion";

export default function FounderBox() {
  return (
    <section className="py-16 px-4 bg-black border-b border-white/8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-white/4 to-yellow-400/4 border border-yellow-400/15 rounded-2xl p-8 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-3xl mx-auto mb-5">
            👨‍💻
          </div>
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest mb-4">
            Built by a student, for students
          </div>
          <p className="text-white text-lg font-bold mb-3 font-heading">
            "I watched my friends pick dead-end degrees because no one told them the truth."
          </p>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            I'm 14 years old and I built Collade because I was frustrated. Every career counselor my friends saw gave generic advice that cost thousands of rupees. Meanwhile, AI is reshaping every industry — and nobody was warning students.
            <br /><br />
            So I built Collade. Not a corporate product. A tool built by someone who actually gets it — because I'm living it too.
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-400/15 border border-yellow-400/25 flex items-center justify-center text-sm font-extrabold text-yellow-400">
              C
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Founder, Collade AI</p>
              <p className="text-white/30 text-xs">Age 14 · Building the future of career guidance</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}