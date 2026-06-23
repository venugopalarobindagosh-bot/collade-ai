import { Compass } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="bg-black text-white/30 py-10 px-4 border-t border-white/8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-yellow-400 flex items-center justify-center">
              <Compass className="h-3.5 w-3.5 text-black" />
            </div>
            <span className="font-heading font-bold text-white text-sm tracking-tight">Collade AI</span>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-xs">
            <a href="mailto:support@collade.ai" className="hover:text-white transition-colors">support@collade.ai</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Refund Policy</a>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-xs text-white/15 mb-5">
          {["🔒 Secured by Google Sign-In", "💳 Payments via Razorpay", "✅ UPI / Google Pay supported", "🔄 No auto-renewal ever", "💸 7-day refund on unused credits"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="border-t border-white/6 pt-5 text-center text-xs text-white/15">
          © 2026 Collade AI. All rights reserved. Career guidance powered by AI. Made for students.
        </div>
      </div>
    </footer>
  );
}