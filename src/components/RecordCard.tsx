import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video,
  FileText,
  Link as LinkIcon,
  StickyNote,
  Calendar,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { deleteRecord } from "@/lib/services";
import type { Record as KnowledgeRecord } from "@/lib/services";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const sourceIcons: { [key: string]: React.ElementType } = {
  video: Video,
  pdf: FileText,
  document: FileText,
  link: LinkIcon,
  note: StickyNote,
};

const sourceColors: { [key: string]: string } = {
  video: "bg-red-500/20 text-red-400 border-red-500/30",
  pdf: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  document: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  link: "bg-green-500/20 text-green-400 border-green-500/30",
  note: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

interface RecordCardProps {
  record: KnowledgeRecord;
}

const RecordCard = ({ record }: RecordCardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const Icon = sourceIcons[record.contentType] || FileText;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this record? This cannot be undone.")) return;

    setDeleting(true);
    try {
      await deleteRecord(record._id);
      queryClient.invalidateQueries({ queryKey: ["records"] });
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete record");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/record/${record._id}`)}
      className="w-full text-left rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 glow-hover group cursor-pointer relative"
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-destructive/10 text-destructive/60 hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all z-10"
        title="Delete record"
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>

      <div className="flex items-start justify-between gap-3 mb-3 pr-8">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${sourceColors[record.contentType] || sourceColors.note} text-xs font-medium`}
          >
            <Icon className="mr-1 h-3 w-3" />
            {(record.contentType || "Note").charAt(0).toUpperCase() +
              (record.contentType || "note").slice(1)}
          </Badge>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
      </div>
      <h3 className="font-semibold text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
        {record.aiGeneratedTitle}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
        {record.aiSummary}
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {new Date(record.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </div>
  );
};

export default RecordCard;
