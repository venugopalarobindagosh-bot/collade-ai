import { useState, useEffect } from "react";
import { Brain, Plus, CheckCircle2, Loader2, Star, Zap, Lock, X } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { getCurrentUser } from "@/lib/auth";
import { entities } from "@/api/entities";
import { invokeLLM } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import LoadingGrid from "../components/LoadingGrid";
import { motion, AnimatePresence } from "framer-motion";

const SKILL_SUGGESTIONS = [
  "Python", "Machine Learning", "UI/UX Design", "Public Speaking", "Data Analysis",
  "React", "Video Editing", "Digital Marketing", "Finance", "3D Modeling",
  "Cybersecurity", "Graphic Design", "Excel", "Photography", "Copywriting"
];

const POINTS_MAP = { learning: 10, completed: 50 };

const LEVELS = [
  { name: "Explorer", min: 0, color: "text-blue-500" },
  { name: "Pioneer", min: 100, color: "text-purple-500" },
  { name: "Trailblazer", min: 300, color: "text-amber-500" },
  { name: "Visionary", min: 600, color: "text-rose-500" },
];

function getLevel(points) {
  return [...LEVELS].reverse().find(l => points >= l.min) || LEVELS[0];
}

export default function SkillTracker() {
  const { deductCredit } = useCredits();
  const [skills, setSkills] = useState([]);
  const [input, setInput] = useState("");
  const [loadingIdx, setLoadingIdx] = useState(null);
  const [courses, setCourses] = useState({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.email) return;
      entities.UserSkill.filter({ created_by: me.email }).then(data => {
        setSkills(data || []);
        setTotalPoints((data || []).reduce((acc, s) => acc + (s.points || 0), 0));
      });
    });
  }, []);

  const addSkill = async (name) => {
    if (!name.trim() || skills.find(s => s.skill_name.toLowerCase() === name.toLowerCase())) return;
    setError(null);
    try {
      const created = await entities.UserSkill.create({
        skill_name: name.trim(),
        status: "learning",
        points: POINTS_MAP.learning,
        category: "General"
      });
      setSkills(prev => [created, ...prev]);
      setTotalPoints(prev => prev + POINTS_MAP.learning);
      setInput("");
    } catch (err) {
      console.error('[SkillTracker] Add skill error:', err);
      setError('Failed to add skill. Please try again.');
    }
  };

  const markComplete = async (skill, idx) => {
    if (skill.status === "completed") return;
    setError(null);
    try {
      const updated = await entities.UserSkill.update(skill.id, { status: "completed", points: POINTS_MAP.completed });
      setSkills(prev => prev.map((s, i) => i === idx ? updated : s));
      setTotalPoints(prev => prev - POINTS_MAP.learning + POINTS_MAP.completed);
    } catch (err) {
      console.error('[SkillTracker] Mark complete error:', err);
      setError('Failed to update skill. Please try again.');
    }
  };

  const removeSkill = async (skill, idx) => {
    setError(null);
    try {
      await entities.UserSkill.delete(skill.id);
      setSkills(prev => prev.filter((_, i) => i !== idx));
      setTotalPoints(prev => prev - (skill.points || 0));
    } catch (err) {
      console.error('[SkillTracker] Remove skill error:', err);
      setError('Failed to remove skill. Please try again.');
    }
  };

  const fetchCourses = async (skill, idx) => {
    if (courses[skill.skill_name]) return;
    
    const spent = await deductCredit();
    if (!spent) { 
      window.dispatchEvent(new CustomEvent("collade:upgrade")); 
      return; 
    }
    
    setLoadingIdx(idx);
    setError(null);
    try {
      const prompt = `For the skill "${skill.skill_name}", suggest 5 micro-courses and free online resources for a high school or college student. Include YouTube channels, free platforms (Coursera, edX, Khan Academy etc), and projects they can build.

Return a JSON object with:
- courses (array of: title, platform, duration, free, url_hint)
- unlocked_paths (array of strings)`;

      const response = await invokeLLM({ 
        prompt: prompt,
        query: prompt
      });

      console.log('[SkillTracker] Courses response:', response);

      let parsedData = null;
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('[SkillTracker] JSON parse error:', e);
          }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      const courseData = {
        courses: parsedData?.courses || [],
        unlocked_paths: parsedData?.unlocked_paths || []
      };

      setCourses(prev => ({ ...prev, [skill.skill_name]: courseData }));
    } catch (err) {
      console.error('[SkillTracker] Fetch courses error:', err);
      setError('Failed to fetch courses. Please try again.');
    } finally { 
      setLoadingIdx(null); 
    }
  };

  const level = getLevel(totalPoints);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = nextLevel ? ((totalPoints - level.min) / (nextLevel.min - level.min)) * 100 : 100;

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="Skill Tracker" subtitle="Track what you're learning, earn points, unlock career paths" icon={Brain} />

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Level card */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={`font-heading font-bold text-lg ${level.color}`}>{level.name}</p>
            <p className="text-xs text-muted-foreground">{totalPoints} XP earned</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Star className="h-7 w-7 text-primary" />
          </div>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
        </div>
        {nextLevel && <p className="text-[11px] text-muted-foreground mt-1">{nextLevel.min - totalPoints} XP to {nextLevel.name}</p>}
      </div>

      {/* Add skill */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addSkill(input)}
            placeholder="Add a skill you're learning..."
            className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={() => addSkill(input)} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SKILL_SUGGESTIONS.filter(s => !skills.find(sk => sk.skill_name === s)).slice(0, 8).map(s => (
            <button key={s} onClick={() => addSkill(s)} className="text-xs bg-secondary hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-md transition-colors">+ {s}</button>
          ))}
        </div>
      </div>

      {/* Skill list */}
      <div className="space-y-3">
        {skills.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">Add your first skill to get started!</p>
        )}
        <AnimatePresence>
          {skills.map((skill, idx) => (
            <motion.div key={skill.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <button onClick={() => markComplete(skill, idx)} className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${skill.status === "completed" ? "bg-green-100 text-green-600" : "bg-secondary hover:bg-green-50 hover:text-green-500"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${skill.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{skill.skill_name}</p>
                  <p className="text-[11px] text-muted-foreground">{skill.status === "completed" ? "Completed" : "In Progress"} • {skill.points} XP</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => fetchCourses(skill, idx)} className="text-xs bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg font-medium hover:bg-primary/20 transition-colors">
                    {loadingIdx === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : "Courses"}
                  </button>
                  <button onClick={() => removeSkill(skill, idx)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Courses panel */}
              <AnimatePresence>
                {courses[skill.skill_name] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="pt-2 border-t border-border space-y-2">
                      {(courses[skill.skill_name].courses || []).map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-secondary rounded-lg px-3 py-2">
                          <div>
                            <p className="font-medium">{c.title || "Course"}</p>
                            <p className="text-muted-foreground">{c.platform || "Online"} • {c.duration || "Varies"}</p>
                          </div>
                          {c.free && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-md font-semibold">FREE</span>}
                        </div>
                      ))}
                      {(courses[skill.skill_name].unlocked_paths || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[11px] text-muted-foreground">Unlocks:</span>
                          {courses[skill.skill_name].unlocked_paths.map((p, i) => (
                            <span key={i} className="text-[11px] bg-accent/10 text-accent px-2 py-0.5 rounded-md font-medium">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
    </FeatureGate>
  );
}