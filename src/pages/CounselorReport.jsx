import { useState, useEffect, useRef } from "react";
import { FileText, Loader2, Download, Printer } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { getCurrentUser } from "@/lib/auth";
import { entities } from "@/api/entities";
import { invokeLLMStream } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LOGO_URL = "/collade-logo.png";

const BADGE_ICONS = {
  "first_steps": "👣", "explorer": "🧭", "rising_star": "🌟", "future_ceo": "👑",
  "globe_trotter": "🌍", "quiz_master": "🎯", "trend_watcher": "📈",
  "master_mind": "🧠", "pathfinder": "🚀", "legend": "🏆", "grandmaster": "💎",
  "transcendent": "⚡", "first_skill": "🔍", "ai_ready": "🤖",
  "skill_builder": "🔨", "community_star": "⭐", "scholar": "🎓",
  "polymath": "🎨", "genius": "🧪",
};

const BADGE_NAMES = {
  "first_steps": "First Steps", "explorer": "Explorer", "rising_star": "Rising Star",
  "future_ceo": "Future CEO", "globe_trotter": "Globe Trotter", "quiz_master": "Quiz Master",
  "trend_watcher": "Trend Watcher", "master_mind": "Master Mind", "pathfinder": "PathFinder Pro",
  "legend": "Legend", "grandmaster": "Grandmaster", "transcendent": "Transcendent",
  "first_skill": "Curious", "ai_ready": "AI-Ready", "skill_builder": "Skill Builder",
  "community_star": "Dedicated", "scholar": "Scholar", "polymath": "Polymath", "genius": "Genius",
};

/**
 * Parse structured markdown into an object with named sections.
 * Markdown format expected: ## 📋 Section Title \n\n content
 */
function parseReportMarkdown(md) {
  const sections = {
    student_summary: "",
    skill_progress_analysis: "",
    engagement_analysis: "",
    badge_interpretation: "",
    recommended_paths: [],
    strengths_observed: [],
    development_areas: [],
    next_steps: [],
    counselor_notes: "",
    overall_readiness_score: "Developing",
    motivational_note: "",
  };

  if (!md) return sections;

  // Split by ## headings
  const sectionRegex = /##\s+(?:[\p{Emoji}\s]*)?([^\n]+)\n([\s\S]*?)(?=##\s|$)/gu;
  let match;

  while ((match = sectionRegex.exec(md)) !== null) {
    const titleRaw = match[1].trim().toLowerCase();
    const body = match[2].trim();

    // Match by keywords in the title
    if (titleRaw.includes("summary")) {
      sections.student_summary = cleanBody(body);
    } else if (titleRaw.includes("skill") && titleRaw.includes("progress") || titleRaw.includes("development analysis")) {
      sections.skill_progress_analysis = cleanBody(body);
    } else if (titleRaw.includes("engagement") || titleRaw.includes("commitment")) {
      sections.engagement_analysis = cleanBody(body);
    } else if (titleRaw.includes("badge")) {
      // Body may contain both interpretation text
      sections.badge_interpretation = cleanBody(body);
    } else if (titleRaw.includes("recommended") || titleRaw.includes("career path")) {
      sections.recommended_paths = extractBullets(body);
    } else if (titleRaw.includes("strength")) {
      sections.strengths_observed = extractBullets(body);
    } else if (titleRaw.includes("development area") || titleRaw.includes("areas for")) {
      sections.development_areas = extractBullets(body);
    } else if (titleRaw.includes("action plan") || titleRaw.includes("next step")) {
      sections.next_steps = extractNumbered(body);
    } else if (titleRaw.includes("counselor note")) {
      sections.counselor_notes = cleanBody(body);
    } else if (titleRaw.includes("readiness")) {
      const m = body.match(/\*\*(Excellent|Strong|Good|Developing)\*\*/i);
      if (m) sections.overall_readiness_score = m[1];
      else {
        const m2 = body.match(/\b(Excellent|Strong|Good|Developing)\b/i);
        if (m2) sections.overall_readiness_score = m2[1];
      }
    } else if (titleRaw.includes("note for") || titleRaw.includes("motivation")) {
      sections.motivational_note = cleanBody(body);
    }
  }

  return sections;
}

function cleanBody(body) {
  return body
    .replace(/\*\*/g, "")
    .replace(/^[-•]\s*/gm, "")
    .trim();
}

