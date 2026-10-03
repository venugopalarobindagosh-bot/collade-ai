import { useState, useEffect, useRef } from "react";
import { Brain, Plus, CheckCircle2, Loader2, Star, X, BookOpen, Trophy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { getCurrentUser } from "@/lib/auth";
import { entities } from "@/api/entities";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion, AnimatePresence } from "framer-motion";

const SKILL_SUGGESTIONS = [
  "Python", "Machine Learning", "UI/UX Design", "Public Speaking", "Data Analysis",
  "React", "Video Editing", "Digital Marketing", "Finance", "3D Modeling",
  "Cybersecurity", "Graphic Design", "Excel", "Photography", "Copywriting"
];

const COMPLETION_XP = 100;

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

  const [courses, setCourses] = useState({});
  const [loadingIdx, setLoadingIdx] = useState(null);
  const [openCourses, setOpenCourses] = useState({});

  const [quizSkill, setQuizSkill] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const addLockRef = useRef(false);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.email) return;
      entities.UserSkill.filter({ created_by: me.email }).then(data => {
        setSkills(data || []);
        setTotalPoints(
          (data || [])
            .filter(s => s.status === "completed")
            .reduce((acc, s) => acc + (s.points || 0), 0)
        );
      });
    });
  }, []);

  const addSkill = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (addLockRef.current) return;
    addLockRef.current = true;
    setAdding(true);

    const isDuplicate = skills.some(s => s.skill_name.toLowerCase() === trimmed.toLowerCase());
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
        points: 0,
        category: "General"
      });
      setSkills(prev => [created, ...prev]);
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
      if (skill.status === "completed") {
        setTotalPoints(prev => prev - (skill.points || 0));
      }
    } catch (err) {
      console.error('[SkillTracker] Remove skill error:', err);
      setError('Failed to remove skill. Please try again.');
    }
  };

  // ── Courses: streaming markdown ──
  const fetchCourses = async (skill, idx) => {
    if (courses[skill.skill_name]) {
      setOpenCourses(prev => ({ ...prev, [skill.skill_name]: !prev[skill.skill_name] }));
      return;
    }

    setOpenCourses(prev => ({ ...prev, [skill.skill_name]: true }));
    setLoadingIdx(idx);
    setError(null);

    const prompt = `You are Collade AI. Recommend the BEST learning resources for "${skill.skill_name}".

FORMAT YOUR RESPONSE AS CLEAN MARKDOWN (no JSON):

# Learning ${skill.skill_name}

## 📚 Top 5 Courses & Tutorials
1. **[Real Course Name]** by [Provider] — [Duration] — [Free/Paid]
   [1 sentence on what it covers]
2. **[Real Course Name]** ...

## 🎥 Best YouTube Channels
- **[Channel Name]** — [What they teach]
- **[Channel Name]** — [What they teach]
- **[Channel Name]** — [What they teach]

## 📖 Recommended Books
- **[Real Book Title]** by [Author] — [Why it's good]

## 🚀 Practice Platforms
- **[Platform]** — [What it offers]
- **[Platform]** — [What it offers]

## 💼 Career Paths This Unlocks
- **[Career 1]** — ₹X-Y LPA
- **[Career 2]** — ₹X-Y LPA
- **[Career 3]** — ₹X-Y LPA

RULES:
- REAL courses, REAL YouTube channels, REAL books
- NEVER say "varies"
- Keep under 400 words
- Use emojis for headers
- NO JSON, NO code blocks`;

    let buffer = "";
    try {
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setCourses(prev => ({ ...prev, [skill.skill_name]: buffer }));
        },
        onDone: () => setLoadingIdx(null),
        onError: (err) => {
          console.error('[SkillTracker] Courses error:', err);
          setError('Failed to fetch courses. Please try again.');
          setLoadingIdx(null);
        },
      });
    } catch (err) {
      console.error('[SkillTracker] Catch courses error:', err);
      setError('Failed to fetch courses.');
      setLoadingIdx(null);
    }
  };

  // ── Quiz: streaming markdown, extract MCQs ──
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

    const prompt = `You are Collade AI. Generate 5 multiple-choice quiz questions to test basic knowledge of "${skill.skill_name}".

FORMAT YOUR RESPONSE EXACTLY LIKE THIS (plain text, no markdown symbols):

Q1: [question text]
A) [option 1]
B) [option 2]
C) [option 3]
D) [option 4]
Correct: [A/B/C/D]
Explanation: [1 sentence why]

Q2: [question text]
A) [option 1]
B) [option 2]
C) [option 3]
D) [option 4]
Correct: [A/B/C/D]
Explanation: [1 sentence why]

Q3: (same format)
Q4: (same format)
Q5: (same format)

RULES:
- Beginner to intermediate difficulty
- Questions specific to "${skill.skill_name}" — no generic questions
- Exactly 4 options (A, B, C, D) per question
- Correct answer must be one of A/B/C/D
- Include brief explanation for each
- NO markdown symbols like ##, **, or bullet points
- NO JSON, NO code blocks`;

    let buffer = "";
    try {
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
        },
        onDone: () => {
          const questions = parseQuizFromText(buffer);
          if (questions.length >= 3) {
            setQuizQuestions(questions);
          } else {
            setError('Could not generate quiz. Please try again.');
            setQuizSkill(null);
          }
          setLoadingQuiz(false);
        },
        onError: (err) => {
          console.error('[SkillTracker] Quiz error:', err);
          setError('Failed to generate quiz. Please try again.');
          setQuizSkill(null);
          setLoadingQuiz(false);
        },
      });
    } catch (err) {
      console.error('[SkillTracker] Catch quiz error:', err);
      setError('Failed to generate quiz.');
      setQuizSkill(null);
      setLoadingQuiz(false);
    }
  };

  const submitQuiz = async () => {
    if (!quizSkill || quizQuestions.length === 0) return;

    const allAnswered = quizQuestions.every((q, i) => quizAnswers[i] !== undefined);
    if (!allAnswered) {
      setError('Please answer all questions.');
      return;
    }

    let correct = 0;
    quizQuestions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_index) correct++;
    });

    const total = quizQuestions.length;
    const passed = correct >= Math.ceil(total * 0.8);
    setQuizResult({ passed, correct, total });

    if (passed) {
      try {
        const idx = skills.findIndex(s => s.id === quizSkill.id);
        if (idx === -1) return;
        const updated = await entities.UserSkill.update(quizSkill.id, {
          status: "completed",
          points: COMPLETION_XP,
        });
        setSkills(prev => prev.map((s, i) => i === idx ? updated : s));
        setTotalPoints(prev => prev + COMPLETION_XP);
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
  const progress = nextLevel ? ((totalPoints - level.min) / (nextLevel.min - level.min)) * 100 : 100;

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="Skill Tracker" subtitle="Add skills, explore courses, pass a quiz to earn XP" icon={Brain} />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

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
        {nextLevel && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {nextLevel.min - totalPoints} XP to {nextLevel.name}
          </p>
        )}
      </div>

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
            <button key={s} onClick={() => addSkill(s)} disabled={adding}
              className="text-xs bg-secondary hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-md transition-colors disabled:opacity-40">
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {skills.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">Add your first skill to get started!</p>
        )}
        <AnimatePresence>
          {skills.map((skill, idx) => {
            const isCompleted = skill.status === "completed";
            const showCourses = openCourses[skill.skill_name];
            return (
              <motion.div key={skill.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? "bg-green-100 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <BookOpen className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${isCompleted ? "text-muted-foreground line-through" : ""}`}>
                      {skill.skill_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isCompleted ? `Completed • ${skill.points} XP` : "In Progress • 0 XP"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => fetchCourses(skill, idx)}
                      className="text-xs bg-secondary text-foreground px-2.5 py-1.5 rounded-lg font-medium hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1">
                      {loadingIdx === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
                      Courses
                    </button>
                    {!isCompleted && (
                      <button onClick={() => startQuiz(skill)} disabled={loadingQuiz}
                        className="text-xs bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg font-medium hover:bg-primary/20 transition-colors disabled:opacity-40 flex items-center gap-1">
                        {loadingQuiz && quizSkill?.id === skill.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trophy className="h-3 w-3" />}
                        Take Quiz
                      </button>
                    )}
                    <button onClick={() => removeSkill(skill, idx)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showCourses && courses[skill.skill_name] && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="pt-3 border-t border-border">
                        <div className="prose prose-invert prose-sm max-w-none
                          prose-headings:text-foreground prose-headings:font-bold
                          prose-h1:text-base prose-h1:mt-0 prose-h1:mb-2 prose-h1:text-primary
                          prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-2 prose-h2:text-primary prose-h2:border-b prose-h2:border-border prose-h2:pb-1
                          prose-p:text-muted-foreground prose-p:my-1 prose-p:text-xs
                          prose-li:text-muted-foreground prose-li:my-0.5 prose-li:text-xs
                          prose-strong:text-foreground prose-strong:font-semibold
                        ">
                          <ReactMarkdown>{courses[skill.skill_name]}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {quizSkill && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
                    {quizResult ? "Result" : loadingQuiz ? "Working..." : "Skill Verification"}
                  </p>
                  <p className="font-heading font-bold">{quizSkill.skill_name}</p>
                </div>
                <button onClick={closeQuiz} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>

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
                      {quizResult.passed ? <Trophy className="h-8 w-8 text-green-600" /> : <X className="h-8 w-8 text-red-500" />}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-lg">{quizResult.passed ? "🎉 Passed!" : "Not quite"}</p>
                      <p className="text-sm text-muted-foreground mt-1">You got {quizResult.correct}/{quizResult.total} correct</p>
                      {quizResult.passed ? (
                        <p className="text-sm text-green-600 font-semibold mt-3">+{COMPLETION_XP} XP awarded!</p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-3">You need 80% to pass. Study the courses and try again!</p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      {!quizResult.passed && (
                        <button onClick={() => startQuiz(quizSkill)} className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm">
                          Retry Quiz
                        </button>
                      )}
                      <button onClick={closeQuiz} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-semibold text-sm">
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {!loadingQuiz && !quizResult && quizQuestions.length > 0 && (
                  <>
                    {quizQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-2 pb-3 border-b border-border last:border-b-0">
                        <p className="font-semibold text-sm">{qIdx + 1}. {q.question}</p>
                        <div className="space-y-1.5">
                          {(q.options || []).map((opt, oIdx) => {
                            const selected = quizAnswers[qIdx] === oIdx;
                            return (
                              <button key={oIdx} onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                                  selected ? "bg-primary/10 border-primary text-primary font-medium" : "border-border hover:border-primary/40"
                                }`}>
                                {String.fromCharCode(65 + oIdx)}) {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <button onClick={submitQuiz} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
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

/**
 * Parse quiz from plain text format:
 * Q1: [question]
 * A) [option]
 * B) [option]
 * C) [option]
 * D) [option]
 * Correct: [A/B/C/D]
 * Explanation: [why]
 */
function parseQuizFromText(text) {
  if (!text || typeof text !== 'string') return [];

  const questions = [];
  // Split by Q1:, Q2:, etc.
  const blocks = text.split(/Q\d+\s*:\s*/i).filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 6) continue;

    // First line = question
    const question = lines[0];
    if (!question || question.length < 10) continue;

    // Find A) B) C) D) options
    const options = [];
    let correctIndex = -1;
    let explanation = "";

    for (const line of lines) {
      const optMatch = line.match(/^([A-D])\)\s*(.+)/i);
      if (optMatch) {
        const letter = optMatch[1].toUpperCase();
        const text = optMatch[2].trim();
        const idx = letter.charCodeAt(0) - 65;
        options[idx] = text;
        continue;
      }
      const correctMatch = line.match(/^Correct\s*:\s*([A-D])/i);
      if (correctMatch) {
        correctIndex = correctMatch[1].toUpperCase().charCodeAt(0) - 65;
        continue;
      }
      const explMatch = line.match(/^Explanation\s*:\s*(.+)/i);
      if (explMatch) {
        explanation = explMatch[1].trim();
        continue;
      }
    }

    if (options.length === 4 && correctIndex >= 0 && correctIndex <= 3) {
      questions.push({
        question,
        options,
        correct_index: correctIndex,
        explanation,
      });
    }
  }

  return questions.slice(0, 5);
}