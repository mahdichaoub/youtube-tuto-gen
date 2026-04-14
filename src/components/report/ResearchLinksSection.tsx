interface ResourceLink {
  title: string;
  url: string;
  summary: string;
  source_type: string;
}

interface ResearchData {
  concept_articles: ResourceLink[];
  project_docs: ResourceLink[];
}

const SOURCE_BADGE: Record<string, string> = {
  official_docs: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  article: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  tool: "bg-green-500/10 text-green-600 dark:text-green-400",
  library: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

function ResourceRow({ item }: { item: ResourceLink }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-lg bg-background p-3 hover:bg-muted transition-colors group"
    >
      <span className="text-lg mt-0.5">📄</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium group-hover:underline leading-snug line-clamp-1">
            {item.title}
          </span>
          <span
            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${SOURCE_BADGE[item.source_type] ?? "bg-muted text-muted-foreground"}`}
          >
            {item.source_type.replace("_", " ")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.summary}</p>
      </div>
    </a>
  );
}

export function ResearchLinksSection({ research }: { research: ResearchData }) {
  const hasArticles = research.concept_articles?.length > 0;
  const hasDocs = research.project_docs?.length > 0;
  if (!hasArticles && !hasDocs) return null;

  return (
    <div className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/30 p-5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-400">
        🔍 Researcher Found For You
      </p>
      {hasArticles && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Concept resources</p>
          {research.concept_articles.map((item, i) => (
            <ResourceRow key={i} item={item} />
          ))}
        </div>
      )}
      {hasDocs && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">For your project</p>
          {research.project_docs.map((item, i) => (
            <ResourceRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
