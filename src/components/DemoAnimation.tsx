import { motion, AnimatePresence } from "framer-motion";
import { Link2, FileText, CheckCircle2, Search, Brain } from "lucide-react";
import { useState, useEffect } from "react";

const DemoAnimation = () => {
  const [stage, setStage] = useState(0); // 0: input, 1: processing, 2: record

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-lg aspect-video bg-card/30 backdrop-blur-md rounded-2xl border border-border/50 shadow-2xl overflow-hidden flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
      
      <AnimatePresence mode="wait">
        {stage === 0 && (
          <motion.div 
            key="input"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -10 }}
            className="w-full space-y-4"
          >
            <div className="flex items-center gap-3 bg-card border border-border p-4 rounded-xl shadow-lg">
              <Link2 className="text-primary h-6 w-6" />
              <div className="h-2 w-48 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground font-mono">Pasting Instagram Reel URL...</span>
            </div>
          </motion.div>
        )}

        {stage === 1 && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Brain className="h-16 w-16 text-primary relative animate-bounce" />
            </div>
            <div className="space-y-2 text-center">
              <h4 className="text-sm font-semibold">AI is Extracting Transcript</h4>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, delay: i * 0.2 }}
                    className="h-1.5 w-1.5 bg-primary rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {stage === 2 && (
          <motion.div 
            key="record"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-card border border-border rounded-xl p-5 shadow-2xl relative"
          >
            <div className="absolute -top-3 -right-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 fill-card" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-foreground/10 rounded" />
                <div className="h-2 w-1/2 bg-foreground/5 rounded" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-6 bg-secondary/50 rounded-full" />
                <div className="h-6 bg-secondary/50 rounded-full" />
                <div className="h-6 bg-secondary/50 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 w-full bg-muted/30 rounded" />
                <div className="h-1.5 w-full bg-muted/30 rounded" />
                <div className="h-1.5 w-4/5 bg-muted/30 rounded" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DemoAnimation;
