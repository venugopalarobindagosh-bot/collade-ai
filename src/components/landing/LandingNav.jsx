import { Compass } from "lucide-react";

export default function LandingNav({ onLogin, onScrollToPricing }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/8">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-yellow-400 flex items-center justify-center">
            <Compass className="h-4 w-4 text-black" />
          </div>
          <span className="font-heading font-bold text-white text-base tracking-tight">Collade AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onScrollToPricing}
            className="text-sm text-white/40 hover:text-white transition-colors hidden sm:block font-medium tracking-wide"
          >
            Pricing
          </button>
          <button
            onClick={onLogin}
            className="bg-yellow-400 hover:bg-yellow-300 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            Sign In Free →
          </button>
        </div>
      </div>
    </nav>
  );
}