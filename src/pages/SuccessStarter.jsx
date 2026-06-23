import { useEffect, useState } from "react";
import { CheckCircle2, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { getCurrentUser } from "@/lib/auth";
import { fetchUserCredits, createUserCredits, updateUserCreditsByUserId } from "@/api/credits";

export default function SuccessStarter() {
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    async function grantCredits() {
      // Wait for auth
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
            credits_remaining: (existing.credits_remaining || 0) + 50,
            plan: "basic",
            access_locked: false,
          });
        } else {
          await createUserCredits({
            credits_remaining: 50,
            plan: "basic",
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
    "50 credits to research any career",
    "AI career matching & salary insights",
    "Global degree finder unlocked",
    "Quiz results & interest matching",
    "All basic tools available immediately",
  ];

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {verifying ? (
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50 text-sm">Activating your credits…</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            {/* Icon */}
            <div className="h-20 w-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>

            {/* Headline */}
            <h1 className="font-heading text-3xl font-extrabold text-white mb-2">Payment Successful!</h1>
            <p className="text-white/50 text-base mb-8">You now have <span className="text-yellow-400 font-bold">50 credits</span> to research and learn.</p>

            {/* Features */}
            <div className="bg-white/4 border border-white/8 rounded-2xl p-6 text-left mb-8 space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-sm text-white/80">{f}</span>
                </div>
              ))}
            </div>

            {/* Credit badge */}
            <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/25 text-yellow-400 text-sm font-bold px-5 py-3 rounded-xl mb-8">
              <Zap className="h-4 w-4" />
              50 credits added to your account
            </div>

            {/* CTA */}
            <button
              onClick={() => window.location.href = "/dashboard"}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2"
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