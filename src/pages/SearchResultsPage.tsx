import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { mockRecords } from "@/lib/mockData";

const SearchResultsPage = () => {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const [search, setSearch] = useState(query);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const results = mockRecords.filter(
    (r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.summary.toLowerCase().includes(query.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <button onClick={() => navigate("/home")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-12 pl-12 bg-card border-border rounded-xl" />
          </div>
        </form>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <Skeleton className="h-6 w-3/4 mb-3 bg-secondary" />
                <Skeleton className="h-4 w-full mb-2 bg-secondary" />
                <Skeleton className="h-4 w-2/3 mb-4 bg-secondary" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full bg-secondary" />
                  <Skeleton className="h-6 w-20 rounded-full bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">{results.length} result{results.length !== 1 ? "s" : ""} for "<span className="text-foreground font-medium">{query}</span>"</p>
            <div className="space-y-4">
              {results.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{r.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{r.summary.slice(0, 150)}...</p>

                  {r.sourceUrl && (
                    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-3">
                      <ExternalLink className="h-3 w-3" /> {r.sourceUrl}
                    </a>
                  )}

                  <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="flex items-center gap-1 text-xs text-primary font-medium mb-3">
                    {expandedId === r.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {expandedId === r.id ? "Hide" : "Show"} full summary
                  </button>

                  {expandedId === r.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mb-3">
                      <p className="text-sm text-foreground/80 mb-3">{r.summary}</p>
                      <ul className="space-y-1.5 mb-3">
                        {r.keyPoints.map((p, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full gradient-bg shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs bg-secondary text-secondary-foreground">{t}</Badge>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="border-border text-sm" onClick={() => navigate(`/record/${r.id}`)}>
                      Open Full Record
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="rounded-full bg-secondary p-6 mb-4 mx-auto w-fit">
              <Inbox className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-4">Try different keywords, or broaden your search terms.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["AI tools", "React", "System Design", "Internships"].map((s) => (
                <Button key={s} variant="secondary" size="sm" onClick={() => { setSearch(s); navigate(`/search?q=${encodeURIComponent(s)}`); }}>
                  {s}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
