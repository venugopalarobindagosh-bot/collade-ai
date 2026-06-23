import { useState, useEffect } from "react";
import { Trophy, Star, Award, Zap, TrendingUp, Brain, Target } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { getCurrentUser } from "@/lib/auth";
import { entities } from "@/api/entities";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";

const ALL_BADGES = [
  { id: "explorer", name: "Explorer", emoji: "🧭", desc: "Explored 5+ career paths", xp: 50, requirement: "career_paths_explored >= 5" },
  { id: "ai_ready", name: "AI-Ready", emoji: "🤖", desc: "Learned 3+ tech skills", xp: 100, requirement: "skills_completed >= 3" },
  { id: "future_ceo", name: "Future CEO", emoji: "👑", desc: "Completed Career Simulator", xp: 150, requirement: "simulations_run >= 1" },
  { id: "skill_builder", name: "Skill Builder", emoji: "🔨", desc: "Added 5+ skills to tracker", xp: 75, requirement: "skills_completed >= 5" },
  { id: "globe_trotter", name: "Globe Trotter", emoji: "🌍", desc: "Explored 3+ dream locations", xp: 80, requirement: "manual" },
  { id: "community_star", name: "Community Star", emoji: "⭐", desc: "Posted first question", xp: 30, requirement: "manual" },
  { id: "quiz_master", name: "Quiz Master", emoji: "🎯", desc: "Completed Personality Quiz", xp: 60, requirement: "manual" },
  { id: "trend_watcher", name: "Trend Watcher", emoji: "📈", desc: "Checked Future Trends", xp: 40, requirement: "manual" },
  { id: "scholar", name: "Scholar", emoji: "🎓", desc: "Explored 10+ degree paths", xp: 120, requirement: "career_paths_explored >= 10" },
  { id: "pathfinder", name: "PathFinder Pro", emoji: "🚀", desc: "Earned 500+ XP", xp: 200, requirement: "total_points >= 500" },
];

const LEVELS = [
  { name: "Explorer", min: 0, max: 99, color: "text-blue-500", bg: "bg-blue-50" },
  { name: "Pioneer", min: 100, max: 299, color: "text-purple-500", bg: "bg-purple-50" },
  { name: "Trailblazer", min: 300, max: 599, color: "text-amber-500", bg: "bg-amber-50" },
  { name: "Visionary", min: 600, max: Infinity, color: "text-rose-500", bg: "bg-rose-50" },
];

export default function Achievements() {
  const { } = useCredits(); // ensure credit system is initialized
  const [achievement, setAchievement] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.email) { setLoading(false); return; }
      Promise.all([
        entities.UserAchievement.filter({ created_by: me.email }, "-created_date", 1),
        entities.UserSkill.filter({ created_by: me.email }, "-created_date", 50)
      ]).then(([achs, skls]) => {
        setAchievement(achs?.[0] || { total_points: 0, badges: [], skills_completed: 0, simulations_run: 0, career_paths_explored: 0, level: "Explorer" });
        setSkills(skls || []);
        setLoading(false);
      });
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const totalPoints = skills.reduce((acc, s) => acc + (s.points || 0), 0);
  const earnedBadges = achievement?.badges || [];
  const level = [...LEVELS].reverse().find(l => totalPoints >= l.min) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = nextLevel ? ((totalPoints - level.min) / (nextLevel.max - level.min + 1)) * 100 : 100;
  const completedSkills = skills.filter(s => s.status === "completed").length;

  const stats = [
    { label: "Total XP", value: totalPoints, icon: Star, color: "text-amber-500" },
    { label: "Skills Done", value: completedSkills, icon: Brain, color: "text-blue-500" },
    { label: "Badges", value: earnedBadges.length, icon: Award, color: "text-purple-500" },
    { label: "Simulations", value: achievement?.simulations_run || 0, icon: Zap, color: "text-green-500" },
  ];

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="Achievements" subtitle="Your badges, XP, and career exploration milestones" icon={Trophy} />

      {/* Level card */}
      <div className={`${level.bg} border-2 border-opacity-30 rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Current Level</p>
            <p className={`font-heading text-3xl font-bold ${level.color}`}>{level.name}</p>
          </div>
          <div className="text-5xl">🏆</div>
        </div>
        <div className="h-3 bg-white/60 rounded-full overflow-hidden">
          <motion.div className={`h-full rounded-full ${level.color.replace("text", "bg")}`} initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 1 }} />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{totalPoints} XP</span>
          {nextLevel && <span>{nextLevel.min} XP for {nextLevel.name}</span>}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
            <s.icon className={`h-5 w-5 ${s.color} mx-auto`} />
            <p className="font-heading font-bold text-2xl mt-2">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div>
        <h3 className="font-heading font-bold text-lg mb-3">🎖️ Badges</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_BADGES.map((badge, i) => {
            const earned = earnedBadges.includes(badge.id);
            return (
              <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                className={`bg-card border rounded-xl p-4 text-center transition-all ${earned ? "border-primary/30 shadow-md shadow-primary/10" : "border-border opacity-60 grayscale"}`}>
                <p className="text-3xl mb-2">{badge.emoji}</p>
                <p className="font-heading font-bold text-sm">{badge.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{badge.desc}</p>
                <p className={`text-[11px] font-bold mt-2 ${earned ? "text-primary" : "text-muted-foreground"}`}>{earned ? `+${badge.xp} XP ✓` : `+${badge.xp} XP`}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Tip */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4">
        <p className="text-sm font-medium">💡 Earn more XP by exploring careers, completing skills, running simulations, and taking the personality quiz!</p>
      </div>
    </div>
    </FeatureGate>
  );
}