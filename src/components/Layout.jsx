import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Home, GraduationCap, Compass, MapPin, Sparkles, TrendingUp,
  GitCompare, Brain, Briefcase, Cpu, Users, Shield, Smile,
  Trophy, FileText, Award, LogOut
} from "lucide-react";
import { signOut } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";
import ChatBot from "./ChatBot";
import CreditBadge from "./CreditBadge";
import UpgradeModal from "./UpgradeModal";
import WelcomeModal from "./WelcomeModal";
import SidebarUserCard from "./SidebarUserCard";
import BottomTabBar from "./BottomTabBar";
import { useCredits } from "@/hooks/useCredits";

const navItems = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/explore-degrees", label: "Degrees", icon: GraduationCap },
  { path: "/explore-topics", label: "Topics", icon: Compass },
  { path: "/interest-matcher", label: "Matcher", icon: Sparkles },
  { path: "/dream-location", label: "Locations", icon: MapPin },
  { path: "/trends", label: "Trends", icon: TrendingUp },
  { path: "/compare", label: "Compare", icon: GitCompare },
  { path: "/skill-tracker", label: "Skills", icon: Brain },
  { path: "/opportunities", label: "Opportunities", icon: Briefcase },
  { path: "/career-simulator", label: "Simulator", icon: Cpu },
  { path: "/community", label: "Community", icon: Users },
  { path: "/future-score", label: "AI Score", icon: Shield },
  { path: "/personality", label: "Personality", icon: Smile },
  { path: "/achievements", label: "Achievements", icon: Trophy },
  { path: "/counselor-report", label: "Reports", icon: FileText },
  { path: "/certificate", label: "Certificate", icon: Award },
];

export default function Layout() {
  const location = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { credits_remaining, plan, _loaded, showPaymentOptions } = useCredits();

  useEffect(() => {
    const handler = () => setShowUpgrade(true);
    window.addEventListener("collade:upgrade", handler);
    return () => window.removeEventListener("collade:upgrade", handler);
  }, []);

  const handleUpgrade = useCallback(() => setShowUpgrade(true), []);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r border-border bg-card z-40">
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Compass className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold tracking-tight">Collade AI</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Career Guide</p>
            </div>
          </Link>
          <div className="mt-4">
            <CreditBadge onUpgrade={handleUpgrade} />
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SidebarUserCard onUpgrade={handleUpgrade} />
      </aside>

      {/* Mobile header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-b border-border z-50 flex items-center justify-between px-4"
        style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
      >
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Compass className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-heading text-base font-bold">Collade AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <CreditBadge onUpgrade={handleUpgrade} />
          <button
            onClick={() => signOut("/")}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Bottom tab bar (mobile only) */}
      <BottomTabBar />

      {/* Main content */}
      <main
        className="lg:ml-64 pb-20 lg:pb-0 min-h-screen"
        style={{ paddingTop: `calc(3.5rem + env(safe-area-inset-top))` }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Floating chatbot */}
      <ChatBot onUpgrade={handleUpgrade} />

      {/* Upgrade modal — only when out of credits or user explicitly requests */}
      {(showUpgrade || (_loaded && credits_remaining <= 0 && plan !== "premium")) && (
        <UpgradeModal canClose={credits_remaining > 0 || showUpgrade} onClose={() => setShowUpgrade(false)} />
      )}

      {/* Welcome modal for new users */}
      <WelcomeModal />
    </div>
  );
}