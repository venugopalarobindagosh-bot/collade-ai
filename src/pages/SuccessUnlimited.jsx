import { useEffect, useState } from "react";
import { CheckCircle2, Crown, ArrowRight, Clock, AlertCircle, Smartphone, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/api/supabaseClient";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.base69c79072ee43a77be9a2d2b5.app";
const DEEP_LINK = "collade://open";

export default function SuccessUnlimited() {
  const [state, setState] = useState("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [expiryDate, setExpiryDate] = useState(null);

  useEffect(() => {
    async function verifyAndActivate() {
      let user = null;
      for (let i = 0; i < 10; i++) {
        try { user = await getCurrentUser(); } catch (e) {}
        if (user) break;
        await new Promise(r => setTimeout(r, 500));
      }

      if (!user) {
        setErrorMsg("Please log in with the account you used to pay.");
        setState("error");
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setErrorMsg("Session expired. Please log in again.");
          setState("error");
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const res = await fetch(`${supabaseUrl}/functions/v1/verify-payment-tier`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tier: "premium" }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data?.error || "Verification failed. Please contact support.");
          setState("error");
          return;
        }

        if (data.success === true) {
          if (data.expiry) {
            setExpiryDate(
              new Date(data.expiry).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            );
          }
          setState("success");
        } else {
          setErrorMsg(data?.error || "No valid payment found. Please complete payment on colladeai.com first.");
          setState("error");
        }
      } catch (e) {
        console.error("[SuccessUnlimited] Verification error:", e);
        setErrorMsg("Something went wrong. Please contact support.");
        setState("error");
      }
    }

    verifyAndActivate();
  }, []);

  const handleContinueWithApp = () => {
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isMobile) {
      const fallbackTimer = setTimeout(() => {
        window.location.href = PLAY_STORE_URL;
      }, 1800);

      window.addEventListener("pagehide", () => clearTimeout(fallbackTimer));
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) clearTimeout(fallbackTimer);
      });

      window.location.href = DEEP_LINK;
    } else {
      window.location.href = PLAY_STORE_URL;
    }
  };

  const handleContinueOnSite = () => {
    window.location.href = "/dashboard";
  };

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
        {state === "verifying" && (
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50 text-sm">Verifying your payment…</p>
          </div>
        )}

        {state === "error" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="h-20 w-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
            <h1 className="font-heading text-2xl font-extrabold text-white mb-2">Payment not verified</h1>
            <p className="text-white/50 text-sm mb-8">{errorMsg}</p>
            <button
              onClick={() => window.location.href = "/"}
              className="w-full bg-white/10 hover:bg-white/15 text-white py-4 rounded-xl font-bold text-base transition-all"
            >
              Back to Home
            </button>
            <p className="text-xs text-white/30 mt-4">If you already paid, please contact support with your payment ID.</p>
          </motion.div>
        )}

        {state === "success" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="h-20 w-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-6">
              <Crown className="h-10 w-10 text-amber-400" />
            </div>

            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">
              <Crown className="h-3 w-3" /> Unlimited Access Activated
            </div>

            <h1 className="font-heading text-3xl font-extrabold text-white mb-2">Payment Successful!</h1>
            <p className="text-white/50 text-base mb-2">You now have <span className="text-amber-400 font-bold">unlimited access</span> for 6 months.</p>

            {expiryDate && (
              <div className="inline-flex items-center gap-2 bg-white/4 border border-white/8 text-white/50 text-xs px-4 py-2 rounded-lg mb-6">
                <Clock className="h-3.5 w-3.5" />
                Access expires on <span className="text-white font-semibold ml-1">{expiryDate}</span>
              </div>
            )}
            {!expiryDate && <div className="mb-6" />}

            <div className="bg-white/4 border border-amber-500/15 rounded-2xl p-6 text-left mb-6 space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-sm text-white/80">{f}</span>
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm font-bold px-5 py-3 rounded-xl mb-6">
              <Crown className="h-4 w-4" />
              Your 6-month access starts now
            </div>

            {/* ── Continue with App ── */}
            <button
              onClick={handleContinueWithApp}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-yellow-400/20 flex items-center gap-3 mb-3"
            >
              <div className="w-9 h-9 rounded-lg bg-black/10 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-black" />
              </div>
              <div className="text-left flex-1">
                <p className="font-black text-base leading-tight">Continue with the App</p>
                <p className="text-black/60 text-xs font-medium mt-0.5">
                  Opens Collade (or Play Store if not installed)
                </p>
              </div>
            </button>

            {/* ── Continue on Website ── */}
            <button
              onClick={handleContinueOnSite}
              className="w-full bg-white/8 hover:bg-white/12 border border-white/10 text-white py-4 rounded-xl font-bold text-base transition-all flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-black text-base leading-tight">Continue on the Website</p>
                <p className="text-white/50 text-xs font-medium mt-0.5">
                  Start learning right here on colladeai.com
                </p>
              </div>
            </button>

            <p className="text-center text-xs text-white/30 mt-5 leading-relaxed">
              No auto-renewal · One-time payment · Secure via Razorpay
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}