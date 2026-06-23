import { Sparkles, Zap } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function WelcomeModal() {
  const { markWelcomeShown, welcome_shown, credits_remaining, _loaded } = useCredits();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.id) return;
      const stored = localStorage.getItem(`collade_welcome_shown_${me.id}`);
      setDismissed(stored === "true" || welcome_shown);
    });
  }, [welcome_shown]);

  const isBrandNewUser = credits_remaining > 0 && credits_remaining <= 5;
  const shouldShow = _loaded && !dismissed && !welcome_shown && isBrandNewUser;

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm text-center p-7">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h2 className="font-heading font-bold text-xl mb-1">Welcome to Collade AI!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You have {credits_remaining} free credits to explore careers, salaries, and degrees.
        </p>
        <button
          onClick={async () => {
            setDismissed(true);
            await markWelcomeShown();
          }}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <Zap className="h-4 w-4" /> Continue for Free ({credits_remaining} Credits)
        </button>
      </div>
    </div>
  );
}
