import { useState, useEffect } from "react";
import { redirectToLogin } from "@/lib/auth";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import SocialProof from "@/components/landing/SocialProof";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import SampleCareers from "@/components/landing/SampleCareers";
import PricingSection from "@/components/landing/PricingSection";
import GuaranteeBadge from "@/components/landing/GuaranteeBadge";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import MobileStickyBar from "@/components/landing/MobileStickyBar";
import InstructionsPopup, { shouldShowInstructions } from "@/components/InstructionsPopup";

export default function Landing() {
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizStep, setQuizStep] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // ── Detect if running inside Capacitor native app ──
  const isApp = typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;

  // ── Show instructions popup on first app open ──
  useEffect(() => {
    if (!isApp) return;
    let mounted = true;
    shouldShowInstructions().then((should) => {
      if (mounted && should) setShowInstructions(true);
    });
    return () => { mounted = false; };
  }, [isApp]);

  const handleAnswer = (answer) => {
    const newAnswers = { ...quizAnswers, [quizStep - 1]: answer };
    setQuizAnswers(newAnswers);
    if (quizStep < 4) {
      setQuizStep(quizStep + 1);
    } else {
      setQuizStep(5);
    }
  };

  const handleLogin = () => {
    redirectToLogin("/dashboard");
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setQuizStep(1);
  };

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden w-full">
      <LandingNav onLogin={handleLogin} onScrollToPricing={scrollToPricing} isApp={isApp} />

      {/* A: Value Headline + Quiz */}
      <HeroSection
        quizStep={quizStep}
        quizStarted={quizStarted}
        onAnswer={handleAnswer}
        onStartQuiz={handleStartQuiz}
        onLogin={handleLogin}
        isApp={isApp}
      />

      {/* C: How it Works */}
      <HowItWorks onLogin={handleLogin} isApp={isApp} />

      {/* D: Social Proof */}
      <SocialProof />

      {/* E: Features */}
      <FeaturesGrid />

      {/* F: Sample Careers */}
      <SampleCareers onLogin={handleLogin} isApp={isApp} />

      {/* H: Guarantee */}
      <GuaranteeBadge />

      {/* G: Pricing */}
      <PricingSection onLogin={handleLogin} isApp={isApp} />

      {/* I: Final CTA */}
      <FinalCTA onLogin={handleLogin} isApp={isApp} />

      <LandingFooter />
      <MobileStickyBar onLogin={handleLogin} isApp={isApp} />

      {/* Instructions popup — only in app, only first open */}
      {showInstructions && <InstructionsPopup onClose={() => setShowInstructions(false)} />}
    </div>
  );
}