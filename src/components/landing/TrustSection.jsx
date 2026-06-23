import { motion } from "framer-motion";

const TESTIMONIALS = [
  {
    name: "Rahul S.",
    role: "12th Student, Mumbai 🇮🇳",
    tag: "Saved 2 years of confusion",
    text: "I was completely lost after 12th. Collade showed me careers I never knew existed. For just ₹499 it felt like nothing — now I'm pursuing AI Engineering at VIT!",
    avatar: "RS",
  },
  {
    name: "Siti N.",
    role: "University Student, Jakarta 🇮🇩",
    tag: "Finally found direction",
    text: "I used Collade to compare Data Science and Business Analytics. The career roadmaps were so detailed — and Rp 99.000 for this level of guidance? Cheaper than one textbook.",
    avatar: "SN",
  },
  {
    name: "Aditya K.",
    role: "Gap Year, Delhi 🇮🇳",
    tag: "Found my true calling",
    text: "My parents wanted me to be a doctor. Collade showed me healthcare administration — same field, better work-life balance, great salary. ₹499 for clarity that a ₹2 lakh counselor couldn't give me.",
    avatar: "AK",
  },
  {
    name: "Nguyen T.",
    role: "College Student, Ho Chi Minh City 🇻🇳",
    tag: "Changed how I plan my future",
    text: "Collade showed me cybersecurity careers I never considered — the roadmaps, skills, and global prospects were brilliant. 141.517 đồng for all of this? I've spent more on a cà phê.",
    avatar: "NT",
  },
  {
    name: "Priya M.",
    role: "College Student, Bangalore 🇮🇳",
    tag: "Salary data was spot on",
    text: "The career insights helped me choose between engineering and UX design. I picked design and landed an internship within 3 months. Worth every credit.",
    avatar: "PM",
  },
  {
    name: "Arif H.",
    role: "12th Student, Dhaka 🇧🇩",
    tag: "Opened my eyes",
    text: "I had no idea renewable energy engineering was booming in South Asia. Collade showed me the exact study path and what it leads to globally. For ৳550, it gave me more direction than years of searching.",
    avatar: "AH",
  },
];

const COLLEGES = [
  "IIT Bombay 🇮🇳", "Delhi University 🇮🇳", "BITS Pilani 🇮🇳",
  "UI Jakarta 🇮🇩", "VNU Hanoi 🇻🇳", "BUET Dhaka 🇧🇩",
  "Chulalongkorn Univ 🇹🇭", "NUS Singapore 🇸🇬", "Manipal 🇮🇳",
];

export default function TrustSection() {
  return (
    <section className="py-20 px-4 bg-black border-b border-white/8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Trusted by Students Around the World 🌏
          </h2>
          <p className="text-white/40 text-sm">From India, Indonesia, Vietnam, Bangladesh, Thailand & beyond</p>
        </div>

        {/* College row */}
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {COLLEGES.map((c) => (
            <div key={c} className="bg-white/4 border border-white/10 rounded-lg px-4 py-2 text-xs font-semibold text-white/50">
              🎓 {c}
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-yellow-400/20 transition-all"
            >
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, si) => (
                  <span key={si} className="text-yellow-400 text-sm">★</span>
                ))}
              </div>
              <div className="text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest mb-3">{t.tag}</div>
              <p className="text-sm text-white/60 leading-relaxed mb-5 italic">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="h-9 w-9 rounded-full bg-white/8 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/30">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}