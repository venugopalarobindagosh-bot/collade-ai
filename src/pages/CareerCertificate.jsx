import { useState, useEffect, useRef } from "react";
import { Award, Download, Sparkles, Check, Shield, Lock } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import FeatureGate from "../components/FeatureGate";
import { entities } from "@/api/entities";
import { getCurrentUser } from "@/lib/auth";
import SectionHeader from "../components/SectionHeader";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Logo — served from /public folder
const LOGO_URL = "/collade-logo.png";

const REQUIRED_SKILLS = 3;
const REQUIRED_BADGES = 1;

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
  try {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 16; i++) {
      id += chars[randomBytes[i] % chars.length];
    }
  } catch (e) {
    for (let i = 0; i < 16; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `LM-${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}`;
}

// ────────────────────────────────────────────────────────
// CERTIFICATE COMPONENT — fixed 1200x850 aspect
// ────────────────────────────────────────────────────────
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
  const BRAND_PURPLE = "#6C47FF";
  const BRAND_TEAL = "#2ABFBF";
  const GOLD = "#C9A961";
  const GOLD_LIGHT = "#E8D5A0";
  const INK = "#0F172A";
  const INK_SOFT = "#475569";
  const PAPER = "#FFFDF7";

  return (
    <div
      ref={certRef}
      style={{
        width: 1200,
        height: 850,
        background: PAPER,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        color: INK,
      }}
    >
      {/* Watermark logo */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.035,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <img
          src={LOGO_URL}
          alt=""
          crossOrigin="anonymous"
          style={{ width: 520, height: 520, objectFit: "contain" }}
        />
      </div>

      {/* Double gold border */}
      <div
        style={{
          position: "absolute",
          inset: 24,
          border: `2px solid ${GOLD}`,
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 32,
          border: `1px solid ${GOLD_LIGHT}`,
          zIndex: 1,
        }}
      />

      {/* Corner ornaments */}
      {[
        { top: 24, left: 24, bt: true, bl: true },
        { top: 24, right: 24, bt: true, br: true },
        { bottom: 24, left: 24, bb: true, bl: true },
        { bottom: 24, right: 24, bb: true, br: true },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 40,
            height: 40,
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            right: pos.right,
            zIndex: 2,
            borderTop: pos.bt ? `3px solid ${GOLD}` : "none",
            borderBottom: pos.bb ? `3px solid ${GOLD}` : "none",
            borderLeft: pos.bl ? `3px solid ${GOLD}` : "none",
            borderRight: pos.br ? `3px solid ${GOLD}` : "none",
          }}
        />
      ))}

      {/* Top gradient bar */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translateX(-50%)",
          width: 220,
          height: 4,
          background: `linear-gradient(90deg, ${BRAND_PURPLE}, ${BRAND_TEAL})`,
          borderRadius: 2,
          zIndex: 2,
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          padding: "78px 96px 60px 96px",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 34,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img
              src={LOGO_URL}
              alt="Collade AI"
              crossOrigin="anonymous"
              style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                objectFit: "cover",
                boxShadow: "0 2px 8px rgba(108,71,255,0.18)",
              }}
            />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.6, color: INK, lineHeight: 1 }}>
                Collade AI
              </div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3.5,
                  color: INK_SOFT,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                Career Intelligence Platform
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: INK_SOFT,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Certificate No.
            </div>
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 13,
                fontWeight: 700,
                color: INK,
                letterSpacing: 0.5,
              }}
            >
              {certId}
            </div>
          </div>
        </div>

        {/* TITLE */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 8,
              color: GOLD,
              textTransform: "uppercase",
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            Certificate of Achievement
          </div>
          <div style={{ width: 90, height: 2, background: GOLD, margin: "0 auto" }} />
        </div>

        {/* PRESENTED TO */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div
            style={{
              fontSize: 11,
              color: INK_SOFT,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 500,
              marginBottom: 18,
            }}
          >
            This certificate is proudly presented to
          </div>

          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: BRAND_PURPLE,
              letterSpacing: -2,
              lineHeight: 1.05,
              marginBottom: 22,
              fontFamily: "'Playfair Display', 'Georgia', serif",
            }}
          >
            {studentName || "Student Name"}
          </div>

          <div
            style={{
              fontSize: 14,
              color: INK_SOFT,
              maxWidth: 700,
              margin: "0 auto",
              lineHeight: 1.75,
            }}
          >
            in recognition of exemplary dedication to career exploration and skill mastery on the
            Collade AI platform. Through rigorous verification, demonstrated curiosity, and consistent
            commitment, this student has achieved meaningful progress toward their professional future.
          </div>
        </div>

        {/* STATS + SKILLS */}
        <div style={{ display: "flex", gap: 20, marginBottom: 26, flex: 1 }}>
          <div
            style={{
              width: 220,
              background: "#F8F7FF",
              borderRadius: 14,
              padding: "20px 22px",
              border: `1px solid ${BRAND_PURPLE}22`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: INK_SOFT,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 18,
              }}
            >
              Verified Progress
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: BRAND_PURPLE,
                  lineHeight: 1,
                  letterSpacing: -1,
                }}
              >
                {totalXP}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: INK_SOFT,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                Total XP Earned
              </div>
            </div>

            <div style={{ height: 1, background: "#E2E8F0", marginBottom: 16 }} />

            <div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: BRAND_TEAL,
                  lineHeight: 1,
                  letterSpacing: -1,
                }}
              >
                {completedSkills}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: INK_SOFT,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                Skills Verified
              </div>
            </div>
          </div>

          {selectedSkills.length > 0 && (
            <div
              style={{
                flex: 1,
                background: "#F9FAFB",
                borderRadius: 14,
                padding: "20px 22px",
                border: "1px solid #E5E7EB",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: INK_SOFT,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                Skills Verified
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {selectedSkills.slice(0, 8).map((s, i) => (
                  <span
                    key={i}
                    style={{
                      background: `${BRAND_PURPLE}15`,
                      color: BRAND_PURPLE,
                      borderRadius: 6,
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ✓ {s}
                  </span>
                ))}
                {selectedSkills.length > 8 && (
                  <span
                    style={{
                      fontSize: 11,
                      color: INK_SOFT,
                      padding: "5px 0",
                      fontStyle: "italic",
                    }}
                  >
                    +{selectedSkills.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BADGES */}
        {badges.length > 0 && (
          <div
            style={{
              background: "#FFFBEB",
              borderRadius: 14,
              padding: "16px 22px",
              border: `1px solid ${GOLD}33`,
              marginBottom: 26,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: "#92400E",
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Badges Earned — {badges.length}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {badges.map((b, i) => (
                <div
                  key={i}
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${GOLD}66`,
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12,
                    color: "#78350F",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: `0 1px 3px ${GOLD}15`,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{BADGE_ICONS[b] || "🏅"}</span>
                  {BADGE_NAMES[b] || b}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CAREER PATHS */}
        {selectedPaths.length > 0 && (
          <div
            style={{
              background: "#ECFEFF",
              borderRadius: 14,
              padding: "14px 22px",
              border: `1px solid ${BRAND_TEAL}33`,
              marginBottom: 26,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: "#155E75",
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Career Paths Explored
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {selectedPaths.slice(0, 8).map((p, i) => (
                <span
                  key={i}
                  style={{
                    background: "#CFFAFE",
                    color: "#155E75",
                    borderRadius: 6,
                    padding: "4px 11px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  → {p}
                </span>
              ))}
              {selectedPaths.length > 8 && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#0E7490",
                    padding: "4px 0",
                    fontStyle: "italic",
                  }}
                >
                  +{selectedPaths.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* FOOTER: SIGNATURES */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 24,
            borderTop: `1px solid ${GOLD_LIGHT}`,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: 200,
                borderBottom: `1.5px solid ${INK}`,
                marginBottom: 8,
              }}
            />
            <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{formattedDate}</div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2.5,
                color: INK_SOFT,
                textTransform: "uppercase",
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              Date of Issue
            </div>
          </div>

          <div style={{ textAlign: "center", padding: "0 40px" }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: `radial-gradient(circle at 30% 30%, ${GOLD_LIGHT}, ${GOLD})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 6px 20px ${GOLD}44`,
                border: "3px solid #FFFFFF",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 6,
                  borderRadius: "50%",
                  border: "1px dashed #FFFFFFAA",
                }}
              />
              <div style={{ fontSize: 34, marginBottom: 2 }}>🏆</div>
              <div
                style={{
                  fontSize: 7,
                  letterSpacing: 1.5,
                  color: "#FFFFFF",
                  fontWeight: 900,
                  textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                VERIFIED
              </div>
            </div>
            <div
              style={{
                fontSize: 8,
                color: INK_SOFT,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              Official Seal
            </div>
          </div>

          <div style={{ flex: 1, textAlign: "right" }}>
            <div
              style={{
                width: 200,
                borderBottom: `1.5px solid ${INK}`,
                marginBottom: 8,
                marginLeft: "auto",
              }}
            />
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: INK,
                fontFamily: schoolName ? "inherit" : "'Playfair Display', 'Georgia', serif",
                fontStyle: schoolName ? "normal" : "italic",
              }}
            >
              {schoolName || "Sam Emmanuel"}
            </div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2.5,
                color: INK_SOFT,
                textTransform: "uppercase",
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {schoolName ? "Mentor / School" : "Founder, Collade AI"}
            </div>
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 9,
            color: "#94A3B8",
            letterSpacing: 1.2,
          }}
        >
          This certificate is issued by Collade AI Academy. Skill and badge verification completed through Collade's
          AI-powered assessment system.
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────
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
  const [loading, setLoading] = useState(true);
  const [achievementRecord, setAchievementRecord] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const certRef = useRef(null);

  const eligible = completedSkills >= REQUIRED_SKILLS && badges.length >= REQUIRED_BADGES;
  const skillsRemaining = Math.max(0, REQUIRED_SKILLS - completedSkills);
  const badgesRemaining = Math.max(0, REQUIRED_BADGES - badges.length);

  useEffect(() => {
    getCurrentUser().then(me => {
      if (!me?.email) {
        setLoading(false);
        return;
      }
      setUserEmail(me.email);

      Promise.all([
        entities.UserSkill.filter({ created_by: me.email }, "-created_date", 100),
        entities.UserAchievement.filter({ created_by: me.email }, "-created_date", 1),
      ]).then(([skills, achs]) => {
        const achievement = achs?.[0] || null;
        setAchievementRecord(achievement);

        const completed = (skills || []).filter(s => s.status === "completed");
        setAvailableSkills(completed.map(s => s.skill_name));
        setSelectedSkills(completed.map(s => s.skill_name));
        setCompletedSkills(completed.length);

        setTotalXP(completed.reduce((acc, s) => acc + (s.points || 0), 0));
        setBadges(achievement?.badges || []);

        if (achievement?.certificate_id) {
          setCertId(achievement.certificate_id);
        }

        if (me.full_name || me.email) {
          setStudentName(me.full_name || me.email.split("@")[0]);
        }

        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, []);

  const toggleSkill = s => setSelectedSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const togglePath = p => setSelectedPaths(p2 => p2.includes(p) ? p2.filter(x => x !== p) : [...p2, p]);

  const formattedDate = completionDate
    ? new Date(completionDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const safeName = (studentName || "Student").replace(/\s/g, "_");

  const handlePreview = async () => {
    if (!eligible) return;
    await deductCredit();

    let idToUse = certId;
    if (!idToUse) {
      idToUse = generateCertId();
      setCertId(idToUse);

      try {
        if (achievementRecord?.id) {
          await entities.UserAchievement.update(achievementRecord.id, {
            certificate_id: idToUse,
            certificate_issued_at: new Date().toISOString(),
          });
        } else if (userEmail) {
          const created = await entities.UserAchievement.create({
            certificate_id: idToUse,
            certificate_issued_at: new Date().toISOString(),
            total_points: totalXP,
            badges: badges,
          });
          setAchievementRecord(created);
        }
      } catch (err) {
        console.error('[Certificate] Save cert ID error:', err);
      }
    }

    setShowCert(true);
  };

  const downloadPDF = async () => {
    if (!certRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFDF7",
      });
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
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFDF7",
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <FeatureGate onUpgrade={() => {}}>
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="Career Certificate"
        subtitle="Earn a verifiable certificate by completing verified skills and unlocking badges"
        icon={Award}
      />

      {/* LOCKED STATE */}
      {!eligible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="font-heading text-xl font-bold text-amber-900 mb-2">
            Certificate Locked
          </h2>
          <p className="text-sm text-amber-800 mb-6 max-w-md mx-auto">
            Complete the requirements below to unlock your official Collade AI Certificate of Achievement.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto text-left">
            <div className="bg-white rounded-xl p-4 border border-amber-200">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                Verified Skills
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-black text-amber-900">{completedSkills}</span>
                <span className="text-sm text-amber-600">/ {REQUIRED_SKILLS} required</span>
              </div>
              <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (completedSkills / REQUIRED_SKILLS) * 100)}%` }}
                />
              </div>
              {skillsRemaining > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  {skillsRemaining} more skill{skillsRemaining !== 1 ? "s" : ""} needed
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl p-4 border border-amber-200">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                Badges Earned
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-black text-amber-900">{badges.length}</span>
                <span className="text-sm text-amber-600">/ {REQUIRED_BADGES} required</span>
              </div>
              <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (badges.length / REQUIRED_BADGES) * 100)}%` }}
                />
              </div>
              {badgesRemaining > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  {badgesRemaining} more badge{badgesRemaining !== 1 ? "s" : ""} needed
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-amber-700">
            <Sparkles className="w-4 h-4" />
            <span>Skills count only after you pass the verification quiz</span>
          </div>
        </motion.div>
      )}

      {/* ELIGIBLE STATE */}
      {eligible && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3"
          >
            <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-emerald-900">🎉 You're eligible for a certificate!</p>
              <p className="text-emerald-700 text-xs mt-1">
                {completedSkills} verified skills • {badges.length} badge{badges.length !== 1 ? "s" : ""} • {totalXP} XP earned
              </p>
            </div>
          </motion.div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Student Name *
                </label>
                <input
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Your full name..."
                  className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Date of Completion
                </label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={e => setCompletionDate(e.target.value)}
                  className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                School / Mentor Name (Optional)
              </label>
              <input
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="e.g., Delhi Public School"
                className="w-full mt-1.5 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {availableSkills.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Skills Verified ({selectedSkills.length} selected)
                </label>
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Career Paths Explored ({selectedPaths.length} selected)
              </label>
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
              disabled={!studentName.trim() || exporting}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20"
            >
              <Sparkles className="h-4 w-4" />
              {showCert ? "Regenerate Certificate" : "Preview Certificate"}
            </button>
          </div>

          {showCert && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
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

              <div className="w-full overflow-x-auto rounded-xl border border-border shadow-lg bg-[#FFFDF7]">
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
                Scroll horizontally on mobile to see the full certificate. Download PDF for the print-ready version.
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
    </FeatureGate>
  );
}