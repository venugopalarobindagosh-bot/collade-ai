import { LogOut, User, Zap, Star, Crown, Trash2 } from "lucide-react";
import { getCurrentUser, signOut } from "@/lib/auth";
import { useCredits } from "@/hooks/useCredits";
import { useState, useEffect } from "react";

const PLAN_LABELS = { free: "Free", basic: "Starter", pro: "Pro", premium: "Premium" };
const PLAN_COLORS = {
  free: "text-muted-foreground",
  basic: "text-blue-500",
  pro: "text-primary",
  premium: "text-amber-500",
};
const PLAN_ICONS = { free: Zap, basic: Zap, pro: Star, premium: Crown };

export default function SidebarUserCard({ onUpgrade }) {
  const { credits_remaining, plan, _loaded, showPaymentOptions } = useCredits();
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => {});
  }, []);

  if (!_loaded || !user) return null;

  const PlanIcon = PLAN_ICONS[plan] || Zap;

  return (
    <div className="mx-3 mb-3 rounded-xl border border-border bg-secondary/40 p-3 space-y-2.5">
      {/* User info */}
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{user.full_name || "User"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      {/* Plan + credits */}
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1 text-[11px] font-bold ${PLAN_COLORS[plan]}`}>
          <PlanIcon className="h-3 w-3" />
          {PLAN_LABELS[plan] || plan}
        </div>
        <span className={`text-[11px] font-bold ${credits_remaining <= 1 ? "text-destructive" : "text-foreground"}`}>
          {credits_remaining} credit{credits_remaining !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Upgrade button */}
      {showPaymentOptions && (
        <button
          onClick={onUpgrade}
          className="w-full text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-lg py-1.5 transition-colors"
        >
          ⚡ Get More Credits
        </button>
      )}

      {/* Logout */}
      <button
        onClick={() => signOut("/")}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-3 w-3" /> Logout
      </button>

      {/* Account Deletion */}
      <button
        onClick={() => {
          if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            alert("To complete account deletion, please contact arobindan@gmail.com with your registered email.");
          }
        }}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3 w-3" /> Delete Account
      </button>
    </div>
  );
}