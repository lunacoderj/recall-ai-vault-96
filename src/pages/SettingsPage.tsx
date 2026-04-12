import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Key, Mail, LogOut, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user, logout, updateApiKey, hasApiKey } = useAuth();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) { toast.error("Please enter an API key"); return; }
    setLoading(true);
    try {
      await updateApiKey(apiKey.trim());
      toast.success("API key updated successfully");
      setApiKey("");
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <button onClick={() => navigate("/home")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <Badge variant={hasApiKey ? "outline" : "secondary"} className={hasApiKey ? "bg-green-500/10 text-green-400 border-green-500/20" : ""}>
               {hasApiKey ? "API Connected" : "API Missing"}
            </Badge>
          </div>

          {/* API Key */}
          <section className="rounded-xl border border-border bg-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">AI Configuration</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Gemini API Key</Label>
                <Input 
                  type="password"
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)} 
                  placeholder={hasApiKey ? "••••••••••••••••" : "Paste your Google AI Studio key here"} 
                  className="mt-2 h-11 bg-secondary border-border font-mono text-sm" 
                />
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-4">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-primary leading-relaxed">
                  Your API key is encrypted with AES-256 before being stored in our database. 
                  It is used only to process your personal documents and notes.
                </p>
              </div>
              <Button onClick={handleSaveApiKey} disabled={loading} className="gradient-bg text-primary-foreground min-w-[140px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {hasApiKey ? "Update Key" : "Save Key"}
              </Button>
            </div>
          </section>

          {/* Profile */}
          <section className="rounded-xl border border-border bg-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Account Information</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Display Name</Label>
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Email Address</Label>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Auth Provider</Label>
                <Badge variant="secondary" className="w-fit capitalize text-[10px]">{user?.authProvider || 'Email'}</Badge>
              </div>
            </div>
          </section>

          <Separator className="my-6 bg-border" />

          {/* Danger Zone */}
          <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 mb-6">
            <h2 className="text-lg font-semibold text-destructive mb-4">Account Controls</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="border-border hover:bg-destructive hover:text-white transition-all" onClick={async () => { await logout(); navigate("/"); }}>
                <LogOut className="mr-2 h-4 w-4" /> Log Out
              </Button>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
