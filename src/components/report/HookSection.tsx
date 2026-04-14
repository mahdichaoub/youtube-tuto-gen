interface HookSectionProps {
  whyMatters: string;
  projectContext?: string;
}

export function HookSection({ whyMatters, projectContext }: HookSectionProps) {
  if (!whyMatters) return null;
  return (
    <div className="rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-2">
        🔥 Why This Matters To You
      </p>
      <p className="text-sm leading-relaxed text-violet-50">{whyMatters}</p>
      {projectContext && (
        <p className="text-xs text-violet-300 mt-3 italic">
          Tailored for: {projectContext}
        </p>
      )}
    </div>
  );
}
