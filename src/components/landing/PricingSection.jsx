import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

const LOCALE_PRICING = {
  IN:      { starter: "₹500",         pro: "₹1,000",    unlimited: "₹5,000" },
  ID:      { starter: "Rp 99.000",    pro: "Rp 199.000", unlimited: "Rp 999.000" },
  VN:      { starter: "141.000 ₫",    pro: "282.000 ₫",  unlimited: "1.400.000 ₫" },
  BD:      { starter: "৳550",         pro: "৳1,100",     unlimited: "৳5,500" },
  DEFAULT: { starter: "$6",           pro: "$12",        unlimited: "$60" },
};

function usePricing() {
  const [country, setCountry] = useState(null);
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => setCountry(d.country_code || "DEFAULT"))
      .catch(() => setCountry("DEFAULT"));
  }, []);
  const key = country && LOCALE_PRICING[country] ? country : "DEFAULT";
  return { pricing: LOCALE_PRICING[key], loaded: country !== null };
}

const PLANS = [
  {
    id: "starter",
    label: "Starter",
    priceKey: "starter",
    payUrl: "https://rzp.io/rzp/EFCpj3Eb",
    credits: "50 credits",
    cta: "Get 50 Credits →",
    highlight: false,
    features: ["50 career searches", "Salary insights (India & abroad)", "Global degree finder", "Quiz results & matching"],
  },
  {
    id: "pro",
    label: "Pro",
    priceKey: "pro",
    payUrl: "https://rzp.io/rzp/tOlFbsLQ",
    credits: "500 credits",
    savings: "🔥 SAVE 80%",
    cta: "Get 500 Credits →",
    highlight: true,
    features: ["500 career searches", "Salary insights (India & abroad)", "Global degree finder", "Compare careers side by side", "All quiz results", "Career reports & certificates"],
  },
  {
    id: "unlimited",
    label: "Unlimited",
    priceKey: "unlimited",
    payUrl: "https://rzp.io/rzp/JzTyh74C",
    credits: "Unlimited for 6 months",
    cta: "Get Unlimited Access →",
    highlight: false,
    features: ["Unlimited career searches", "Everything in Pro", "6 months full access", "Priority support"],
  },
];

export default function PricingSection({ onLogin }) {
  const { pricing, loaded } = usePricing();

  return (
    <section id="pricing" className="w-full py-12 px-4 bg-black border-t border-white/8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Simple Pricing. Pay Only When You Need More.
          </h2>
          <p className="text-white/40 text-base">No subscriptions. No confusion. Pay once, use whenever.</p>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-2xl p-6 border ${
                plan.highlight
                  ? "border-yellow-400/40 bg-gradient-to-b from-yellow-400/8 to-transparent shadow-xl shadow-yellow-400/5"
                  : "border-white/8 bg-white/3"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                  ⭐ Most Popular
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-heading font-bold text-white text-base">{plan.label}</p>
                  <p className="text-3xl font-extrabold text-white mt-1">
                    {loaded ? pricing[plan.priceKey] : <span className="inline-block w-16 h-8 bg-white/10 rounded animate-pulse" />}
                  </p>
                  <p className="text-sm text-white/40 mt-0.5">{plan.credits}</p>
                  {plan.savings && <p className="text-sm text-yellow-400 font-bold mt-1">{plan.savings}</p>}
                </div>
                <div className="flex flex-col gap-2 sm:items-end flex-shrink-0">
                  <ul className="space-y-1 mb-2">
                    {plan.features.slice(0, 3).map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2 text-sm text-white/50">
                        <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${plan.highlight ? "text-yellow-400" : "text-white/25"}`} />
                        {f}
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-xs text-white/25 ml-5">+{plan.features.length - 3} more</li>
                    )}
                  </ul>
                  <button
                    onClick={() => window.open(plan.payUrl, "_blank")}
                    className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-extrabold text-sm transition-all whitespace-nowrap ${
                      plan.highlight
                        ? "bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black shadow-lg shadow-yellow-400/15"
                        : "bg-white/6 hover:bg-white/10 text-white/70 border border-white/10"
                    }`}
                    style={{ minHeight: 52 }}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-yellow-400/8 border border-yellow-400/20 rounded-xl px-5 py-3 text-base text-yellow-400 font-medium">
            💰 New users get <strong>5 FREE credits</strong> on signup. No purchase needed to start.
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-sm text-white/30">
          {["✅ UPI", "✅ Cards", "✅ Google Pay", "🔒 Razorpay Secure"].map((t) => (
            <span key={t} className="bg-white/4 border border-white/8 px-3 py-1.5 rounded-lg">{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}