function extractBullets(body) {
  const lines = body.split("\n").filter(l => l.trim());
  const items = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
      items.push(trimmed.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "").trim());
    }
  }
  return items;
}

function extractNumbered(body) {
  const lines = body.split("\n").filter(l => l.trim());
  const items = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^\d+[.)]\s*(.+)/);
    if (m) items.push(m[1].replace(/\*\*/g, "").trim());
    else if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
      items.push(trimmed.replace(/^[-•]\s*/, "").replace(/\*\*/g, "").trim());
    }
  }
  return items;
}

export default function CounselorReport() {
  const { deductCredit } = useCredits();
  const [skills, setSkills] = useState([]);
  const [badges, setBadges] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [report, setReport] = useState(null);
  const [streamedText, setStreamedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.email) { setDataLoading(false); return; }
      Promise.all([
        entities.UserSkill.filter({ created_by: me.email }, "-created_date", 100),
        entities.UserAchievement.filter({ created_by: me.email }, "-created_date", 1),
      ]).then(([skls, achs]) => {
        setSkills(skls || []);
        setBadges(achs?.[0]?.badges || []);
        if (me.full_name || me.email) {
          setStudentName(me.full_name || me.email.split("@")[0]);
        }
        setDataLoading(false);
      }).catch(() => setDataLoading(false));
    });
  }, []);

  const generateReport = async () => {
    const spent = await deductCredit();
    if (!spent) {
      window.dispatchEvent(new CustomEvent("collade:upgrade"));
      return;
    }

    setLoading(true);
    setError(null);
    setStreamedText("");
    setReport(null);

    const completedSkills = skills.filter(s => s.status === "completed").map(s => s.skill_name);
    const learningSkills = skills.filter(s => s.status === "learning").map(s => s.skill_name);
    const totalXP = skills.reduce((acc, s) => acc + (s.points || 0), 0);
    const badgeNames = badges.map(b => BADGE_NAMES[b] || b);
    const firstName = (studentName || "Student").split(" ")[0];

    const prompt = `You are Collade AI, writing a professional student career report for a school counselor or parent.

STUDENT PROFILE:
- Name: ${studentName || "Student"}
- Grade: ${grade || "Not specified"}
- Completed Skills (quiz-verified): ${completedSkills.join(", ") || "None yet"}
- Currently Learning: ${learningSkills.join(", ") || "None"}
- Total XP: ${totalXP}
- Badges Earned: ${badgeNames.join(", ") || "None yet"}

Write the report in MARKDOWN. Use EXACTLY the section headers below — they must match word-for-word so our system can parse them.

## 📋 Student Summary
[3-4 sentences about their journey, referencing specific skills and badges]

## 📊 Skill Progress Analysis
[4-5 sentences on their skill choices and learning pattern]

## 🎯 Engagement & Commitment
[3-4 sentences on consistency, XP earned (${totalXP}), and effort]

## 🏆 Badges Achieved
[Reference their specific badges: ${badgeNames.join(", ") || "None yet"}. 2-3 sentences on what these reveal about them.]

## 🎯 Recommended Career Paths
- **[Career 1]** — [1 sentence reasoning tied to their skills]
- **[Career 2]** — [1 sentence reasoning]
- **[Career 3]** — [1 sentence reasoning]
- **[Career 4]** — [1 sentence reasoning]

## ✅ Strengths Observed
- **[Strength 1]** — [specific evidence]
- **[Strength 2]**
- **[Strength 3]**
- **[Strength 4]**
- **[Strength 5]**

## 🌱 Development Areas
- **[Area 1]** — [actionable suggestion]
- **[Area 2]**
- **[Area 3]**
- **[Area 4]**

## 📌 Action Plan
1. **[First step]**
2. **[Second step]**
3. **[Third step]**
4. **[Fourth step]**
5. **[Fifth step]**
6. **[Sixth step]**

## 💬 Counselor Notes
[3-4 sentences of professional advice for the counselor or parent]

## 🌟 Overall Readiness
**[Excellent / Strong / Good / Developing]** — [1 sentence rationale]

## 💌 A Note for ${firstName}
[1-2 sentences directly to the student — warm, personal, encouraging]

RULES:
- Use REAL numbers and reference ACTUAL skills/badges
- Be honest but encouraging
- Use Indian context where relevant
- Keep under 800 words
- NO JSON, NO code blocks, NO extra sections
- Use EXACTLY the section headers above (our system parses them)`;

    try {
      let buffer = "";
      await invokeLLMStream({
        prompt,
        onToken: (text) => {
          buffer += text;
          setStreamedText(buffer);
        },
        onDone: (finalText) => {
          const md = finalText || buffer;
          const parsed = parseReportMarkdown(md);
          setReport({
            student_name: studentName || "Student",
            grade: grade || "Not specified",
            generated_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
            skills_xp: totalXP,
            completed_skills: completedSkills,
            learning_skills: learningSkills,
            badges: badgeNames,
            ...parsed,
          });
          setLoading(false);
        },
        onError: (err) => {
          console.error('[CounselorReport] Stream error:', err);
          setError(err.message || 'Failed to generate report. Please try again.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[CounselorReport] Catch error:', err);
      setError(err.message || 'Failed to generate report.');
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current || !report) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      const safeName = (studentName || "Student").replace(/\s/g, "_");
      pdf.save(`${safeName}_Collade_Report.pdf`);
    } catch (err) {
      console.error('[CounselorReport] PDF error:', err);
    } finally {
      setExporting(false);
    }
  };

  const printReport = () => window.print();

  const getScoreColor = (score) => {
    switch (score) {
      case "Excellent": return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
      case "Strong": return { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
      case "Good": return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
      default: return { text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" };
    }
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="Counselor Report"
        subtitle="Generate a detailed professional report for parents, teachers, or school counselors"
        icon={FileText}
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Name</label>
            <input
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="Enter student name..."
              className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade / Year</label>
            <div className="mt-1.5">
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="bg-secondary border-0 w-full">
                  <SelectValue placeholder="Select grade..." />
                </SelectTrigger>
                <SelectContent>
                  {["Grade 9", "Grade 10", "Grade 11", "Grade 12", "Gap Year", "1st Year College", "2nd Year College"].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {!dataLoading && (skills.length > 0 || badges.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {skills.length > 0 && (
              <div className="bg-secondary rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills ({skills.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.slice(0, 12).map((s, i) => (
                    <span key={i} className={`text-xs px-2.5 py-1 rounded-md font-medium ${s.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                      {s.skill_name} {s.status === "completed" ? "✓" : "..."}
                    </span>
                  ))}
                  {skills.length > 12 && (
                    <span className="text-xs text-muted-foreground self-center">+{skills.length - 12} more</span>
                  )}
                </div>
              </div>
            )}
            {badges.length > 0 && (
              <div className="bg-secondary rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Badges ({badges.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {badges.map((b, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-md font-medium bg-amber-100 text-amber-800">
                      {BADGE_ICONS[b] || "🏅"} {BADGE_NAMES[b] || b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={generateReport}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {loading ? "Generating Report..." : "Generate Report"}
        </button>
      </div>

      {loading && !report && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-heading font-semibold text-primary">📋 Writing your report...</p>
          </div>
        </motion.div>
      )}

      {report && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm font-semibold">Report Preview</p>
            <div className="flex gap-2">
              <button
                onClick={printReport}
                className="flex items-center gap-1.5 bg-secondary border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                onClick={downloadPDF}
                disabled={exporting}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </button>
            </div>
          </div>

          <div ref={reportRef} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
            {/* Gradient header */}
            <div className="bg-gradient-to-r from-[#6C47FF] to-[#2ABFBF] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={LOGO_URL} alt="Collade AI" className="w-12 h-12 rounded-xl bg-white/10 p-1" />
                  <div>
                    <p className="font-heading font-bold text-lg leading-tight">Collade AI Academy</p>
                    <p className="text-xs text-white/80 tracking-widest uppercase mt-0.5">Career Exploration Report</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <p className="text-white/70 uppercase tracking-widest text-[10px]">Issued</p>
                  <p className="font-semibold">{report.generated_date}</p>
                </div>
              </div>
            </div>

            {/* Student header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Student</p>
                  <h2 className="font-heading text-3xl font-bold text-slate-900 mt-1">{report.student_name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{report.grade}</p>
                </div>
                <div className={`text-right px-5 py-3 rounded-xl border-2 ${getScoreColor(report.overall_readiness_score).bg} ${getScoreColor(report.overall_readiness_score).border}`}>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Overall Readiness</p>
                  <p className={`font-heading text-2xl font-black mt-1 ${getScoreColor(report.overall_readiness_score).text}`}>
                    {report.overall_readiness_score}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
              {[
                { label: "Total XP Earned", value: report.skills_xp, icon: "⭐", color: "text-amber-600" },
                { label: "Skills Verified", value: report.completed_skills.length, icon: "✅", color: "text-emerald-600" },
                { label: "Badges Earned", value: report.badges.length, icon: "🏆", color: "text-purple-600" },
              ].map((s, i) => (
                <div key={i} className="p-5 text-center">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className={`font-heading text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Sections */}
            <div className="p-6 space-y-6">
              {report.student_summary && (
                <section>
                  <h3 className="font-heading text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-sm">📋</span>
                    Student Summary
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{report.student_summary}</p>
                </section>
              )}

              {report.skill_progress_analysis && (
                <section>
                  <h3 className="font-heading text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-sm">📊</span>
                    Skill Progress Analysis
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{report.skill_progress_analysis}</p>
                </section>
              )}

              {report.engagement_analysis && (
                <section>
                  <h3 className="font-heading text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center text-sm">🎯</span>
                    Engagement & Commitment
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{report.engagement_analysis}</p>
                </section>
              )}

              {report.badges.length > 0 && (
                <section>
                  <h3 className="font-heading text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-sm">🏆</span>
                    Badges Achieved ({report.badges.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {report.badges.map((b, i) => {
                      const badgeId = badges.find(bid => BADGE_NAMES[bid] === b) || b;
                      return (
                        <span key={i} className="text-xs px-3 py-1.5 rounded-lg font-bold bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 text-amber-800">
                          {BADGE_ICONS[badgeId] || "🏅"} {b}
                        </span>
                      );
                    })}
                  </div>
                  {report.badge_interpretation && (
                    <p className="text-sm text-slate-600 italic leading-relaxed">{report.badge_interpretation}</p>
                  )}
                </section>
              )}

              {report.recommended_paths?.length > 0 && (
                <section>
                  <h3 className="font-heading text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-sm">🎯</span>
                    Recommended Career Paths
                  </h3>
                  <div className="space-y-2">
                    {report.recommended_paths.map((p, i) => (
                      <div key={i} className="flex gap-3 bg-indigo-50/50 border border-indigo-100 rounded-lg p-3">
                        <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-slate-700 leading-relaxed">{p}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                {report.strengths_observed?.length > 0 && (
                  <section className="bg-green-50/50 border border-green-100 rounded-lg p-4">
                    <h3 className="font-heading text-sm font-bold text-green-800 mb-3">✅ Strengths Observed</h3>
                    <ul className="space-y-2">
                      {report.strengths_observed.map((s, i) => (
                        <li key={i} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                          <span className="text-green-500 shrink-0">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {report.development_areas?.length > 0 && (
                  <section className="bg-amber-50/50 border border-amber-100 rounded-lg p-4">
                    <h3 className="font-heading text-sm font-bold text-amber-800 mb-3">🌱 Development Areas</h3>
                    <ul className="space-y-2">
                      {report.development_areas.map((s, i) => (
                        <li key={i} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                          <span className="text-amber-500 shrink-0">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {report.next_steps?.length > 0 && (
                <section>
                  <h3 className="font-heading text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-sm">📌</span>
                    Action Plan
                  </h3>
                  <div className="space-y-2">
                    {report.next_steps.map((step, i) => (
                      <div key={i} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <span className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-slate-700 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {report.counselor_notes && (
                <section className="bg-blue-50/50 border-l-4 border-blue-400 rounded-r-lg p-4">
                  <h3 className="font-heading text-sm font-bold text-blue-900 mb-2">💬 Counselor Notes</h3>
                  <p className="text-sm text-slate-700 leading-relaxed italic">{report.counselor_notes}</p>
                </section>
              )}

              {report.motivational_note && (
                <section className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-lg p-5 text-center">
                  <p className="text-xs text-purple-700 uppercase tracking-widest font-bold mb-2">A Note for You</p>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium italic">"{report.motivational_note}"</p>
                </section>
              )}

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">
                  Generated by Collade AI Academy • {report.generated_date}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Share this report with parents, teachers, or your school counselor. Download as PDF to print or send.
          </p>
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}