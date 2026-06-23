import { motion } from "framer-motion";
import { Clock, MapPin, TrendingUp, Zap, DollarSign, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function CareerCard({ career, index = 0 }) {
  const aiImpactColor = {
    high: "text-red-500 bg-red-50",
    medium: "text-amber-500 bg-amber-50",
    low: "text-green-500 bg-green-50",
  };

  const aiImpact = career.ai_impact?.toLowerCase() || "medium";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        to={`/career-detail?name=${encodeURIComponent(career.name || career.title)}&stream=${encodeURIComponent(career.stream || "")}&level=${encodeURIComponent(career.level || "")}`}
        className="block group"
      >
        <div className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-base truncate group-hover:text-primary transition-colors">
                {career.name || career.title}
              </h3>
              {career.stream && (
                <p className="text-xs text-muted-foreground mt-0.5">{career.stream} {career.specialization ? `• ${career.specialization}` : ""}</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
          </div>

          {career.short_description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{career.short_description}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {career.duration && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                <Clock className="h-3 w-3" /> {career.duration}
              </span>
            )}
            {career.level && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                {career.level}
              </span>
            )}
            {career.salary_range && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-accent/10 text-accent px-2 py-1 rounded-md">
                <DollarSign className="h-3 w-3" /> {career.salary_range}
              </span>
            )}
            {career.ai_impact && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md ${aiImpactColor[aiImpact] || aiImpactColor.medium}`}>
                <Zap className="h-3 w-3" /> AI: {career.ai_impact}
              </span>
            )}
            {career.growth && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-green-50 text-green-600 px-2 py-1 rounded-md">
                <TrendingUp className="h-3 w-3" /> {career.growth}
              </span>
            )}
          </div>

          {career.locations && career.locations.length > 0 && (
            <div className="flex items-center gap-1 mt-3 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{career.locations.slice(0, 3).join(", ")}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}