import { useEffect, useState } from "react";
import { CheckCircle2, Crown, ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { getCurrentUser } from "@/lib/auth";
import { fetchUserCredits, createUserCredits, updateUserCreditsByUserId } from "@/api/credits";

export default function SuccessUnlimited() {
  const [verifying, setVerifying] = useState(true);
  const [expiryDate, setExpiryDate] = useState(null);

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
        const expiry = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
        const existing = await fetchUserCredits();
        if (existing) {
          await updateUserCreditsByUserId(user.id, {
            credits_remaining: 9999,
            plan: "premium",
            access_locked: false,
            subscription_start: new Date().toISOString(),
            subscription_expiry: expiry,
          });
        } else {
          await createUserCredits({
            credits_remaining: 9999,
            plan: "premium",
            access_locked: false,
            subscription_start: new Date().toISOString(),
            subscription_expiry: expiry,
          });
        }
        setExpiryDate(new Date(expiry).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
      } catch(e) {
        // silently ignore
      }
      setVerifying(false);
    }

    grantCredits();
  }, []);

  const FEATURES = [
    "Unlimited AI career searches",
    "All Pro features included",
    "Career simulations & FutureScore",
    "Full reports, certificates & counselor PDFs",
    "Side-by-side career comparisons",
    "6 months of uninterrupted full access",
    "Priority support",
  ];

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {verifying ? (
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50 text-sm">Activating your Unlimited plan…</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            {/* Icon */}
            <div className="h-20 w-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-6">
              <Crown className="h-10 w-10 text-amber-400" />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">
              <Crown className="h-3 w-3" /> Unlimited Access Activated
            </div>

            {/* Headline */}
            <h1 className="font-heading text-3xl font-extrabold text-white mb-2">Payment Successful!</h1>
            <p className="text-white/50 text-base mb-2">You now have <span className="text-amber-400 font-bold">unlimited access</span> for 6 months.</p>

            {/* Expiry */}
            {expiryDate && (
              <div className="inline-flex items-center gap-2 bg-white/4 border border-white/8 text-white/50 text-xs px-4 py-2 rounded-lg mb-8">
                <Clock className="h-3.5 w-3.5" />
                Access expires on <span className="text-white font-semibold ml-1">{expiryDate}</span>
              </div>
            )}
            {!expiryDate && <div className="mb-8" />}

            {/* Features */}
            <div className="bg-white/4 border border-amber-500/15 rounded-2xl p-6 text-left mb-8 space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-sm text-white/80">{f}</span>
                </div>
              ))}
            </div>

            {/* Access badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm font-bold px-5 py-3 rounded-xl mb-8">
              <Crown className="h-4 w-4" />
              Your 6-month access starts now
            </div>

            {/* CTA */}
            <button
              onClick={() => window.location.href = "/dashboard"}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2"
            >
              Go to Dashboard <ArrowRight className="h-5 w-5" />
            </button>
            <p className="text-xs text-white/30 mt-4">No auto-renewal · One-time payment · Secure via Razorpay</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}