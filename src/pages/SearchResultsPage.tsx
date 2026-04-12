import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Inbox,
  Sparkles,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Link as LinkIcon,
  StickyNote,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { searchRecords } from "@/lib/services";
import type { SearchResult, CitedSource } from "@/lib/services";

const contentTypeIcon = (type: string) => {
  switch (type) {
    case "link":
      return <LinkIcon className="h-3.5 w-3.5" />;
    case "pdf":
    case "document":
      return <FileText className="h-3.5 w-3.5" />;
    default:
      return <StickyNote className="h-3.5 w-3.5" />;
  }
};

const contentTypeColor = (type: string) => {
  switch (type) {
    case "link":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "pdf":
    case "document":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
};

const SearchResultsPage = () => {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const [search, setSearch] = useState(query);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchRecords(query),
    enabled: !!query,
  });

  const results = data?.results || [];
  const aiAnswer = data?.aiAnswer;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim())
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  // Render markdown-like text with [Source X] markers as clickable links
  const renderAnswer = (text: string) => {
    const parts = text.split(/(\[Source \d+\])/g);
    return parts.map((part, i) => {
      const sourceMatch = part.match(/\[Source (\d+)\]/);
      if (sourceMatch) {
        const idx = parseInt(sourceMatch[1]) - 1;
        const source = aiAnswer?.citedSources?.[idx];
        const recordId = source?.id || results[idx]?._id;
        return (
          <button
            key={i}
            onClick={() => recordId && navigate(`/record/${recordId}`)}
            className="inline-flex items-center gap-0.5 text-primary hover:text-primary/80 font-semibold text-xs bg-primary/10 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer mx-0.5"
          >
            <BookOpen className="h-3 w-3" />
            {sourceMatch[1]}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your knowledge vault..."
              className="h-12 pl-12 bg-card border-border rounded-xl"
            />
          </div>
        </form>

        {isLoading ? (
          <div className="space-y-4">
            {/* AI Answer skeleton */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded-full bg-primary/20" />
                <Skeleton className="h-5 w-32 bg-primary/20" />
              </div>
              <Skeleton className="h-4 w-full mb-2 bg-secondary" />
              <Skeleton className="h-4 w-full mb-2 bg-secondary" />
              <Skeleton className="h-4 w-3/4 mb-4 bg-secondary" />
              <Skeleton className="h-4 w-full mb-2 bg-secondary" />
              <Skeleton className="h-4 w-2/3 bg-secondary" />
            </div>
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-6"
              >
                <Skeleton className="h-6 w-3/4 mb-3 bg-secondary" />
                <Skeleton className="h-4 w-full mb-2 bg-secondary" />
                <Skeleton className="h-4 w-2/3 bg-secondary" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-6">
            {/* ─── AI Answer Panel ─── */}
            {aiAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/10 p-6 shadow-lg shadow-primary/5"
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                    AI Answer
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-primary/20 text-primary ml-auto"
                  >
                    {data?.searchMethod === "vector"
                      ? "Semantic Search"
                      : "Keyword Search"}
                  </Badge>
                </div>

                {/* Main Answer */}
                <div className="text-sm text-foreground/90 leading-relaxed mb-5 whitespace-pre-line">
                  {renderAnswer(aiAnswer.answer)}
                </div>

                {/* Key Insights */}
                {aiAnswer.keyInsights?.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Key Insights
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {aiAnswer.keyInsights.map(
                        (insight: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-foreground/80"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                            {insight}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {/* Suggested Actions */}
                {aiAnswer.suggestedActions?.length > 0 && (
                  <div className="mb-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                      Explore Next
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {aiAnswer.suggestedActions.map(
                        (action: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSearch(action);
                              navigate(
                                `/search?q=${encodeURIComponent(action)}`
                              );
                            }}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
                          >
                            <ArrowRight className="h-3 w-3" />
                            {action}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Cited Sources */}
                {aiAnswer.citedSources?.length > 0 && (
                  <div className="border-t border-border/50 pt-3">
                    <button
                      onClick={() => setShowSources(!showSources)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <BookOpen className="h-3 w-3" />
                      {aiAnswer.citedSources.length} source
                      {aiAnswer.citedSources.length !== 1 ? "s" : ""} cited
                      {showSources ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {showSources && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-2 space-y-2 overflow-hidden"
                      >
                        {aiAnswer.citedSources.map(
                          (src: CitedSource, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                              onClick={() =>
                                src.id && navigate(`/record/${src.id}`)
                              }
                            >
                              <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                {src.sourceIndex}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {src.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {src.relevance}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Source Records ─── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Source Records ({results.length})
              </p>
              <div className="space-y-3">
                {results.map((r: SearchResult, i: number) => (
                  <motion.div
                    key={r._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${contentTypeColor(r.contentType)}`}
                        >
                          {contentTypeIcon(r.contentType)}
                          <span className="ml-1 capitalize">
                            {r.contentType}
                          </span>
                        </Badge>
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {r.aiGeneratedTitle}
                        </h3>
                      </div>
                      {r.relevanceScore && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/20 bg-primary/5 text-primary shrink-0"
                        >
                          {r.relevanceScore}%
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed line-clamp-2">
                      {r.aiSummary}
                    </p>

                    {r.originalContent?.startsWith("http") && (
                      <a
                        href={r.originalContent}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2 truncate max-w-full"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.originalContent}</span>
                      </a>
                    )}

                    <button
                      onClick={() =>
                        setExpandedId(expandedId === r._id ? null : r._id)
                      }
                      className="flex items-center gap-1 text-xs text-primary font-medium mb-2"
                    >
                      {expandedId === r._id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {expandedId === r._id ? "Hide" : "Show"} details
                    </button>

                    {expandedId === r._id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mb-3 overflow-hidden"
                      >
                        {r.relevanceSummary && (
                          <p className="text-xs text-primary mb-2 bg-primary/5 p-2 rounded-lg border border-primary/10">
                            {r.relevanceSummary}
                          </p>
                        )}
                        <p className="text-sm text-foreground/80 mb-3">
                          {r.aiSummary}
                        </p>
                        <ul className="space-y-1 mb-3">
                          {r.keyPoints?.map((p: string, j: number) => (
                            <li
                              key={j}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <span className="mt-1 h-1.5 w-1.5 rounded-full gradient-bg shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {r.tags?.slice(0, 4).map((t: string) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="text-[10px] bg-secondary text-secondary-foreground"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border text-xs h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigate(`/record/${r._id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="rounded-full bg-secondary p-6 mb-4 mx-auto w-fit">
              <Inbox className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No results found
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-4">
              Try different keywords, or broaden your search terms.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["AI tools", "React", "System Design", "Internships"].map(
                (s) => (
                  <Button
                    key={s}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearch(s);
                      navigate(`/search?q=${encodeURIComponent(s)}`);
                    }}
                  >
                    {s}
                  </Button>
                )
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
