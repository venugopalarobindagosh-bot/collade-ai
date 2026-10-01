import { useState, useEffect } from "react";
import { Trophy, Star, Award, Zap, Brain } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { getCurrentUser } from "@/lib/auth";
import { entities } from "@/api/entities";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";

// ── Badge definitions ──
// Every badge unlocks based on total XP OR skills completed (both are tracked).
const ALL_BADGES = [
  {
    id: "explorer",
    name: "Explorer",
    emoji: "🧭",
    desc: "Earn 100 XP",
    xp: 50,
    requirement: (s) => s.totalPoints >= 100,
  },
  {
    id: "ai_ready",
    name: "AI-Ready",
    emoji: "🤖",
    desc: "Complete 3 skills",
    xp: 100,
    requirement: (s) => s.completedSkills >= 3,
  },
  {
    id: "skill_builder",
    name: "Skill Builder",
    emoji: "🔨",
    desc: "Complete 5 skills",
    xp: 75,
    requirement: (s) => s.completedSkills >= 5,
  },
  {
    id: "future_ceo",
    name: "Future CEO",
    emoji: "👑",
    desc: "Earn 300 XP",
    xp: 150,
    requirement: (s) => s.totalPoints >= 300,
  },
  {
    id: "globe_trotter",
    name: "Globe Trotter",
    emoji: "🌍",
    desc: "Earn 500 XP",
    xp: 80,
    requirement: (s) => s.totalPoints >= 500,
  },
  {
    id: "community_star",
    name: "Community Star",
    emoji: "⭐",
    desc: "Complete 10 skills",
    xp: 30,
    requirement: (s) => s.completedSkills >= 10,
  },
  {
    id: "quiz_master",
    name: "Quiz Master",
    emoji: "🎯",
    desc: "Earn 800 XP",
    xp: 60,
    requirement: (s) => s.totalPoints >= 800,
  },
  {
    id: "trend_watcher",
    name: "Trend Watcher",
    emoji: "📈",
    desc: "Earn 1,200 XP",
    xp: 40,
    requirement: (s) => s.totalPoints >= 1200,
  },
  {
    id: "scholar",
    name: "Scholar",
    emoji: "🎓",
    desc: "Complete 20 skills",
    xp: 120,
    requirement: (s) => s.completedSkills >= 20,
  },
  {
    id: "pathfinder",
    name: "PathFinder Pro",
    emoji: "🚀",
    desc: "Earn 2,000 XP",
    xp: 200,
    requirement: (s) => s.totalPoints >= 2000,
  },
];

const LEVELS = [
  { name: "Explorer", min: 0, max: 99, color: "text-blue-500", bg: "bg-blue-50" },
  { name: "Pioneer", min: 100, max: 299, color: "text-purple-500", bg: "bg-purple-50" },
  { name: "Trailblazer", min: 300, max: 599, color: "text-amber-500", bg: "bg-amber-50" },
  { name: "Visionary", min: 600, max: Infinity, color: "text-rose-500", bg: "bg-rose-50" },
];

export default function Achievements() {
  const { } = useCredits();
  const [achievement, setAchievement] = useState(null);
  const [skills, setSkills] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.email) {
        setLoading(false);
        return;
      }

      Promise.all([
        entities.UserAchievement.filter({ created_by: me.email }, "-created_date", 1),
        entities.UserSkill.filter({ created_by: me.email }, "-created_date", 100),
      ]).then(async ([achs, skls]) => {
        const existingAchievement = achs?.[0];
        const skillList = skls || [];

        // ── Calculate stats from actual data ──
        const totalPoints = skillList.reduce((acc, s) => acc + (s.points || 0), 0);
        const completedSkills = skillList.filter(s => s.status === "completed").length;
        const simulationsRun = existingAchievement?.simulations_run || 0;
        const careerPathsExplored = existingAchievement?.career_paths_explored || 0;

        // ── Determine which badges should be earned ──
        const stats = { totalPoints, completedSkills, simulationsRun, careerPathsExplored };
        const shouldHaveBadges = ALL_BADGES
          .filter(b => b.requirement(stats))
          .map(b => b.id);

        // Merge with existing badges (union — never remove)
        const existingBadges = existingAchievement?.badges || [];
        const allEarnedBadges = Array.from(new Set([...existingBadges, ...shouldHaveBadges]));

        // Compute level name
        const levelObj = [...LEVELS].reverse().find(l => totalPoints >= l.min) || LEVELS[0];

        // ── Persist if changed ──
        const needsUpdate =
          !existingAchievement ||
          existingAchievement.total_points !== totalPoints ||
          JSON.stringify(existingAchievement.badges || []) !== JSON.stringify(allEarnedBadges) ||
          existingAchievement.skills_completed !== completedSkills ||
          existingAchievement.level !== levelObj.name;

        if (needsUpdate) {
          try {
            if (existingAchievement?.id) {
              const updated = await entities.UserAchievement.update(existingAchievement.id, {
                total_points: totalPoints,
                badges: allEarnedBadges,
                skills_completed: completedSkills,
                simulations_run: simulationsRun,
                career_paths_explored: careerPathsExplored,
                level: levelObj.name,
              });
              setAchievement(updated);
            } else {
              const created = await entities.UserAchievement.create({
                total_points: totalPoints,
                badges: allEarnedBadges,
                skills_completed: completedSkills,
                simulations_run: simulationsRun,
                career_paths_explored: careerPathsExplored,
                level: levelObj.name,
              });
              setAchievement(created);
            }
          } catch (err) {
            console.error('[Achievements] Auto-unlock failed:', err);
            setAchievement({
              total_points: totalPoints,
              badges: allEarnedBadges,
              skills_completed: completedSkills,
              simulations_run: simulationsRun,
              career_paths_explored: careerPathsExplored,
              level: levelObj.name,
            });
          }
        } else {
          setAchievement(existingAchievement);
        }

        setEarnedBadges(allEarnedBadges);
        setSkills(skillList);
        setLoading(false);
      }).catch(err => {
        console.error('[Achievements] Load failed:', err);
        setLoading(false);
      });
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalPoints = skills.reduce((acc, s) => acc + (s.points || 0), 0);
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
          <motion.div
            className={`h-full rounded-full ${level.color.replace("text", "bg")}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1 }}
          />
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
        <h3 className="font-heading font-bold text-lg mb-3">🎖️ Badges ({earnedBadges.length}/{ALL_BADGES.length})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_BADGES.map((badge, i) => {
            const earned = earnedBadges.includes(badge.id);
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-card border rounded-xl p-4 text-center transition-all ${
                  earned
                    ? "border-primary/30 shadow-md shadow-primary/10"
                    : "border-border opacity-60 grayscale"
                }`}
              >
                <p className="text-3xl mb-2">{badge.emoji}</p>
                <p className="font-heading font-bold text-sm">{badge.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{badge.desc}</p>
                <p className={`text-[11px] font-bold mt-2 ${earned ? "text-primary" : "text-muted-foreground"}`}>
                  {earned ? `+${badge.xp} XP ✓` : `+${badge.xp} XP`}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Tip */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4">
        <p className="text-sm font-medium">
          💡 Earn more XP by exploring careers, completing skills, running simulations, and taking the personality quiz!
        </p>
      </div>
    </div>
    </FeatureGate>
  );
}