import { useEffect, useState } from "react";
import { CheckCircle2, Star, ArrowRight, AlertCircle, Smartphone, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/api/supabaseClient";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.base69c79072ee43a77be9a2d2b5.app";
const DEEP_LINK = "collade://open";

export default function SuccessPro() {
  const [state, setState] = useState("verifying"); // verifying | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [creditsRemaining, setCreditsRemaining] = useState(500);

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
          body: JSON.stringify({ tier: "pro" }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data?.error || "Verification failed. Please contact support.");
          setState("error");
          return;
        }

        if (data.success === true) {
          setCreditsRemaining(data.credits_remaining || 500);
          setState("success");
        } else {
          setErrorMsg(data?.error || "No valid payment found. Please complete payment on colladeai.com first.");
          setState("error");
        }
      } catch (e) {
        console.error("[SuccessPro] Verification error:", e);
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
        {state === "verifying" && (
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4" />
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
            <div className="h-20 w-20 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-purple-400" />
            </div>

            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">
              <Star className="h-3 w-3" /> Pro Plan Activated
            </div>

            <h1 className="font-heading text-3xl font-extrabold text-white mb-2">Payment Successful!</h1>
            <p className="text-white/50 text-base mb-8">You now have <span className="text-purple-400 font-bold">{creditsRemaining} credits</span> to research and learn.</p>

            <div className="bg-white/4 border border-purple-500/15 rounded-2xl p-6 text-left mb-6 space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-sm text-white/80">{f}</span>
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 text-purple-400 text-sm font-bold px-5 py-3 rounded-xl mb-6">
              <Star className="h-4 w-4" />
              {creditsRemaining} credits in your account
            </div>

            {/* ── Continue with App ── */}
            <button
              onClick={handleContinueWithApp}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white py-4 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-purple-500/20 flex items-center gap-3 mb-3"
            >
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-black text-base leading-tight">Continue with the App</p>
                <p className="text-white/70 text-xs font-medium mt-0.5">
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
              Credits are already active. Log in with the same email on any device.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}