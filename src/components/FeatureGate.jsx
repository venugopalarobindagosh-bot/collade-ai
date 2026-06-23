import { Lock, Zap } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

function triggerUpgrade(onUpgrade) {
  if (onUpgrade) onUpgrade();
  else window.dispatchEvent(new CustomEvent("collade:upgrade"));
}

export default function FeatureGate({ children, onUpgrade }) {
  const { credits_remaining, plan, access_locked, _loaded } = useCredits();
  const isPremium = plan === "premium";

  if (!_loaded) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (isPremium || credits_remaining > 0) return children;

  return (
    <div className="relative min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Lock className="h-9 w-9 text-muted-foreground" />
      </div>
      <h2 className="font-heading font-bold text-xl mb-2">Out of Credits</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        You've used all your free credits. Upgrade to keep exploring with Collade AI.
      </p>
      <button
        onClick={() => triggerUpgrade(onUpgrade)}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
      >
        <Zap className="h-4 w-4" /> Unlock Full Access
      </button>
    </div>
  );
}