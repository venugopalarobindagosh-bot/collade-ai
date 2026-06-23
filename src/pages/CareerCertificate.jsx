import { useState, useEffect, useRef } from "react";
import { Award, Download, Sparkles, Check } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { entities } from "@/api/entities";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const BADGE_ICONS = {
  "AI-Ready": "🤖", "Explorer": "🧭", "Future CEO": "👑",
  "Skill Builder": "🔨", "Globe Trotter": "🌍", "Scholar": "🎓",
  "PathFinder Pro": "🚀", "Community Star": "⭐", "Quiz Master": "🎯",
};

const CAREER_PATHS = [
  "Software Engineering", "Data Science", "Product Management", "UX Design",
  "Cybersecurity", "Medicine", "Finance", "Architecture", "Law", "Psychology",
  "Marketing", "Mechanical Engineering", "Biotechnology", "AI/ML Engineering",
];

function Certificate({ studentName, formattedDate, schoolName, selectedSkills, selectedPaths, badges, certRef }) {
  return (
    <div
      ref={certRef}
      style={{
        width: 860,
        background: "#ffffff",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        position: "relative",
        overflow: "hidden",
        padding: "52px 64px",
        boxSizing: "border-box",
      }}
    >
      {/* Top border line */}
      <div style={{ height: 6, background: "linear-gradient(to right, #6C47FF, #2ABFBF)", borderRadius: 3, marginBottom: 40 }} />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 13, letterSpacing: 6, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 10, fontFamily: "sans-serif" }}>
          Collade AI
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#111827", letterSpacing: 1, marginBottom: 6 }}>
          Collade AI — Certificate of Career Exploration
        </div>
        <div style={{ fontSize: 13, color: "#9CA3AF", fontFamily: "sans-serif" }}>
          Awarded in recognition of outstanding career exploration
        </div>
      </div>

      {/* Thin rule */}
      <div style={{ height: 1, background: "#E5E7EB", margin: "0 0 32px" }} />

      {/* Presented to */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 12, letterSpacing: 4, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 12, fontFamily: "sans-serif" }}>
          This certificate is proudly presented to
        </div>
        <div style={{
          fontSize: 48,
          fontWeight: 700,
          color: "#6C47FF",
          letterSpacing: 0,
          lineHeight: 1.15,
          marginBottom: 12,
        }}>
          {studentName || "Student Name"}
        </div>
        <div style={{ fontSize: 14, color: "#6B7280", maxWidth: 520, margin: "0 auto", lineHeight: 1.8, fontFamily: "sans-serif" }}>
          for successfully completing the Collade AI career exploration program and demonstrating commitment to discovering their professional future.
        </div>
      </div>

      {/* Badges row */}
      {badges.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
          {badges.slice(0, 4).map((b, i) => (
            <div key={i} style={{
              background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8,
              padding: "6px 14px", fontSize: 12, color: "#6C47FF", fontWeight: 600,
              fontFamily: "sans-serif", whiteSpace: "nowrap",
            }}>
              {BADGE_ICONS[b] || "🏅"} {b}
            </div>
          ))}
        </div>
      )}

      {/* Skills & Paths — two columns, only if data exists */}
      {(selectedSkills.length > 0 || selectedPaths.length > 0) && (
        <div style={{ display: "flex", gap: 24, marginBottom: 28 }}>
          {selectedSkills.length > 0 && (
            <div style={{ flex: 1, background: "#F9FAFB", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 10, fontFamily: "sans-serif", fontWeight: 700 }}>
                Skills Explored
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedSkills.map((s, i) => (
                  <span key={i} style={{
                    background: "#EDE9FE", color: "#5B21B6", borderRadius: 5,
                    padding: "3px 10px", fontSize: 11, fontWeight: 600, fontFamily: "sans-serif",
                  }}>✓ {s}</span>
                ))}
              </div>
            </div>
          )}
          {selectedPaths.length > 0 && (
            <div style={{ flex: 1, background: "#F0FDFA", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 10, fontFamily: "sans-serif", fontWeight: 700 }}>
                Career Paths Explored
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedPaths.map((p, i) => (
                  <span key={i} style={{
                    background: "#CCFBF1", color: "#0F766E", borderRadius: 5,
                    padding: "3px 10px", fontSize: 11, fontWeight: 600, fontFamily: "sans-serif",
                  }}>→ {p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Thin rule */}
      <div style={{ height: 1, background: "#E5E7EB", margin: "0 0 24px" }} />

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Date */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4, fontFamily: "sans-serif" }}>Date</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: "sans-serif" }}>{formattedDate}</div>
        </div>

        {/* Seal */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, #6C47FF, #2ABFBF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(108,71,255,0.25)", margin: "0 auto 6px",
          }}>
            <span style={{ fontSize: 28 }}>🏆</span>
          </div>
          <div style={{ fontSize: 9, color: "#9CA3AF", fontFamily: "sans-serif", letterSpacing: 1 }}>COLLADE AI</div>
        </div>

        {/* School / Signature */}
        <div style={{ textAlign: "right" }}>
          {schoolName ? (
            <>
              <div style={{ width: 120, borderBottom: "1.5px solid #374151", marginBottom: 4, marginLeft: "auto" }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: "sans-serif" }}>{schoolName}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>Mentor / School</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Issued by</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#6C47FF", fontFamily: "sans-serif" }}>Collade AI</div>
            </>
          )}
        </div>
      </div>

      {/* Bottom border line */}
      <div style={{ height: 6, background: "linear-gradient(to right, #2ABFBF, #6C47FF)", borderRadius: 3, marginTop: 40 }} />
    </div>
  );
}

