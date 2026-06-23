import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  { q: "Do I need any technical knowledge?", a: "No. Collade AI is made for students of all streams — Science, Commerce, Arts. Just answer honestly and we'll guide you to the right career." },
  { q: "What are credits? How do they work?", a: "1 credit = 1 career search or AI action. Each search shows you salary, study path, work locations, and global degrees. Credits never expire — use them at your own pace." },
  { q: "Can I really get 5 free credits?", a: "Yes! Sign in with Google and get 5 credits immediately. No credit card required. Try before you buy — no strings attached." },
  { q: "Is my data safe?", a: "Absolutely. We use Google Sign-In for security. We never sell or share your personal data. You can read our full Privacy Policy below." },
  { q: "Can I cancel anytime?", a: "Yes. There is no subscription and no auto-renewal. You buy credits once and use them whenever you want — no recurring charges ever." },
  { q: "What if I'm not satisfied?", a: "Unused credits are refundable within 7 days of purchase. No questions asked. Just email us at support@collade.ai." },
];

export default function FAQSection() {
  const [open, setOpen] = useState(null);

  return (
    <section className="py-20 px-4 bg-black border-b border-white/8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-white/40 text-sm">Everything you need to know before you start</p>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/3 border border-white/8 rounded-xl overflow-hidden hover:border-white/15 transition-colors"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
              >
                <span className="font-semibold text-white text-sm">{faq.q}</span>
                <ChevronDown className={`h-4 w-4 text-white/30 flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm text-white/40 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}