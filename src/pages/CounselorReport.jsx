import { useState, useEffect } from "react";
import { FileText, Download, Loader2, User, GraduationCap, Brain, Target } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { getCurrentUser } from "@/lib/auth";
import { entities } from "@/api/entities";
import { invokeLLM } from "@/api/llm";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CounselorReport() {
  const { deductCredit } = useCredits();
  const [skills, setSkills] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.email) { setDataLoading(false); return; }
      entities.UserSkill.filter({ created_by: me.email }, "-created_date", 50).then(skls => {
        setSkills(skls || []);
        setDataLoading(false);
      });
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
    
    const completedSkills = skills.filter(s => s.status === "completed").map(s => s.skill_name);
    const learningSkills = skills.filter(s => s.status === "learning").map(s => s.skill_name);
    const totalXP = skills.reduce((acc, s) => acc + (s.points || 0), 0);

    try {
      const prompt = `Generate a professional student career exploration report for a school counselor or parent.

Student Name: ${studentName || "Student"}
Grade: ${grade || "Not specified"}
Completed Skills: ${completedSkills.join(", ") || "None yet"}
Currently Learning: ${learningSkills.join(", ") || "None"}
Total XP Earned: ${totalXP}

Create a structured, professional report suitable for a school counselor or parent that summarizes:
1. Skill development progress
2. Recommended career paths
3. Next steps and action items
4. Strengths observed
5. Areas for development

Be encouraging and actionable.

Return a JSON object with:
- student_summary (string)
- skill_progress_analysis (string)
- recommended_paths (array)
- strengths_observed (array)
- development_areas (array)
- next_steps (array)
- counselor_notes (string)
- overall_readiness_score (string)`;

      const response = await invokeLLM({
        prompt: prompt,
        query: prompt
      });

      console.log('[CounselorReport] Raw response:', response);

      let parsedData = null;
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('[CounselorReport] JSON parse error:', e);
          }
        }
      } else if (typeof response === 'object') {
        parsedData = response;
      }

      const reportData = {
        student_name: studentName || "Student",
        grade: grade || "Not specified",
        generated_date: new Date().toLocaleDateString(),
        skills_xp: totalXP,
        completed_skills: completedSkills,
        learning_skills: learningSkills,
        student_summary: parsedData?.student_summary || "Student is making good progress in their career exploration journey.",
        skill_progress_analysis: parsedData?.skill_progress_analysis || "The student has started building foundational skills.",
        recommended_paths: parsedData?.recommended_paths || ["Continue exploring interests", "Research career options"],
        strengths_observed: parsedData?.strengths_observed || ["Curiosity", "Willingness to learn"],
        development_areas: parsedData?.development_areas || ["Time management", "Focus"],
        next_steps: parsedData?.next_steps || ["Explore more career options", "Build additional skills"],
        counselor_notes: parsedData?.counselor_notes || "Student shows promise in career exploration.",
        overall_readiness_score: parsedData?.overall_readiness_score || "Good"
      };

      console.log('[CounselorReport] Parsed:', reportData);
      setReport(reportData);

    } catch (err) {
      console.error('[CounselorReport] Error:', err);
      setError(err.message || 'Failed to generate report. Please try again.');
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6">
      <SectionHeader title="Counselor Report" subtitle="Generate a professional career exploration report for parents or school counselors" icon={FileText} />

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Name</label>
            <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Enter student name..."
              className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
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

        {/* Skills preview */}
        {!dataLoading && skills.length > 0 && (
          <div className="bg-secondary rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data from Skill Tracker</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <span key={i} className={`text-xs px-2.5 py-1 rounded-md font-medium ${s.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                  {s.skill_name} {s.status === "completed" ? "✓" : "..."}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={generateReport} disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {loading ? "Generating Report..." : "Generate Report"}
        </button>
      </div>

      {/* Report */}
      {report && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Report header */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Career Exploration Report</p>
                <h2 className="font-heading text-2xl font-bold mt-1">{report.student_name}</h2>
                <p className="text-sm text-muted-foreground">{report.grade} • Generated {report.generated_date}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Readiness Score</p>
                <p className="font-heading text-2xl font-bold text-primary">{report.overall_readiness_score}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total XP", value: report.skills_xp, icon: "⭐" },
              { label: "Skills Done", value: report.completed_skills.length, icon: "✅" },
              { label: "Learning", value: report.learning_skills.length, icon: "📚" },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl">{s.icon}</p>
                <p className="font-heading font-bold text-xl mt-1">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Report sections */}
          {[
            { title: "📋 Student Summary", content: report.student_summary },
            { title: "📊 Skill Progress Analysis", content: report.skill_progress_analysis },
            { title: "💬 Counselor Notes", content: report.counselor_notes },
          ].filter(s => s.content).map((section, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold mb-2">{section.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </div>
          ))}

          <div className="grid sm:grid-cols-2 gap-4">
            {report.recommended_paths && report.recommended_paths.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-bold text-sm mb-2">🎯 Recommended Career Paths</h3>
                {report.recommended_paths.map((p, i) => <p key={i} className="text-sm text-muted-foreground">• {p}</p>)}
              </div>
            )}
            {report.strengths_observed && report.strengths_observed.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-bold text-sm mb-2 text-green-600">✅ Strengths Observed</h3>
                {report.strengths_observed.map((p, i) => <p key={i} className="text-sm text-muted-foreground">• {p}</p>)}
              </div>
            )}
          </div>

          {report.next_steps && report.next_steps.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold mb-3">📌 Next Steps & Action Items</h3>
              <div className="space-y-2">
                {report.next_steps.map((step, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold shrink-0">{i + 1}</span>
                    <p className="text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">Generated by PathFinder AI • {new Date().getFullYear()}</p>
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}