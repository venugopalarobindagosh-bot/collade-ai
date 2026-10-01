import { useState, useEffect, useRef } from "react";
import { Award, Download, Sparkles, Check, Shield } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { entities } from "@/api/entities";
import { getCurrentUser } from "@/lib/auth";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

const CAREER_PATHS = [
  "Software Engineering", "Data Science", "Product Management", "UX Design",
  "Cybersecurity", "Medicine", "Finance", "Architecture", "Law", "Psychology",
  "Marketing", "Mechanical Engineering", "Biotechnology", "AI/ML Engineering",
];

function generateCertId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `COLLADE-${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8, 12)}`;
}

function Certificate({
  studentName,
  formattedDate,
  schoolName,
  selectedSkills,
  selectedPaths,
  badges,
  certId,
  totalXP,
  completedSkills,
  certRef,
}) {
  return (
    <div
      ref={certRef}
      style={{
        width: 1000,
        minHeight: 700,
        background: "#ffffff",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "0",
        boxSizing: "border-box",
      }}
    >
      {/* Outer thin gold frame */}
      <div style={{
        position: "absolute",
        inset: 20,
        border: "1px solid #D4A017",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        inset: 26,
        border: "3px solid #D4A017",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{ padding: "60px 80px", position: "relative", zIndex: 1 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #6C47FF, #2ABFBF)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>C</span>
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#111827", letterSpacing: -0.5 }}>Collade AI</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 3, textTransform: "uppercase", fontWeight: 600 }}>Career Intelligence</div>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 10, color: "#9CA3AF", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
            Certificate ID<br />
            <span style={{ color: "#374151", fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{certId}</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 14, letterSpacing: 8, color: "#D4A017", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>
            Certificate of Achievement
          </div>
          <div style={{ height: 1, width: 80, background: "#D4A017", margin: "0 auto 20px" }} />
          <div style={{ fontSize: 12, color: "#6B7280", letterSpacing: 3, textTransform: "uppercase", fontWeight: 500 }}>
            This is to certify that
          </div>
        </div>

        {/* Name */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            fontSize: 62,
            fontWeight: 800,
            color: "#111827",
            letterSpacing: -1.5,
            lineHeight: 1.1,
            marginBottom: 20,
            fontFamily: "'Playfair Display', Georgia, serif",
          }}>
            {studentName || "Student Name"}
          </div>
          <div style={{ fontSize: 15, color: "#6B7280", maxWidth: 620, margin: "0 auto", lineHeight: 1.75 }}>
            has demonstrated exceptional commitment to career exploration on the Collade AI platform,
            successfully verifying knowledge, completing skills, and charting a personalized path toward their professional future.
          </div>
        </div>

        {/* Badges — show ALL earned (no cap) */}
        {badges.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: "#9CA3AF", textTransform: "uppercase", fontWeight: 700, textAlign: "center", marginBottom: 14 }}>
              Badges Earned ({badges.length})
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {badges.map((b, i) => (
                <div key={i} style={{
                  background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 20,
                  padding: "6px 14px", fontSize: 12, color: "#5B21B6", fontWeight: 700,
                  whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 14 }}>{BADGE_ICONS[b] || "🏅"}</span>
                  {BADGE_NAMES[b] || b}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats + Skills + Paths */}
        <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
          {/* Left: Stats */}
          <div style={{ width: 200, background: "#F9FAFB", borderRadius: 12, padding: "18px 20px", border: "1px solid #F3F4F6" }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#9CA3AF", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>
              Verified Progress
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#6C47FF", lineHeight: 1 }}>{totalXP}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>Total XP</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#2ABFBF", lineHeight: 1 }}>{completedSkills}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>Skills Verified</div>
            </div>
          </div>

          {/* Middle: Skills */}
          {selectedSkills.length > 0 && (
            <div style={{ flex: 1, background: "#F9FAFB", borderRadius: 12, padding: "18px 20px", border: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#9CA3AF", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
                Skills Verified
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedSkills.slice(0, 12).map((s, i) => (
                  <span key={i} style={{
                    background: "#EDE9FE", color: "#5B21B6", borderRadius: 5,
                    padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  }}>✓ {s}</span>
                ))}
                {selectedSkills.length > 12 && (
                  <span style={{ fontSize: 11, color: "#9CA3AF", padding: "4px 0" }}>+{selectedSkills.length - 12} more</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Career paths */}
        {selectedPaths.length > 0 && (
          <div style={{ background: "#F0FDFA", borderRadius: 12, padding: "16px 20px", border: "1px solid #CCFBF1", marginBottom: 28 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#0F766E", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
              Career Paths Explored
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {selectedPaths.slice(0, 10).map((p, i) => (
                <span key={i} style={{
                  background: "#CCFBF1", color: "#0F766E", borderRadius: 5,
                  padding: "4px 10px", fontSize: 11, fontWeight: 600,
                }}>→ {p}</span>
              ))}
              {selectedPaths.length > 10 && (
                <span style={{ fontSize: 11, color: "#0F766E", padding: "4px 0" }}>+{selectedPaths.length - 10} more</span>
              )}
            </div>
          </div>
        )}

        {/* Footer: Date + Seal + Issuer */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 40 }}>
          {/* Date */}
          <div style={{ flex: 1 }}>
            <div style={{ width: 180, borderBottom: "1px solid #374151", marginBottom: 6 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formattedDate}</div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>
              Date Issued
            </div>
          </div>

          {/* Seal */}
          <div style={{ textAlign: "center", padding: "0 20px" }}>
            <div style={{
              width: 90, height: 90, borderRadius: "50%",
              background: "linear-gradient(135deg, #D4A017, #B8860B)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 20px rgba(212,160,23,0.35)",
              border: "3px solid #FFFFFF",
              position: "relative",
            }}>
              <div style={{ fontSize: 32 }}>🏆</div>
              <div style={{ fontSize: 7, letterSpacing: 1, color: "#FFFAF0", fontWeight: 900, marginTop: -2 }}>VERIFIED</div>
            </div>
            <div style={{ fontSize: 8, color: "#9CA3AF", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginTop: 8 }}>
              Official Seal
            </div>
          </div>

          {/* Issuer / School */}
          <div style={{ flex: 1, textAlign: "right" }}>
            {schoolName ? (
              <>
                <div style={{ width: 180, borderBottom: "1px solid #374151", marginBottom: 6, marginLeft: "auto" }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{schoolName}</div>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>
                  Mentor / School
                </div>
              </>
            ) : (
              <>
                <div style={{ width: 180, borderBottom: "1px solid #374151", marginBottom: 6, marginLeft: "auto" }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Collade AI Academy</div>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>
                  Issued By
                </div>
              </>
            )}
          </div>
        </div>

        {/* Verification footer */}
        <div style={{ textAlign: "center", marginTop: 32, paddingTop: 20, borderTop: "1px solid #F3F4F6" }}>
          <p style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: 1, margin: 0 }}>
            Verify this certificate at <strong style={{ color: "#6C47FF" }}>colladeai.com/verify</strong> using ID <strong style={{ fontFamily: "monospace" }}>{certId}</strong>
          </p>
        </div>
      </div>
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
  const [totalXP, setTotalXP] = useState(0);
  const [completedSkills, setCompletedSkills] = useState(0);
  const [certId, setCertId] = useState("");
  const [showCert, setShowCert] = useState(false);
  const [exporting, setExporting] = useState(false);
  const certRef = useRef(null);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.email) return;
      Promise.all([
        entities.UserSkill.filter({ created_by: me.email }, "-created_date", 100),
        entities.UserAchievement.filter({ created_by: me.email }, "-created_date", 1),
      ]).then(([skills, achs]) => {
        // Only include COMPLETED skills in the certificate
        const completed = (skills || []).filter(s => s.status === "completed");
        setAvailableSkills(completed.map(s => s.skill_name));
        setSelectedSkills(completed.map(s => s.skill_name)); // pre-select all
        setBadges(achs?.[0]?.badges || []);
        setTotalXP((skills || [])
          .filter(s => s.status === "completed")
          .reduce((acc, s) => acc + (s.points || 0), 0));
        setCompletedSkills(completed.length);
        if (me.full_name || me.email) {
          setStudentName(me.full_name || me.email.split("@")[0]);
        }
      });
    });
  }, []);

  const toggleSkill = s => setSelectedSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const togglePath = p => setSelectedPaths(p2 => p2.includes(p) ? p2.filter(x => x !== p) : [...p2, p]);

  const formattedDate = completionDate
    ? new Date(completionDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const safeName = studentName.replace(/\s/g, "_") || "Certificate";

  const handlePreview = async () => {
    await deductCredit();
    // Generate unique cert ID once
    if (!certId) setCertId(generateCertId());
    setShowCert(true);
  };

  const downloadPDF = async () => {
    if (!certRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${safeName}_Collade_Certificate.pdf`);
    } catch (err) {
      console.error('[Certificate] PDF error:', err);
    } finally {
      setExporting(false);
    }
  };

  const downloadPNG = async () => {
    if (!certRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${safeName}_Collade_Certificate.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error('[Certificate] PNG error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="Career Certificate"
        subtitle="Generate a professional certificate showing your verified progress, skills, and badges"
        icon={Award}
      />

      {/* Form */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Name *</label>
            <input
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="Your full name..."
              className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date of Completion</label>
            <input
              type="date"
              value={completionDate}
              onChange={e => setCompletionDate(e.target.value)}
              className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">School / Mentor Name (Optional)</label>
          <input
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            placeholder="e.g., Delhi Public School"
            className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Verified info */}
        {completedSkills > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-800">You have {completedSkills} verified skill{completedSkills !== 1 ? 's' : ''} and {badges.length} badge{badges.length !== 1 ? 's' : ''}</p>
              <p className="text-green-700 text-xs mt-1">Only skills you've passed quizzes for will appear on your certificate.</p>
            </div>
          </div>
        )}

        {availableSkills.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills Verified (select to include)</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableSkills.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSkill(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                    selectedSkills.includes(s)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary border-border hover:border-primary/40"
                  }`}
                >
                  {selectedSkills.includes(s) && <Check className="h-3 w-3 inline mr-1" />}
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Career Paths Explored</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {CAREER_PATHS.map(p => (
              <button
                key={p}
                onClick={() => togglePath(p)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                  selectedPaths.includes(p)
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-secondary border-border hover:border-accent/40"
                }`}
              >
                {selectedPaths.includes(p) && <Check className="h-3 w-3 inline mr-1" />}
                {p}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handlePreview}
          disabled={!studentName.trim()}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-4 w-4" /> Preview Certificate
        </button>
      </div>

      {/* Certificate preview */}
      {showCert && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm font-semibold">Certificate Preview</p>
            <div className="flex gap-2">
              <button
                onClick={downloadPNG}
                disabled={exporting}
                className="flex items-center gap-1.5 bg-secondary border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Save as Image
              </button>
              <button
                onClick={downloadPDF}
                disabled={exporting}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border shadow-lg">
            <Certificate
              certRef={certRef}
              studentName={studentName}
              formattedDate={formattedDate}
              schoolName={schoolName}
              selectedSkills={selectedSkills}
              selectedPaths={selectedPaths}
              badges={badges}
              certId={certId}
              totalXP={totalXP}
              completedSkills={completedSkills}
            />
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Click "Download PDF" or "Save as Image" — the file will download directly to your device.
          </p>
        </motion.div>
      )}
    </div>
    </FeatureGate>
  );
}