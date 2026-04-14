"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface StreakContextValue {
  currentStreak: number;
  setCurrentStreak: (value: number) => void;
}

const StreakContext = createContext<StreakContextValue>({
  currentStreak: 0,
  setCurrentStreak: () => {},
});

export function useStreak() {
  return useContext(StreakContext);
}

function StreakDisplay() {
  const { currentStreak } = useStreak();

  if (currentStreak === 0) return null;

  return (
    <span className="text-sm font-medium tabular-nums">
      🔥 {currentStreak}
    </span>
  );
}

export function StreakProvider({ children }: { children: ReactNode }) {
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    fetch("/api/streak")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.currentStreak === "number") {
          setCurrentStreak(data.currentStreak);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <StreakContext.Provider value={{ currentStreak, setCurrentStreak }}>
      {children}
    </StreakContext.Provider>
  );
}

export { StreakDisplay };
