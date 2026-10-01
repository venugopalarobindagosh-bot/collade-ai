import { useState, useEffect, useRef } from "react";
import { Brain, Plus, CheckCircle2, Loader2, Star, X, BookOpen, Trophy, ChevronRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { getCurrentUser } from "@/lib/auth";
import { entities } from "@/api/entities";
import { invokeLLM } from "@/api/llm";
import { parseAIResponse, extractArray } from "@/lib/aiResponseHandler";
import SectionHeader from "../components/SectionHeader";
import LoadingGrid from "../components/LoadingGrid";
import { motion, AnimatePresence } from "framer-motion";

const SKILL_SUGGESTIONS = [
  "Python", "Machine Learning", "UI/UX Design", "Public Speaking", "Data Analysis",
  "React", "Video Editing", "Digital Marketing", "Finance", "3D Modeling",
  "Cybersecurity", "Graphic Design", "Excel", "Photography", "Copywriting"
];

const POINTS_MAP = { learning: 10, completed: 100 };

const LEVELS = [
  { name: "Explorer", min: 0, color: "text-blue-500" },
  { name: "Pioneer", min: 100, color: "text-purple-500" },
  { name: "Trailblazer", min: 300, color: "text-amber-500" },
  { name: "Visionary", min: 600, color: "text-rose-500" },
  { name: "Legend", min: 1000, color: "text-emerald-500" },
];

function getLevel(points) {
  return [...LEVELS].reverse().find(l => points >= l.min) || LEVELS[0];
}

export default function SkillTracker() {
  const { deductCredit } = useCredits();
  const [skills, setSkills] = useState([]);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [error, setError] = useState(null);

  // Quiz state
  const [quizSkill, setQuizSkill] = useState(null); // skill object being quizzed
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({}); // { qIdx: optionIdx }
  const [quizResult, setQuizResult] = useState(null); // { passed, correct, total }
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const addLockRef = useRef(false);

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
    const trimmed = name.trim();
    if (!trimmed) return;

    // Prevent double-click spam
    if (addLockRef.current) return;
    addLockRef.current = true;
    setAdding(true);

    // Local duplicate check (case-insensitive)
    const isDuplicate = skills.some(
      s => s.skill_name.toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setError(`"${trimmed}" is already in your skills.`);
      addLockRef.current = false;
      setAdding(false);
      return;
    }

    setError(null);
    try {
      const created = await entities.UserSkill.create({
        skill_name: trimmed,
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
    } finally {
      addLockRef.current = false;
      setAdding(false);
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

  // ── Quiz flow ──
  const startQuiz = async (skill) => {
    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoadingQuiz(true);
    setError(null);
    setQuizSkill(skill);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizResult(null);

    try {
      const prompt = `Generate a 3-question multiple-choice quiz to verify someone learned the basics of "${skill.skill_name}".

Return a JSON object with:
- questions (array of 3 objects, each with: question (string), options (array of 4 strings), correct_index (number 0-3), explanation (string))

Rules:
- Questions must be beginner-level
- Each question has exactly 4 options
- correct_index is 0, 1, 2, or 3
- No "all of the above" or "none of the above"
- Test real understanding, not trivia

Return ONLY valid JSON. Start with { and end with }. No markdown, no code fences.`;

      const response = await invokeLLM({ prompt, query: prompt });
      const parsed = parseAIResponse(response);

      if (parsed.type === 'json' && parsed.data) {
        const questions = extractArray(parsed.data, ['questions']);
        if (questions.length > 0) {
          setQuizQuestions(questions);
        } else {
          setError('Could not generate quiz. Please try again.');
          setQuizSkill(null);
        }
      } else {
        setError('Could not generate quiz. Please try again.');
        setQuizSkill(null);
      }
    } catch (err) {
      console.error('[SkillTracker] Quiz generation error:', err);
      setError('Failed to generate quiz. Please try again.');
      setQuizSkill(null);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const submitQuiz = async () => {
    if (!quizSkill || quizQuestions.length === 0) return;
    if (Object.keys(quizAnswers).length !== quizQuestions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }

    // Grade
    let correct = 0;
    quizQuestions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_index) correct++;
    });

    const total = quizQuestions.length;
    const passed = correct >= Math.ceil(total * 0.67); // 2/3 or more

    setQuizResult({ passed, correct, total });

    if (passed) {
      // Mark complete
      try {
        const idx = skills.findIndex(s => s.id === quizSkill.id);
        if (idx === -1) return;

        const updated = await entities.UserSkill.update(quizSkill.id, {
          status: "completed",
          points: POINTS_MAP.completed,
        });

        setSkills(prev => prev.map((s, i) => i === idx ? updated : s));
        setTotalPoints(prev => prev - POINTS_MAP.learning + POINTS_MAP.completed);
      } catch (err) {
        console.error('[SkillTracker] Mark complete error:', err);
        setError('Quiz passed but saving failed. Please retry.');
      }
    }
  };

  const closeQuiz = () => {
    setQuizSkill(null);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizResult(null);
    setError(null);
  };

  const level = getLevel(totalPoints);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = nextLevel
    ? ((totalPoints - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader
        title="Skill Tracker"
        subtitle="Add skills, learn them, pass a quick quiz to earn XP"
        icon={Brain}
      />

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
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        {nextLevel && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {nextLevel.min - totalPoints} XP to {nextLevel.name}
          </p>
        )}
      </div>

      {/* Add skill */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !adding && addSkill(input)}
            placeholder="Add a skill you're learning..."
            disabled={adding}
            className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          />
          <button
            onClick={() => addSkill(input)}
            disabled={adding || !input.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-40"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SKILL_SUGGESTIONS.filter(s => !skills.find(sk => sk.skill_name.toLowerCase() === s.toLowerCase())).slice(0, 8).map(s => (
            <button
              key={s}
              onClick={() => addSkill(s)}
              disabled={adding}
              className="text-xs bg-secondary hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-md transition-colors disabled:opacity-40"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* Skill list */}
      <div className="space-y-3">
        {skills.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">
            Add your first skill to get started!
          </p>
        )}
        <AnimatePresence>
          {skills.map((skill, idx) => {
            const isCompleted = skill.status === "completed";
            return (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? "bg-green-100 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <BookOpen className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${isCompleted ? "text-muted-foreground line-through" : ""}`}>
                      {skill.skill_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isCompleted ? "Completed" : "In Progress"} • {skill.points} XP
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isCompleted && (
                      <button
                        onClick={() => startQuiz(skill)}
                        disabled={loadingQuiz}
                        className="text-xs bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg font-medium hover:bg-primary/20 transition-colors disabled:opacity-40 flex items-center gap-1"
                      >
                        {loadingQuiz && quizSkill?.id === skill.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trophy className="h-3 w-3" />
                        )}
                        Take Quiz
                      </button>
                    )}
                    <button
                      onClick={() => removeSkill(skill, idx)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quiz modal */}
      <AnimatePresence>
        {quizSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
                    {quizResult ? "Result" : loadingQuiz ? "Generating..." : "Mini Quiz"}
                  </p>
                  <p className="font-heading font-bold">{quizSkill.skill_name}</p>
                </div>
                <button onClick={closeQuiz} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {loadingQuiz && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Generating your quiz...</p>
                  </div>
                )}

                {!loadingQuiz && quizResult && (
                  <div className="text-center space-y-4">
                    <div className={`h-16 w-16 mx-auto rounded-full flex items-center justify-center ${quizResult.passed ? "bg-green-100" : "bg-red-100"}`}>
                      {quizResult.passed ? (
                        <Trophy className="h-8 w-8 text-green-600" />
                      ) : (
                        <X className="h-8 w-8 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-lg">
                        {quizResult.passed ? "🎉 Passed!" : "Not quite"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You got {quizResult.correct}/{quizResult.total} correct
                      </p>
                      {quizResult.passed ? (
                        <p className="text-sm text-green-600 font-semibold mt-3">
                          +{POINTS_MAP.completed} XP awarded!
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-3">
                          You need 2/3 to pass. Try again!
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      {!quizResult.passed && (
                        <button
                          onClick={() => startQuiz(quizSkill)}
                          disabled={loadingQuiz}
                          className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm disabled:opacity-40"
                        >
                          Retry Quiz
                        </button>
                      )}
                      <button
                        onClick={closeQuiz}
                        className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {!loadingQuiz && !quizResult && quizQuestions.length > 0 && (
                  <>
                    {quizQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-2 pb-3 border-b border-border last:border-b-0">
                        <p className="font-semibold text-sm">
                          {qIdx + 1}. {q.question}
                        </p>
                        <div className="space-y-1.5">
                          {(q.options || []).map((opt, oIdx) => {
                            const selected = quizAnswers[qIdx] === oIdx;
                            return (
                              <button
                                key={oIdx}
                                onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                                  selected
                                    ? "bg-primary/10 border-primary text-primary font-medium"
                                    : "border-border hover:border-primary/40"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={submitQuiz}
                      disabled={Object.keys(quizAnswers).length !== quizQuestions.length}
                      className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Submit Answers
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </FeatureGate>
  );
}