import { useEffect, useState } from "react";
import { CheckCircle2, Star, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { getCurrentUser } from "@/lib/auth";
import { fetchUserCredits, createUserCredits, updateUserCreditsByUserId } from "@/api/credits";

export default function SuccessPro() {
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    async function grantCredits() {
      let user = null;
      for (let i = 0; i < 10; i++) {
        try { user = await getCurrentUser(); } catch(e) {}
        if (user) break;
        await new Promise(r => setTimeout(r, 500));
      }

      if (!user) { setVerifying(false); return; }

      try {
        const existing = await fetchUserCredits();
        if (existing) {
          await updateUserCreditsByUserId(user.id, {
            credits_remaining: (existing.credits_remaining || 0) + 500,
            plan: "pro",
            access_locked: false,
          });
        } else {
          await createUserCredits({
            credits_remaining: 500,
            plan: "pro",
            access_locked: false,
          });
        }
      } catch(e) {
        // silently ignore
      }
      setVerifying(false);
    }

    grantCredits();
  }, []);

  const FEATURES = [
    "500 credits to power your research",
    "AI career matching & full salary insights",
    "Compare careers side by side",
    "Global degree finder — all countries",
    "Career reports & counselor-grade PDFs",
    "Professional certificates for all paths",
    "Career simulations & FutureScore",
  ];

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {verifying ? (
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50 text-sm">Activating your Pro plan…</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            {/* Icon */}
            <div className="h-20 w-20 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-purple-400" />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">
              <Star className="h-3 w-3" /> Pro Plan Activated
            </div>

            {/* Headline */}
            <h1 className="font-heading text-3xl font-extrabold text-white mb-2">Payment Successful!</h1>
            <p className="text-white/50 text-base mb-8">You now have <span className="text-purple-400 font-bold">500 credits</span> to research and learn.</p>

            {/* Features */}
            <div className="bg-white/4 border border-purple-500/15 rounded-2xl p-6 text-left mb-8 space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-sm text-white/80">{f}</span>
                </div>
              ))}
            </div>

            {/* Credit badge */}
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 text-purple-400 text-sm font-bold px-5 py-3 rounded-xl mb-8">
              <Star className="h-4 w-4" />
              500 credits added to your account
            </div>

            {/* CTA */}
            <button
              onClick={() => window.location.href = "/dashboard"}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              Go to Dashboard <ArrowRight className="h-5 w-5" />
            </button>
            <p className="text-xs text-white/30 mt-4">Credits never expire · Use anytime</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}