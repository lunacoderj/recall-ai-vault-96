import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Share2, CheckCircle2, AlertCircle } from "lucide-react";
import { addRecord } from "@/lib/services";
import { toast } from "sonner";

const ShareReceiver = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"parsing" | "saving" | "success" | "error">("parsing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const title = searchParams.get("title") || "";
    const text = searchParams.get("text") || "";
    const url = searchParams.get("url") || "";

    // Combine all shared text to find the link
    const sharedBlob = `${title} ${text} ${url}`.trim();
    
    // Robust URL extraction regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = sharedBlob.match(urlRegex);
    let extractedUrl = matches ? matches[0] : null;

    // Clean up trailing punctuation often included by sharing apps (Android/iOS)
    if (extractedUrl) {
      extractedUrl = extractedUrl.replace(/[.,!?;:)]+$/, "");
    }

    if (!extractedUrl) {
      console.error("No valid URL found in share intent:", sharedBlob);
      setStatus("error");
      setErrorMsg("We couldn't find a valid link in what you shared.");
      return;
    }

    const processShare = async () => {
      setStatus("saving");
      try {
        // Trigger existing backend logic (handles IG/YT/Generic)
        await addRecord(extractedUrl, "link");
        setStatus("success");
        toast.success("Content captured to your Vault!");
        
        // Short delay to show success state
        setTimeout(() => navigate("/home"), 1500);
      } catch (err: any) {
        console.error("Share capture failed:", err);
        setStatus("error");
        setErrorMsg(err.response?.data?.message || err.message || "Failed to process shared link.");
      }
    };

    processShare();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1, y: -10 }}
          className="relative max-w-sm w-full"
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full -z-10" />

          {/* Glass Card */}
          <div className="bg-card/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            
            <div className="flex flex-col items-center gap-6">
              {/* Icon Container */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center border border-white/10">
                  {status === "parsing" || status === "saving" ? (
                    <div className="relative">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-yellow-500 animate-pulse" />
                    </div>
                  ) : status === "success" ? (
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  ) : (
                    <AlertCircle className="h-10 w-10 text-destructive" />
                  )}
                </div>
                {status === "saving" && (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg"
                  >
                    <Share2 className="w-3 h-3" />
                  </motion.div>
                )}
              </div>

              {/* Text */}
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">
                  {status === "parsing" && "Intercepting Share..."}
                  {status === "saving" && "Analyzing Content..."}
                  {status === "success" && "Captured!"}
                  {status === "error" && "Share Failed"}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {status === "parsing" && "Extracting the link from your share interaction."}
                  {status === "saving" && "Running AI analysis and archiving for your Vault."}
                  {status === "success" && "Taking you back to your knowledge base."}
                  {status === "error" && errorMsg}
                </p>
              </div>

              {status === "error" && (
                <button 
                  onClick={() => navigate("/home")}
                  className="mt-4 px-6 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium rounded-xl transition-all"
                >
                  Return to Home
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ShareReceiver;
