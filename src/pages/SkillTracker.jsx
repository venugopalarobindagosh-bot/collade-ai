import { useState, useEffect, useRef } from "react";
import { Brain, Plus, CheckCircle2, Loader2, Star, X, BookOpen, Trophy, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { getCurrentUser } from "@/lib/auth";
import { entities } from "@/api/entities";
import { invokeLLM } from "@/api/llm";
import { parseAIResponse, extractArray } from "@/lib/aiResponseHandler";
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

  // Courses cache
  const [courses, setCourses] = useState({});
  const [markdownCourses, setMarkdownCourses] = useState({});
  const [loadingIdx, setLoadingIdx] = useState(null);
  const [openCourses, setOpenCourses] = useState({});

  // Quiz state
  const [quizSkill, setQuizSkill] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [grading, setGrading] = useState(false);

  const addLockRef = useRef(false);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.email) return;
      entities.UserSkill.filter({ created_by: me.email }).then(data => {
        setSkills(data || []);
        // XP = only sum of COMPLETED skills
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
      // NOTE: points = 0 on add. XP is only awarded on completion.
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

  const fetchCourses = async (skill, idx) => {
    // Toggle open/close
    if (courses[skill.skill_name] || markdownCourses[skill.skill_name]) {
      setOpenCourses(prev => ({ ...prev, [skill.skill_name]: !prev[skill.skill_name] }));
      return;
    }

    setOpenCourses(prev => ({ ...prev, [skill.skill_name]: true }));

    // Don't deduct credits for courses view — it's free
    setLoadingIdx(idx);
    setError(null);
    try {
      const prompt = `For the skill "${skill.skill_name}", suggest 5 micro-courses and free online resources for a high school or college student. Include YouTube channels, free platforms (Coursera, edX, Khan Academy etc), and projects they can build.

Return a JSON object with:
- courses (array of: title, platform, duration, free, url_hint)
- unlocked_paths (array of strings)

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences. Start with { and end with }.`;

      const response = await invokeLLM({ prompt, query: prompt });
      const parsed = parseAIResponse(response);

      if (parsed.type === 'json' && parsed.data) {
        setCourses(prev => ({
          ...prev,
          [skill.skill_name]: {
            courses: extractArray(parsed.data, ['courses']),
            unlocked_paths: parsed.data.unlocked_paths || [],
          },
        }));
      } else if (parsed.type === 'markdown') {
        setMarkdownCourses(prev => ({ ...prev, [skill.skill_name]: parsed.raw }));
      } else {
        setError('No courses found. Please try again.');
      }
    } catch (err) {
      console.error('[SkillTracker] Fetch courses error:', err);
      setError('Failed to fetch courses. Please try again.');
    } finally {
      setLoadingIdx(null);
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
      const prompt = `You are generating a REAL test of skill for "${skill.skill_name}". 5 questions. Be challenging — this determines if the student has actually learned the skill.

Mix question types:
- 3 multiple choice (4 options each, one correct)
- 1 short answer (expects 1-2 sentences of real understanding)
- 1 practical application (asks them to write a small code snippet, formula, or apply the skill to a real scenario)

Return JSON with:
- questions (array of 5 objects)
  - For multiple choice: { type: "mcq", question, options: [4 strings], correct_index: 0-3 }
  - For short answer: { type: "short", question, expected_topics: [array of key concepts] }
  - For practical: { type: "practical", question, expected_topics: [array of key concepts] }

RULES:
- Questions must be SPECIFIC to "${skill.skill_name}", not generic
- Beginner-to-intermediate level
- MCQ options must be plausible (no obvious giveaway)
- For short/practical, "expected_topics" lists what a correct answer should cover

Return ONLY valid JSON. Start with { and end with }. No markdown.`;

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

    // Check all answered
    const allAnswered = quizQuestions.every((q, i) => {
      if (q.type === 'mcq') return quizAnswers[i] !== undefined;
      return (quizAnswers[i] || '').trim().length > 10;
    });

    if (!allAnswered) {
      setError('Please answer all questions (with real answers for text ones).');
      return;
    }

    setGrading(true);
    setError(null);

    // Grade MCQs locally
    let mcqCorrect = 0;
    let mcqTotal = 0;
    const mcqResults = [];
    const textQuestions = [];
    const textAnswers = [];

    quizQuestions.forEach((q, i) => {
      if (q.type === 'mcq') {
        mcqTotal++;
        const correct = quizAnswers[i] === q.correct_index;
        if (correct) mcqCorrect++;
        mcqResults.push({ qIdx: i, correct });
      } else {
        textQuestions.push({ qIdx: i, question: q.question, expected: q.expected_topics || [] });
        textAnswers.push(quizAnswers[i]);
      }
    });

    // Grade text answers via AI
    let textCorrect = 0;
    const textResults = [];

    if (textQuestions.length > 0) {
      try {
        const gradingPrompt = `You are grading a student's quiz answers for the skill "${quizSkill.skill_name}".

For each question, decide if the student's answer demonstrates genuine understanding. Be STRICT — surface-level answers get 0.

${textQuestions.map((tq, idx) => `
Question ${idx + 1}: ${tq.question}
Expected topics: ${tq.expected.join(', ')}
Student answer: ${textAnswers[idx]}
`).join('\n')}

Return JSON:
- results (array of { correct: boolean, reason: string })

RULES:
- correct = true ONLY if the student clearly demonstrates understanding
- Mentioning 1-2 keywords without explanation = false
- Return ONLY valid JSON. Start with { and end with }.`;

        const gradeRes = await invokeLLM({ prompt: gradingPrompt, query: gradingPrompt });
        const gradeParsed = parseAIResponse(gradeRes);

        if (gradeParsed.type === 'json' && gradeParsed.data) {
          const results = extractArray(gradeParsed.data, ['results']);
          results.forEach((r, idx) => {
            textResults.push({ qIdx: textQuestions[idx].qIdx, correct: !!r.correct });
            if (r.correct) textCorrect++;
          });
        }
      } catch (err) {
        console.error('[SkillTracker] Grading error:', err);
      }
    }

    const totalCorrect = mcqCorrect + textCorrect;
    const totalQuestions = quizQuestions.length;
    const passed = totalCorrect >= Math.ceil(totalQuestions * 0.8); // 80%

    setGrading(false);
    setQuizResult({ passed, correct: totalCorrect, total: totalQuestions });

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
  const progress = nextLevel
    ? ((totalPoints - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader
        title="Skill Tracker"
        subtitle="Add skills, explore courses, pass a quiz to earn XP"
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
            const showCourses = openCourses[skill.skill_name];
            return (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
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
                      {isCompleted ? `Completed • ${skill.points} XP` : "In Progress • 0 XP"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => fetchCourses(skill, idx)}
                      className="text-xs bg-secondary text-foreground px-2.5 py-1.5 rounded-lg font-medium hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {loadingIdx === idx ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <BookOpen className="h-3 w-3" />
                      )}
                      Courses
                    </button>
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

                {/* Courses panel */}
                <AnimatePresence>
                  {showCourses && (courses[skill.skill_name] || markdownCourses[skill.skill_name]) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 border-t border-border space-y-2">
                        {courses[skill.skill_name] && (
                          <>
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
                          </>
                        )}
                        {markdownCourses[skill.skill_name] && (
                          <div className="prose prose-invert prose-xs max-w-none
                            prose-headings:text-foreground prose-headings:font-bold
                            prose-h2:text-sm prose-h2:mt-3 prose-h2:mb-1.5
                            prose-h3:text-xs prose-h3:mt-2 prose-h3:mb-1
                            prose-p:text-muted-foreground prose-p:my-1 prose-p:text-xs
                            prose-li:text-muted-foreground prose-li:my-0.5 prose-li:text-xs
                            prose-strong:text-foreground
                          ">
                            <ReactMarkdown>{markdownCourses[skill.skill_name]}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
                    {quizResult ? "Result" : loadingQuiz || grading ? "Working..." : "Skill Verification"}
                  </p>
                  <p className="font-heading font-bold">{quizSkill.skill_name}</p>
                </div>
                <button onClick={closeQuiz} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {(loadingQuiz || grading) && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {grading ? "Grading your answers..." : "Generating your quiz..."}
                    </p>
                  </div>
                )}

                {!loadingQuiz && !grading && quizResult && (
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
                          +{COMPLETION_XP} XP awarded!
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-3">
                          You need 80% to pass. Study the courses and try again!
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      {!quizResult.passed && (
                        <button
                          onClick={() => startQuiz(quizSkill)}
                          className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm"
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

                {!loadingQuiz && !grading && !quizResult && quizQuestions.length > 0 && (
                  <>
                    {quizQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-2 pb-3 border-b border-border last:border-b-0">
                        <p className="font-semibold text-sm">
                          {qIdx + 1}. {q.question}
                        </p>

                        {q.type === 'mcq' && (
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
                        )}

                        {(q.type === 'short' || q.type === 'practical') && (
                          <textarea
                            value={quizAnswers[qIdx] || ''}
                            onChange={e => setQuizAnswers(prev => ({ ...prev, [qIdx]: e.target.value }))}
                            placeholder={q.type === 'practical'
                              ? "Write your practical answer / code / application here..."
                              : "Write your short answer here..."}
                            rows={q.type === 'practical' ? 5 : 3}
                            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          />
                        )}
                      </div>
                    ))}

                    <button
                      onClick={submitQuiz}
                      className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Submit & Grade
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