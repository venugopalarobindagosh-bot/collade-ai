import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Star, Crown, Search, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { getCurrentUser } from "@/lib/auth";
import { invokeLLM, AuthRequiredError } from "@/api/llm";
import { Link } from "react-router-dom";

const BUY_PLANS = [
  { id: "basic", label: "Starter", price: "₹500", payUrl: "https://rzp.io/rzp/EFCpj3Eb", credits: 50, icon: Zap, color: "#3B82F6", desc: "50 credits" },
  { id: "pro", label: "Pro", price: "₹1,000", payUrl: "https://rzp.io/rzp/tOlFbsLQ", credits: 500, icon: Star, color: "#8B5CF6", desc: "500 credits", popular: true },
  { id: "premium", label: "Unlimited", price: "₹5,000", payUrl: "https://rzp.io/rzp/JzTyh74C", credits: null, icon: Crown, color: "#F59E0B", desc: "6 months unlimited" },
];

const QUICK_LINKS = [
  { path: "/explore-degrees", label: "Explore Degrees", emoji: "🎓" },
  { path: "/explore-topics", label: "Explore by Topic", emoji: "🧭" },
  { path: "/interest-matcher", label: "Interest Matcher", emoji: "✨" },
  { path: "/dream-location", label: "Dream Location", emoji: "📍" },
  { path: "/trends", label: "Future Trends", emoji: "📈" },
  { path: "/compare", label: "Compare Careers", emoji: "⚖️" },
  { path: "/future-score", label: "AI-Proof Score", emoji: "🛡️" },
  { path: "/career-simulator", label: "Career Simulator", emoji: "🚀" },
  { path: "/skill-tracker", label: "Skill Tracker", emoji: "🧠" },
  { path: "/community", label: "Community", emoji: "👥" },
];

export default function Dashboard() {
  const { credits_remaining, plan, _loaded, deductCredit, deducting, deductError, isPremium, showPaymentOptions } = useCredits();
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    getCurrentUser().then(me => {
      setUserName(me?.full_name || "");
    }).catch(() => {});
  }, []);

  const creditsDisplay = isPremium ? "∞" : (credits_remaining ?? 0);

  const handleSearch = async () => {
    if (!search.trim() || searching) return;
    setSearchError("");
    const spent = await deductCredit();
    if (!spent) {
      if (!deductError) window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await invokeLLM({
        prompt: `You are Collade AI, a career guidance expert for Indian students. Answer this career question concisely and helpfully:\n\n"${search.trim()}"\n\nProvide salary info (India + abroad), required education, top companies, growth prospects. Be direct and specific.`,
      });
      setSearchResult(typeof res === "string" ? res : JSON.stringify(res, null, 2));
    } catch (err) {
      console.error("[Dashboard] Career search failed:", err);
      if (err instanceof AuthRequiredError) {
        setSearchError("Session expired — please log out and log in again.");
      } else {
        setSearchError(err?.message || "Search failed. Please try again.");
      }
    } finally {
      setSearching(false);
    }
  };

  const handleBuy = (planObj) => {
    window.open(planObj.payUrl, "_blank");
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border border-primary/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold">
              {userName ? `Welcome back, ${userName.split(" ")[0]} 👋` : "Welcome to Collade AI 👋"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Your AI-powered career guidance dashboard</p>
          </div>
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3 self-start sm:self-auto">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isPremium ? "bg-amber-500/20" : "bg-primary/10"}`}>
              {isPremium ? <Crown className="h-5 w-5 text-amber-500" /> : <Zap className="h-5 w-5 text-primary" />}
            </div>
            <div>
              {_loaded ? (
                <>
                  <p className="font-heading font-bold text-2xl leading-none">{creditsDisplay}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPremium ? "Unlimited plan" : "credits remaining"}
                  </p>
                </>
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {_loaded && !isPremium && credits_remaining <= 5 && credits_remaining > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs px-3 py-1.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> You received 5 free credits to get started!
          </div>
        )}
        {_loaded && !isPremium && credits_remaining === 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs px-3 py-1.5 rounded-full">
            <Zap className="h-3 w-3" /> Out of credits — buy more below to continue
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-base">Career Search</h2>
          <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">1 credit per search</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Ask anything — salary, courses, countries, career paths</p>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="e.g. What salary does a Data Scientist earn in India?"
            className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSearch}
            disabled={!search.trim() || searching || deducting || (!isPremium && credits_remaining <= 0)}
            className="bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            {searching || deducting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="hidden sm:inline">{searching ? "Searching..." : deducting ? "Updating credits..." : "Search"}</span>
          </button>
        </div>

        {(searchError || deductError) && (
          <div className="mt-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 text-sm">
            {searchError || deductError}
          </div>
        )}

        {searchResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-secondary rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {searchResult}
          </motion.div>
        )}
      </motion.div>

      {_loaded && showPaymentOptions && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-heading font-bold text-lg mb-3">Buy Credits</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {BUY_PLANS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  onClick={() => handleBuy(p)}
                  className={`relative bg-card border-2 rounded-xl p-5 cursor-pointer hover:scale-[1.02] transition-all ${
                    p.popular ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-primary/30"
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + "22" }}>
                      <Icon className="h-4 w-4" style={{ color: p.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-heading font-bold text-2xl">{p.price}</p>
                    <span className="text-xs text-primary font-semibold">Pay →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="font-heading font-bold text-lg mb-3">Explore Tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all group text-center"
            >
              <div className="text-2xl mb-2">{link.emoji}</div>
              <p className="text-xs font-medium group-hover:text-primary transition-colors leading-tight">{link.label}</p>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
