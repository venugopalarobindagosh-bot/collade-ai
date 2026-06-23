import { Loader2 } from "lucide-react";

export default function LoadingGrid({ text = "Analyzing career paths with AI..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
        <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 animate-pulse -z-10" />
      </div>
      <p className="mt-5 text-sm text-muted-foreground font-medium">{text}</p>
      <div className="mt-3 flex gap-1">
        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}