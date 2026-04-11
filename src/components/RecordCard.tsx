import { useNavigate } from "react-router-dom";
import { Video, FileText, Link as LinkIcon, StickyNote, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Record as KnowledgeRecord } from "@/lib/mockData";

const sourceIcons: { [key: string]: React.ElementType } = {
  video: Video,
  pdf: FileText,
  link: LinkIcon,
  note: StickyNote,
};

const sourceColors: { [key: string]: string } = {
  video: "bg-red-500/20 text-red-400 border-red-500/30",
  pdf: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  link: "bg-green-500/20 text-green-400 border-green-500/30",
  note: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

interface RecordCardProps {
  record: KnowledgeRecord;
}

const RecordCard = ({ record }: RecordCardProps) => {
  const navigate = useNavigate();
  const Icon = sourceIcons[record.sourceType] || FileText;

  return (
    <button
      onClick={() => navigate(`/record/${record.id}`)}
      className="w-full text-left rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 glow-hover group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${sourceColors[record.sourceType]} text-xs font-medium`}>
            <Icon className="mr-1 h-3 w-3" />
            {record.sourceType.charAt(0).toUpperCase() + record.sourceType.slice(1)}
          </Badge>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
      </div>
      <h3 className="font-semibold text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">{record.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{record.summary}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {new Date(record.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </div>
    </button>
  );
};

export default RecordCard;
