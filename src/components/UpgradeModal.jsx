import { useState, useEffect } from "react";
import { X, Zap, Star, Crown, User, ExternalLink } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { getCurrentUser } from "@/lib/auth";

const PLANS = [
  {
    id: "basic",
    label: "Starter",
    price: "₹500",
    payUrl: "https://rzp.io/rzp/EFCpj3Eb",
    credits: 50,
    icon: Zap,
    accentColor: "#3B82F6",
    badge: null,
    features: ["50 credits", "Most tools unlocked", "AI Chat included"],
  },
  {
    id: "pro",
    label: "Pro",
    price: "₹1,000",
    payUrl: "https://rzp.io/rzp/tOlFbsLQ",
    credits: 500,
    icon: Star,
    accentColor: "#8B5CF6",
    badge: "Most Popular",
    features: ["500 credits", "Full tools + Reports", "Certificates + Simulations"],
  },
  {
    id: "premium",
    label: "Premium",
    price: "₹5,000",
    payUrl: "https://rzp.io/rzp/JzTyh74C",
    credits: 5000,
    icon: Crown,
    accentColor: "#F59E0B",
    badge: "Best Deal",
    features: ["5,000 credits", "All features unlocked", "Credits never expire"],
  },
];

// Detect if running inside Capacitor native app
const isApp = typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;

export default function UpgradeModal({ onClose, canClose = true }) {
  const { credits_remaining, showPaymentOptions, _loaded } = useCredits();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    getCurrentUser().then(me => setUserEmail(me?.email || "")).catch(() => {});
  }, []);

  // Hide payment modal entirely if user has plenty of credits
  if (_loaded && !showPaymentOptions) return null;

  const handleSelect = (plan) => {
    if (isApp) {
      // In app — cannot open payment link. Just close and tell them.
      onClose?.();
      return;
    }
    window.open(plan.payUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-zinc-700">
          <div>
            <h2 className="font-heading font-bold text-lg text-white">
              {credits_remaining <= 0 ? "Credits Exhausted" : "Get More Credits"}
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              {isApp
                ? "Buy credits on colladeai.com, then use them here."
                : credits_remaining <= 0
                  ? "You've used all your credits. Choose a pack to keep going."
                  : "Pick a credit pack to continue with Collade AI"}
            </p>
            {userEmail && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-zinc-500">
                <User className="h-3 w-3" />
                <span className="text-zinc-400">Logged in as</span>
                <span className="font-semibold text-zinc-300">{userEmail}</span>
              </div>
            )}
          </div>
          {canClose && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                onClick={() => handleSelect(plan)}
                className={`relative rounded-xl border-2 p-4 transition-all ${
                  isApp
                    ? "cursor-default border-zinc-700 bg-zinc-800"
                    : "cursor-pointer hover:scale-[1.01] hover:border-zinc-500"
                } ${
                  plan.badge === "Most Popular" && !isApp
                    ? "border-purple-500 bg-purple-500/10"
                    : plan.badge === "Best Deal" && !isApp
                      ? "border-amber-500 bg-amber-500/10"
                      : isApp
                        ? "border-zinc-700 bg-zinc-800"
                        : "border-zinc-700 bg-zinc-800"
                }`}
              >
                {plan.badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider text-white"
                    style={{ backgroundColor: plan.accentColor }}
                  >
                    {plan.badge}
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: plan.accentColor + "33", border: `1.5px solid ${plan.accentColor}66` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: plan.accentColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-white">{plan.label}</p>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                        {plan.features.map((f, i) => (
                          <span key={i} className="text-[11px] text-zinc-400">· {f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-heading font-bold text-2xl text-white">{plan.price}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: plan.accentColor }}>
                      {plan.credits.toLocaleString()} credits
                    </p>
                  </div>
                </div>

                {/* In-app hint */}
                {isApp && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-center gap-2 text-[11px] text-zinc-500">
                    <ExternalLink className="h-3 w-3" />
                    <span>Buy on colladeai.com</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-5">
          <p className="text-[11px] text-center text-zinc-500">
            Every AI action uses 1 credit · Credits never expire · Secure payment via Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}