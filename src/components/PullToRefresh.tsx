"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72; // px to pull before triggering refresh
const MAX_PULL = 100; // max visual pull distance

interface Props {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export default function PullToRefresh({ onRefresh, children, className }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start pull if at top of scroll
    const el = (e.currentTarget as HTMLElement);
    if (el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || refreshing) return;
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop > 0) {
      startYRef.current = null;
      return;
    }
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) return;

    pullingRef.current = true;
    // Rubber-band effect: slow down as it approaches MAX_PULL
    const distance = Math.min(delta * 0.5, MAX_PULL);
    setPullDistance(distance);
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    startYRef.current = null;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 0 || refreshing;

  return (
    <div
      className={`overflow-y-auto${className ? ` ${className}` : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200"
        style={{
          height: showIndicator ? (refreshing ? 48 : pullDistance) : 0,
          overflow: "hidden",
        }}
      >
        <RefreshCw
          size={22}
          className={refreshing ? "animate-spin" : ""}
          style={{
            color: "#c8a96e",
            opacity: refreshing ? 1 : progress,
            transform: `rotate(${progress * 360}deg)`,
            transition: refreshing ? undefined : "transform 0.05s linear",
          }}
        />
      </div>

      {children}
    </div>
  );
}
