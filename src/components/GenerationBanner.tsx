"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const SESSION_KEY = "learnagent_active_report_id";

interface GenerationContextValue {
  activeReportId: string | null;
  setActiveReportId: (id: string | null) => void;
}

const GenerationContext = createContext<GenerationContextValue>({
  activeReportId: null,
  setActiveReportId: () => {},
});

export function useGeneration() {
  return useContext(GenerationContext);
}

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [activeReportId, setActiveReportIdState] = useState<string | null>(null);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) setActiveReportIdState(stored);
    } catch {
      // sessionStorage unavailable (SSR or private browsing restriction)
    }
  }, []);

  const setActiveReportId = useCallback((id: string | null) => {
    setActiveReportIdState(id);
    try {
      if (id) {
        sessionStorage.setItem(SESSION_KEY, id);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <GenerationContext.Provider value={{ activeReportId, setActiveReportId }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function GenerationBanner() {
  const { activeReportId } = useGeneration();

  if (!activeReportId) return null;

  return (
    <div className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-primary">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Generating your report...</span>
      </div>
    </div>
  );
}
