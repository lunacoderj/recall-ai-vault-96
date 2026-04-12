import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, ExternalLink, Video, FileText, Link as LinkIcon, StickyNote, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRecord } from "@/lib/services";

const sourceIcons: { [key: string]: React.ElementType } = { 
  video: Video, 
  pdf: FileText, 
  document: FileText,
  link: LinkIcon, 
  note: StickyNote 
};

const RecordPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rawExpanded, setRawExpanded] = useState(false);

  const { data: record, isLoading, error } = useQuery({
    queryKey: ["record", id],
    queryFn: () => getRecord(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">RecallAI is fetching your knowledge...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Record not found</h2>
          <p className="text-muted-foreground mb-4">The record you're looking for doesn't exist or there was an error fetching it.</p>
          <Button onClick={() => navigate("/home")} className="gradient-bg text-primary-foreground">Go Home</Button>
        </div>
      </div>
    );
  }

  const Icon = sourceIcons[record.contentType] || FileText;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <motion.article initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{record.aiGeneratedTitle}</h1>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge variant="outline" className="text-sm border-border capitalize">
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {record.contentType}
            </Badge>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(record.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-8">
            {record.tags.map((t) => (
              <Badge key={t} variant="secondary" className="bg-secondary text-secondary-foreground">{t}</Badge>
            ))}
          </div>

          {record.originalContent?.startsWith('http') && (
            <a href={record.originalContent} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 mb-8 hover:border-primary/40 transition-colors">
              <ExternalLink className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-primary truncate">{record.originalContent}</span>
            </a>
          )}

          {/* Summary */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">AI Summary</h2>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-foreground/90 leading-relaxed">{record.aiSummary}</p>
            </div>
          </section>

          {/* Key Takeaways */}
          {record.keyPoints && record.keyPoints.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">Key Takeaways</h2>
              <div className="rounded-xl border border-border bg-card p-5">
                <ul className="space-y-3">
                  {record.keyPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full gradient-bg shrink-0" />
                      <span className="text-foreground/90">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Raw Content */}
          {record.rawText && (
            <section className="mb-8">
              <button onClick={() => setRawExpanded(!rawExpanded)} className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3 hover:text-primary transition-colors">
                Raw Content / Transcript
                {rawExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {rawExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{record.rawText}</p>
                  </div>
                </motion.div>
              )}
            </section>
          )}
        </motion.article>
      </div>
    </div>
  );
};

export default RecordPage;
