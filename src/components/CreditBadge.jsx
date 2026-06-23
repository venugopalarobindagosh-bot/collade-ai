import { Zap, Loader2 } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

export default function CreditBadge({ onUpgrade }) {
  const { credits_remaining, plan, _loaded } = useCredits();
  const isPremium = plan === "premium";
  const isEmpty = !isPremium && credits_remaining <= 0;
  const isVeryLow = !isPremium && credits_remaining === 1;
  const isLow = !isPremium && credits_remaining === 2;

  // Don't render until real data is loaded — prevents showing stale defaults
  if (!_loaded) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-secondary border-border text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <button
      onClick={onUpgrade}
      title="Every action uses 1 credit"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
        isEmpty
          ? "bg-red-500 text-white border-red-500 animate-pulse"
          : isVeryLow
          ? "bg-red-100 text-red-700 border-red-300 animate-pulse"
          : isLow
          ? "bg-amber-100 text-amber-700 border-amber-300"
          : "bg-primary/10 text-primary border-primary/20"
      }`}
    >
      <Zap className="h-3 w-3" />
      {isPremium ? "∞ Unlimited" : `${credits_remaining} Credits`}
      {isVeryLow && <span className="ml-1 text-[9px] font-bold uppercase tracking-wide">⚠ Last!</span>}
      {isLow && <span className="ml-1 text-[9px] font-bold uppercase tracking-wide">Low</span>}
    </button>
  );
}