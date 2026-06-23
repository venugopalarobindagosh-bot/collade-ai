import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop === 0) startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (startY.current === null) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setPullY(Math.min(diff * 0.5, THRESHOLD + 20));
  };

  const handleTouchEnd = async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    startY.current = null;
    setPullY(0);
  };

  const showIndicator = pullY > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showIndicator && (
        <div
          className="flex justify-center items-center py-2 transition-all duration-200"
          style={{ height: refreshing ? THRESHOLD : pullY }}
        >
          <Loader2
            className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
            style={{ transform: `rotate(${(pullY / THRESHOLD) * 360}deg)` }}
          />
        </div>
      )}
      {children}
    </div>
  );
}