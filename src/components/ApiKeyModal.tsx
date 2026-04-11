import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

const ApiKeyModal = ({ open, onClose }: ApiKeyModalProps) => {
  const [apiKey, setApiKey] = useState("");
  const { updateApiKey } = useAuth();

  const handleSave = () => {
    if (!apiKey.trim()) { toast.error("Please enter an API key"); return; }
    updateApiKey(apiKey.trim());
    toast.success("API key saved successfully!");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg gradient-bg p-2">
                  <Key className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Set up your AI</h2>
                  <p className="text-sm text-muted-foreground">Add your API key to enable AI features</p>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Gemini or OpenAI API Key</Label>
                <Input placeholder="sk-... or AIza..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="mt-1.5 h-11 bg-secondary border-border font-mono text-sm" />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-primary">Your API key is stored securely and used only for your requests. It never leaves your browser.</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-border" onClick={onClose}>Skip for now</Button>
                <Button className="flex-1 gradient-bg text-primary-foreground" onClick={handleSave}>Save Key</Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ApiKeyModal;
