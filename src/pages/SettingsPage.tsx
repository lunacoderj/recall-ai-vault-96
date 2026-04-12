import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Key, 
  Mail, 
  LogOut, 
  Shield, 
  Loader2, 
  Instagram, 
  ExternalLink, 
  ShieldCheck,
  Zap,
  Youtube,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNotificationStore } from "@/lib/notificationStore";
import { showFuturisticToast } from "@/components/notifications/NotificationToast";

const IntegrationCard = ({ 
  icon: Icon, 
  title, 
  description, 
  steps, 
  provider, 
  link, 
  hasKey 
}: { 
  icon: any, 
  title: string, 
  description: string, 
  steps: string[], 
  provider: 'gemini' | 'openrouter' | 'supadata' | 'rapidapi', 
  link: string,
  hasKey: boolean
}) => {
  const { updateApiKey } = useAuth();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!key.trim()) { toast.error(`Please enter a valid ${title} key`); return; }
    setLoading(true);
    try {
      await updateApiKey(key.trim(), provider);
      toast.success(`${title} key updated and synced!`);
      setKey("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to update ${title} key`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/50 backdrop-blur-xl p-6 mb-6 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant={hasKey ? "outline" : "secondary"} className={hasKey ? "bg-green-500/10 text-green-400 border-green-500/20" : ""}>
          {hasKey ? "Connected" : "Not Linked"}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
          {steps.map((step, i) => (
            <p key={i} className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
              {step}
            </p>
          ))}
          <a href={link} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1 font-medium">
             Get Your API Key Here <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="flex gap-2">
          <Input 
            type="password"
            value={key} 
            onChange={(e) => setKey(e.target.value)} 
            placeholder={hasKey ? "••••••••••••••••" : `Paste ${title} Key`} 
            className="h-10 bg-secondary border-border font-mono text-xs" 
          />
          <Button onClick={handleSave} disabled={loading} className="h-10 px-4 gradient-bg text-primary-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();

  const handleTestNotification = async () => {
    // 1. Trigger the visual toast
    showFuturisticToast({
      type: 'system',
      title: 'Lab Test Successful',
      body: 'Your notification system is fully operational and synced with the vault.',
      onAction: () => toast.info("Action acknowledged!"),
    });

    // 2. Add to the persistent notification drawer
    await addNotification({
      type: 'system',
      title: 'Debug Alert',
      body: 'This is a test notification generated from the Integration Hub.',
    });

    toast.success("Test sequence initiated!");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <button onClick={() => navigate("/home")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col mb-8 gap-2">
            <h1 className="text-3xl font-bold text-foreground">Integration Hub</h1>
            <p className="text-muted-foreground text-sm">Configure your personal API keys to power background automation and content archiving.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Providers */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Cpu className="h-3 w-3" /> Intelligence
              </h3>
              
              <IntegrationCard 
                title="Google Gemini"
                description="Primary AI engine for metadata and summaries."
                icon={Zap}
                provider="gemini"
                link="https://aistudio.google.com/app/apikey"
                hasKey={!!user?.hasGeminiKey}
                steps={[
                  "Go to Google AI Studio.",
                  "Login with your Google Account.",
                  "Create and copy your Gemini API Key."
                ]}
              />

              <IntegrationCard 
                title="OpenRouter"
                description="Optional: Access Llama 3, Claude, and GPT-4."
                icon={Cpu}
                provider="openrouter"
                link="https://openrouter.ai/keys"
                hasKey={!!user?.hasOpenRouterKey}
                steps={[
                  "Visit OpenRouter.ai.",
                  "Login or register an account.",
                  "Create a new key and copy the code."
                ]}
              />
            </div>

            {/* Scrapers */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Zap className="h-3 w-3" /> Data Extraction
              </h3>

              <IntegrationCard 
                title="RapidAPI (Instagram)"
                description="Bypass login walls for IG Reels and Posts."
                icon={Instagram}
                provider="rapidapi"
                link="https://rapidapi.com/3205/api/instagram120/pricing"
                hasKey={!!user?.hasRapidApiKey}
                steps={[
                  "Go to 'Instagram 120' on RapidAPI.",
                  "Subscribe to the Free ($0) tier.",
                  "Copy 'x-rapidapi-key' from Hub."
                ]}
              />

              <IntegrationCard 
                title="Supadata"
                description="Fast transcripts for Youtube and static sites."
                icon={Youtube}
                provider="supadata"
                link="https://supadata.ai/dashboard"
                hasKey={!!user?.hasSupadataKey}
                steps={[
                  "Head to Supadata.ai.",
                  "Login to see your dashboard.",
                  "Copy API Key from the top navbar."
                ]}
              />
            </div>
          </div>

          <Separator className="my-8 bg-border" />

          {/* Laboratory Testing */}
          <section className="mb-8 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center justify-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Debug & Laboratory
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Verify that background alerts, vault notifications, and E2EE signals are reaching your client correctly.
            </p>
            <Button 
              variant="outline" 
              onClick={handleTestNotification}
              className="border-primary/50 text-primary hover:bg-primary hover:text-white transition-all"
            >
              Fire Test Notification
            </Button>
          </section>

          <Separator className="my-8 bg-border" />

          {/* Account and Security */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Vault Identity</h2>
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
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Security Info</h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Keys are encrypted with AES-256 before disk storage. Decryption only occurs in-memory during scraping tasks. 
                </p>
              </div>
              <Button variant="outline" className="w-full border-border hover:bg-destructive hover:text-white transition-all group" onClick={async () => { await logout(); navigate("/"); }}>
                <LogOut className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform" /> Sign Out from Vault
              </Button>
            </section>
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
