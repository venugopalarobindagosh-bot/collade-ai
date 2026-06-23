import { Link, useLocation } from "react-router-dom";
import { Home, GraduationCap, Users, Trophy } from "lucide-react";

const TABS = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/explore-degrees", label: "Degrees", icon: GraduationCap },
  { path: "/community", label: "Community", icon: Users },
  { path: "/achievements", label: "XP", icon: Trophy },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ path, label, icon: Icon }) => {
        const isActive = location.pathname === path || (path === "/dashboard" && location.pathname === "/dashboard");
        return (
          <Link
            key={path}
            to={path}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}