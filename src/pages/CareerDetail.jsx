import { useState, useEffect } from "react";
import { ArrowLeft, Clock, MapPin, DollarSign, Zap, TrendingUp, BookOpen, GraduationCap, Users, Brain, Briefcase, Globe, Star } from "lucide-react";
import { invokeLLM } from "@/api/llm";
import { Link } from "react-router-dom";
import LoadingGrid from "../components/LoadingGrid";
import { motion } from "framer-motion";

// ✅ FIX: Safe string converter
function safeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // If it's an object with average/range, format it
    if (value.average !== undefined) {
      return value.average;
    }
    if (value.range !== undefined) {
      return value.range;
    }
    // Try to get a string representation
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

export default function CareerDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const name = urlParams.get("name") || "";
  const stream = urlParams.get("stream") || "";
  const level = urlParams.get("level") || "";

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!name) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const prompt = `Provide an extremely detailed career/degree guide for: "${name}"
${stream ? `Stream: ${stream}` : ""}
${level ? `Level: ${level}` : ""}

Include EVERYTHING a student would need to know. Be comprehensive, accurate, and engaging.

Return a JSON object with:
- name, full_title, stream, specialization, level, duration, overview
- what_you_will_learn (array)
- required_subjects (array)
- entrance_exams (array)
- top_universities_india (array)
- top_universities_global (array)
- career_options (array)
- salary_india, salary_global, salary_entry, salary_mid, salary_senior
- ai_impact, ai_impact_detail, growth_potential, growth_detail
- personality_fit, stress_level, work_life_balance
- skills_needed (array), future_proof_skills (array)
- popular_locations (array), emerging_specializations (array)
- related_certifications (array), internship_opportunities, online_resources (array)
- day_in_the_life, pros (array), cons (array), quick_summary`;

        const response = await invokeLLM({
          prompt: prompt,
          query: prompt
        });

        console.log('[CareerDetail] Raw response:', response);

        let parsedData = null;
        if (typeof response === 'string') {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsedData = JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.error('[CareerDetail] JSON parse error:', e);
            }
          }
        } else if (typeof response === 'object') {
          parsedData = response;
        }

        const detailData = {
          name: parsedData?.name || name,
          full_title: parsedData?.full_title || name,
          stream: parsedData?.stream || stream || "Various",
          specialization: parsedData?.specialization || "",
          level: parsedData?.level || level || "Varies",
          duration: parsedData?.duration || "Varies",
          overview: parsedData?.overview || "Detailed information about this career path.",
          what_you_will_learn: parsedData?.what_you_will_learn || [],
          required_subjects: parsedData?.required_subjects || [],
          entrance_exams: parsedData?.entrance_exams || [],
          top_universities_india: parsedData?.top_universities_india || [],
          top_universities_global: parsedData?.top_universities_global || [],
          career_options: parsedData?.career_options || [],
          salary_india: parsedData?.salary_india || "Varies",
          salary_global: parsedData?.salary_global || "Varies",
          salary_entry: parsedData?.salary_entry || "Varies",
          salary_mid: parsedData?.salary_mid || "Varies",
          salary_senior: parsedData?.salary_senior || "Varies",
          ai_impact: parsedData?.ai_impact || "Medium",
          ai_impact_detail: parsedData?.ai_impact_detail || "AI impact varies by specialization.",
          growth_potential: parsedData?.growth_potential || "Stable",
          growth_detail: parsedData?.growth_detail || "Growth opportunities exist in this field.",
          personality_fit: parsedData?.personality_fit || "Varies by individual",
          stress_level: parsedData?.stress_level || "Moderate",
          work_life_balance: parsedData?.work_life_balance || "Varies by employer",
          skills_needed: parsedData?.skills_needed || [],
          future_proof_skills: parsedData?.future_proof_skills || [],
          popular_locations: parsedData?.popular_locations || [],
          emerging_specializations: parsedData?.emerging_specializations || [],
          related_certifications: parsedData?.related_certifications || [],
          internship_opportunities: parsedData?.internship_opportunities || "Varies by location",
          online_resources: parsedData?.online_resources || [],
          day_in_the_life: parsedData?.day_in_the_life || "A typical day involves working on projects, collaborating with colleagues, and solving problems.",
          pros: parsedData?.pros || ["Good career prospects"],
          cons: parsedData?.cons || ["May require ongoing learning"],
          quick_summary: parsedData?.quick_summary || "A solid career path with good opportunities."
        };

        console.log('[CareerDetail] Parsed:', detailData);
        setDetail(detailData);
      } catch (err) {
        console.error('[CareerDetail] Error:', err);
        setError(err.message || 'Failed to load career details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [name, stream, level]);

  if (loading) return <LoadingGrid text={`Loading details for ${name}...`} />;
  if (error) return <p className="text-center py-20 text-destructive">{error}</p>;
  if (!detail) return <p className="text-center py-20 text-muted-foreground">Career not found</p>;

  // ✅ FIX: Safe InfoRow component
  const InfoRow = ({ icon: Icon, label, value }) => {
    const safeValue = safeString(value);
    if (!safeValue) return null;
    return (
      <div className="flex items-start gap-3 py-3 border-b border-border/50">
        <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium mt-0.5">{safeValue}</p>
        </div>
      </div>
    );
  };

  // ✅ FIX: Safe TagSection component
  const TagSection = ({ title, items, color = "bg-secondary" }) => {
    if (!items || items.length === 0) return null;
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className={`text-xs ${color} px-2.5 py-1 rounded-md font-medium`}>{safeString(item)}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border border-primary/10 rounded-2xl p-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {detail.level && <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-md">{detail.level}</span>}
          {detail.stream && <span className="text-xs font-medium bg-secondary px-2.5 py-1 rounded-md">{detail.stream}</span>}
          {detail.specialization && <span className="text-xs font-medium bg-accent/10 text-accent px-2.5 py-1 rounded-md">{detail.specialization}</span>}
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">{detail.full_title || detail.name}</h1>
        {detail.quick_summary && <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-2xl">{safeString(detail.quick_summary)}</p>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Clock, label: "Duration", value: detail.duration },
          { icon: DollarSign, label: "Salary (Entry)", value: detail.salary_entry },
          { icon: TrendingUp, label: "Growth", value: detail.growth_potential },
          { icon: Zap, label: "AI Impact", value: detail.ai_impact },
        ].filter(i => i.value).map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <item.icon className="h-4 w-4 text-primary" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-2">{item.label}</p>
            <p className="font-heading font-bold mt-0.5">{safeString(item.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {detail.overview && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Overview</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{safeString(detail.overview)}</p>
            </div>
          )}

          {detail.day_in_the_life && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> A Day in the Life</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{safeString(detail.day_in_the_life)}</p>
            </div>
          )}

          <TagSection title="What You'll Learn" items={detail.what_you_will_learn} color="bg-primary/10 text-primary" />
          <TagSection title="Career Options" items={detail.career_options} color="bg-accent/10 text-accent" />

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-heading font-bold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Salary Guide</h3>
            <InfoRow icon={DollarSign} label="India" value={detail.salary_india} />
            <InfoRow icon={Globe} label="Global" value={detail.salary_global} />
            <InfoRow icon={Briefcase} label="Entry Level" value={detail.salary_entry} />
            <InfoRow icon={TrendingUp} label="Mid Level" value={detail.salary_mid} />
            <InfoRow icon={Star} label="Senior Level" value={detail.salary_senior} />
          </div>

          {detail.ai_impact_detail && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> AI Impact Analysis</h3>
              <p className="text-sm text-muted-foreground mt-2">{safeString(detail.ai_impact_detail)}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {detail.pros && detail.pros.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-bold text-green-600 text-sm mb-2">✅ Pros</h3>
                <ul className="space-y-1.5">
                  {detail.pros.map((p, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-green-500 mt-1">•</span>{safeString(p)}</li>)}
                </ul>
              </div>
            )}
            {detail.cons && detail.cons.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-bold text-red-500 text-sm mb-2">⚠️ Cons</h3>
                <ul className="space-y-1.5">
                  {detail.cons.map((c, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-red-400 mt-1">•</span>{safeString(c)}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <InfoRow icon={Users} label="Personality Fit" value={detail.personality_fit} />
            <InfoRow icon={Brain} label="Stress Level" value={detail.stress_level} />
            <InfoRow icon={Clock} label="Work-Life Balance" value={detail.work_life_balance} />
            <InfoRow icon={Briefcase} label="Internships" value={detail.internship_opportunities} />
          </div>

          <TagSection title="Required Subjects" items={detail.required_subjects} />
          <TagSection title="Entrance Exams" items={detail.entrance_exams} color="bg-destructive/10 text-destructive" />
          <TagSection title="Skills Needed" items={detail.skills_needed} color="bg-primary/10 text-primary" />
          <TagSection title="Future-Proof Skills" items={detail.future_proof_skills} color="bg-accent/10 text-accent" />
          <TagSection title="Emerging Specializations" items={detail.emerging_specializations} />
          <TagSection title="Related Certifications" items={detail.related_certifications} />
          <TagSection title="Popular Locations" items={detail.popular_locations} />

          {detail.top_universities_india && detail.top_universities_india.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Universities (India)</p>
              <ul className="space-y-1">
                {detail.top_universities_india.map((u, i) => (
                  <li key={i} className="text-sm flex items-center gap-2"><GraduationCap className="h-3 w-3 text-primary shrink-0" />{safeString(u)}</li>
                ))}
              </ul>
            </div>
          )}

          {detail.top_universities_global && detail.top_universities_global.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Universities (Global)</p>
              <ul className="space-y-1">
                {detail.top_universities_global.map((u, i) => (
                  <li key={i} className="text-sm flex items-center gap-2"><Globe className="h-3 w-3 text-accent shrink-0" />{safeString(u)}</li>
                ))}
              </ul>
            </div>
          )}

          {detail.online_resources && detail.online_resources.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Online Resources</p>
              <ul className="space-y-1">
                {detail.online_resources.map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {safeString(r)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}