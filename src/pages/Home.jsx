import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Compass, MapPin, Sparkles, TrendingUp, GitCompare, ArrowRight, Zap, Globe, BookOpen } from "lucide-react";

const features = [
  { path: "/explore-degrees", icon: GraduationCap, title: "Explore by Degree", desc: "Browse undergraduate to doctorate programs globally", color: "from-violet-500 to-purple-600" },
  { path: "/explore-topics", icon: Compass, title: "Explore by Topic", desc: "Find careers through your interests and passions", color: "from-teal-500 to-emerald-600" },
  { path: "/interest-matcher", icon: Sparkles, title: "Interest Matcher", desc: "AI maps your hobbies to perfect career paths", color: "from-amber-500 to-orange-600" },
  { path: "/dream-location", icon: MapPin, title: "Dream Location", desc: "Discover courses in your dream city or country", color: "from-rose-500 to-pink-600" },
  { path: "/recommendations", icon: Zap, title: "AI Recommendations", desc: "Personalized top career picks just for you", color: "from-blue-500 to-indigo-600" },
  { path: "/trends", icon: TrendingUp, title: "Future Trends", desc: "Careers AI will supercharge in 5–10 years", color: "from-cyan-500 to-teal-600" },
];

const quickStats = [
  { icon: BookOpen, value: "500+", label: "Degrees & Courses" },
  { icon: Globe, value: "50+", label: "Countries Covered" },
  { icon: Zap, value: "AI-Powered", label: "Smart Matching" },
];

export default function Home() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-background border border-primary/10 p-6 sm:p-10"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-4">
            <Sparkles className="h-3 w-3" /> AI-Powered Career Guidance
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Discover Your
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Perfect Career </span>
            Path
          </h1>
          <p className="mt-4 text-muted-foreground max-w-xl text-sm sm:text-base leading-relaxed">
            Explore every degree, diploma, and certification in the world. Get AI-powered recommendations based on your interests, skills, and dream locations.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to="/interest-matcher"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <Sparkles className="h-4 w-4" /> Find My Match
            </Link>
            <Link
              to="/explore-degrees"
              className="inline-flex items-center gap-2 bg-card text-foreground border border-border px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
            >
              Explore Degrees <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {quickStats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="bg-card border border-border rounded-xl p-4 text-center"
          >
            <stat.icon className="h-5 w-5 text-primary mx-auto" />
            <p className="font-heading text-lg sm:text-xl font-bold mt-2">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Feature grid */}
      <section>
        <h2 className="font-heading text-xl font-bold mb-4">Start Exploring</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Link to={feature.path} className="block group">
                <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 h-full">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-heading font-semibold mt-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{feature.desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-3 group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Compare CTA */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4"
      >
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <GitCompare className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="font-heading font-semibold">Compare Courses & Careers</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Put two degrees side by side and see how they stack up</p>
        </div>
        <Link
          to="/compare"
          className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          Compare Now <ArrowRight className="h-3 w-3" />
        </Link>
      </motion.section>
    </div>
  );
}