export default function CareerCertificate() {
  const { deductCredit } = useCredits();
  const [studentName, setStudentName] = useState("");
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split("T")[0]);
  const [schoolName, setSchoolName] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [badges, setBadges] = useState([]);
  const [showCert, setShowCert] = useState(false);
  const [exporting, setExporting] = useState(false);
  const certRef = useRef(null);

  useEffect(() => {
    Promise.all([
      entities.UserSkill.list("-created_date", 50),
      entities.UserAchievement.list("-created_date", 1),
    ]).then(([skills, achs]) => {
      setAvailableSkills(skills.map(s => s.skill_name));
      setBadges(achs?.[0]?.badges || []);
    });
  }, []);

  const toggleSkill = s => setSelectedSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const togglePath = p => setSelectedPaths(p2 => p2.includes(p) ? p2.filter(x => x !== p) : [...p2, p]);

  const formattedDate = completionDate
    ? new Date(completionDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const safeName = studentName.replace(/\s/g, "_") || "Certificate";

  const downloadPDF = async () => {
    if (!certRef.current) return;
    setExporting(true);
    const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${safeName}_Collade_Certificate.pdf`);
    setExporting(false);
  };

  const downloadPNG = async () => {
    if (!certRef.current) return;
    setExporting(true);
    const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${safeName}_Collade_Certificate.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setExporting(false);
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6 max-w-4xl mx-auto">
      <SectionHeader title="Career Certificate" subtitle="Generate a professional certificate for your career exploration journey" icon={Award} />

      {/* Form */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Name *</label>
            <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Your full name..."
              className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date of Completion</label>
            <input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)}
              className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">School / Mentor Name (Optional)</label>
          <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g., Delhi Public School"
            className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {availableSkills.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills Explored</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableSkills.map(s => (
                <button key={s} onClick={() => toggleSkill(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${selectedSkills.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:border-primary/40"}`}>
                  {selectedSkills.includes(s) && <Check className="h-3 w-3 inline mr-1" />}{s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Career Paths Explored</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {CAREER_PATHS.map(p => (
              <button key={p} onClick={() => togglePath(p)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${selectedPaths.includes(p) ? "bg-accent text-accent-foreground border-accent" : "bg-secondary border-border hover:border-accent/40"}`}>
                {selectedPaths.includes(p) && <Check className="h-3 w-3 inline mr-1" />}{p}
              </button>
            ))}
          </div>
        </div>

        <button onClick={async () => { await deductCredit(); setShowCert(true); }} disabled={!studentName.trim()}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20">
          <Sparkles className="h-4 w-4" /> Preview Certificate
        </button>
      </div>

      {/* Certificate preview */}
      {showCert && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Certificate Preview</p>
            <div className="flex gap-2">
              <button onClick={downloadPNG} disabled={exporting}
                className="flex items-center gap-1.5 bg-secondary border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
                <Download className="h-4 w-4" /> Save as Image
              </button>
              <button onClick={downloadPDF} disabled={exporting}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </div>

          {/* Scroll container so wide cert doesn't break layout */}
          <div className="overflow-x-auto rounded-xl border border-border shadow-lg">
            <Certificate
              certRef={certRef}
              studentName={studentName}
              formattedDate={formattedDate}
              schoolName={schoolName}
              selectedSkills={selectedSkills}
              selectedPaths={selectedPaths}
              badges={badges}
            />
          </div>

          <p className="text-xs text-center text-muted-foreground">Click "Download PDF" or "Save as Image" — the file will download directly to your device.</p>
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}