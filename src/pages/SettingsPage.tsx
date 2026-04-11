import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Key, Mail, Lock, Trash2, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user, logout, getApiKey, updateApiKey } = useAuth();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState(getApiKey() || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) { toast.error("Please enter an API key"); return; }
    updateApiKey(apiKey.trim());
    toast.success("API key updated");
  };

  const handleUpdateEmail = () => {
    toast.success("Email updated (demo)");
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword) { toast.error("Fill in both fields"); return; }
    toast.success("Password updated (demo)");
    setCurrentPassword("");
    setNewPassword("");
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure? This action is irreversible.")) {
      logout();
      navigate("/");
      toast.success("Account deleted (demo)");
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
          <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

          {/* API Key */}
          <section className="rounded-xl border border-border bg-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">API Key</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-foreground">Gemini or OpenAI API Key</Label>
                <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-... or AIza..." className="mt-1.5 h-11 bg-secondary border-border font-mono text-sm" />
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-primary">Your API key is stored securely and used only for your requests.</p>
              </div>
              <Button onClick={handleSaveApiKey} className="gradient-bg text-primary-foreground">Save API Key</Button>
            </div>
          </section>

          {/* Email */}
          <section className="rounded-xl border border-border bg-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Email</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-foreground">Email Address</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 bg-secondary border-border" />
              </div>
              <Button onClick={handleUpdateEmail} variant="outline" className="border-border">Update Email</Button>
            </div>
          </section>

          {/* Password */}
          <section className="rounded-xl border border-border bg-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Password</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-foreground">Current Password</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1.5 h-11 bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-foreground">New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1.5 h-11 bg-secondary border-border" />
              </div>
              <Button onClick={handleUpdatePassword} variant="outline" className="border-border">Update Password</Button>
            </div>
          </section>

          <Separator className="my-6 bg-border" />

          {/* Danger Zone */}
          <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 mb-6">
            <h2 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleDeleteAccount}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </Button>
              <Button variant="outline" className="border-border" onClick={() => { logout(); navigate("/"); }}>
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
