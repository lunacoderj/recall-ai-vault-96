import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Shield, X, ExternalLink, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

const ApiKeyModal = ({ open, onClose }: ApiKeyModalProps) => {
  const { user, updateApiKey } = useAuth();
  const [keys, setKeys] = useState({
    gemini: "",
    openrouter: "",
    supadata: "",
    apify: ""
  });
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = async (provider: 'gemini' | 'openrouter' | 'supadata' | 'apify') => {
    const key = keys[provider].trim();
    if (!key) { toast.error(`Please enter a ${provider} API key`); return; }
    
    setSaving(provider);
    try {
      await updateApiKey(key, provider);
      toast.success(`${provider.toUpperCase()} key saved!`);
      // Clear input
      setKeys(prev => ({ ...prev, [provider]: "" }));
    } catch (err) {
      toast.error(`Failed to save ${provider} key`);
    } finally {
      setSaving(null);
    }
  };

  const guides = {
    gemini: {
      title: "Google Gemini",
      desc: "Powers core AI summarization and embeddings.",
      link: "https://aistudio.google.com/app/apikey",
      placeholder: "AIzaSy..."
    },
    openrouter: {
      title: "OpenRouter",
      desc: "Fallback AI provider for diverse models.",
      link: "https://openrouter.ai/keys",
      placeholder: "sk-or-v1-..."
    },
    supadata: {
      title: "Supadata.ai",
      desc: "Handles Instagram & YouTube transcripts.",
      link: "https://supadata.ai/dashboard",
      placeholder: "sd_..."
    },
    apify: {
      title: "Apify (Recommended)",
      desc: "The 'Nuclear Option' for Instagram. Guarantees bypass of login walls.",
      link: "https://apify.com/apify/instagram-scraper",
      placeholder: "apify_api_..."
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg gradient-bg p-2 flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Guided AI Setup</h2>
                  <p className="text-sm text-muted-foreground">Add your API keys to unlock full power</p>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <Tabs defaultValue="gemini" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-secondary/50 p-1">
                <TabsTrigger value="gemini" className="data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex items-center gap-1.5">
                  Gemini {user?.hasGeminiKey && <Check className="h-3 w-3" />}
                </TabsTrigger>
                <TabsTrigger value="openrouter" className="data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex items-center gap-1.5">
                  OpenRouter {user?.hasOpenRouterKey && <Check className="h-3 w-3" />}
                </TabsTrigger>
                <TabsTrigger value="supadata" className="data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex items-center gap-1.5 whitespace-nowrap">
                  Supadata {user?.hasSupadataKey && <Check className="h-3 w-3" />}
                </TabsTrigger>
                <TabsTrigger value="apify" className="data-[state=active]:gradient-bg data-[state=active]:text-primary-foreground flex items-center gap-1.5 whitespace-nowrap">
                  Apify {user?.hasApifyKey && <Check className="h-3 w-3" />}
                </TabsTrigger>
              </TabsList>

              {(Object.keys(guides) as Array<keyof typeof guides>).map((provider) => (
                <TabsContent key={provider} value={provider} className="space-y-5 animate-in slide-in-from-right-2 duration-300">
                  <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <Info className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">{guides[provider].title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {guides[provider].desc}
                        </p>
                        <a 
                          href={guides[provider].link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          Get your API key here <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-foreground font-semibold">Your API Key</Label>
                      {user?.[`has${provider.charAt(0).toUpperCase() + provider.slice(1)}Key` as keyof typeof user] && (
                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                          <Check className="h-2.5 w-2.5" /> SAVED
                        </span>
                      )}
                    </div>
                    <Input 
                      type="password"
                      placeholder={guides[provider].placeholder} 
                      value={keys[provider]} 
                      onChange={(e) => setKeys(prev => ({ ...prev, [provider]: e.target.value }))} 
                      className="h-11 bg-secondary/50 border-border focus:bg-background transition-all font-mono text-sm" 
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="ghost" className="flex-1 text-xs hover:bg-secondary" onClick={onClose}>
                      Later
                    </Button>
                    <Button 
                      className="flex-1 gradient-bg text-primary-foreground font-semibold shadow-lg shadow-primary/20"
                      onClick={() => handleSave(provider)}
                      disabled={saving === provider}
                    >
                      {saving === provider ? "Saving..." : "Save Key"}
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-8 flex items-start gap-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4">
              <Shield className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
                Your keys are encrypted using AES-256 before being stored in the database. 
                They are only used to process your personal data and are never shared.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ApiKeyModal;
