import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Mail,
  Sparkles,
  ArrowRight,
  Plus,
  Link as LinkIcon,
  FileText,
  StickyNote,
  Loader2,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addRecord, uploadFile } from "@/lib/services";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const ADMIN_EMAIL = "jagadheshbellane@gmail.com";

interface Message {
  id: number;
  role: "assistant" | "user";
  text: string;
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "How do I add a record?",
    a: 'Use the **"Add Knowledge"** tab right here in the assistant! You can paste notes, URLs, or upload files like PDFs.',
  },
  {
    q: "How does AI search work?",
    a: "RecallAI uses **semantic vector search** to find related records. The AI then **synthesizes a comprehensive answer** from matching records.",
  },
  {
    q: "What is the API key for?",
    a: "RecallAI uses **Google Gemini AI** to organize your content. Add your free key in **Settings → AI Configuration**.",
  },
];

const UnifiedAssistant = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'add'>('chat');
  const [activeTab, setActiveTab] = useState<'text' | 'link' | 'file'>('text');
  const [addContent, setAddContent] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "👋 Hey! I'm your RecallAI Assistant. I can answer questions or help you add new knowledge to your vault. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mode]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const lower = text.toLowerCase();
    let answer = "";
    
    if (lower.includes("add") || lower.includes("file") || lower.includes("upload")) {
      answer = "Sure thing! I've switched to the **Add Knowledge** view for you. You can drop files or paste links there.";
      setTimeout(() => setMode('add'), 500);
    } else if (lower.includes("contact") || lower.includes("admin")) {
      answer = `You can reach the admin at **${ADMIN_EMAIL}**.`;
    } else {
      const match = FAQ.find(f => f.q.toLowerCase().includes(lower) || lower.includes(f.q.toLowerCase().split(" ")[0]));
      answer = match ? match.a : `I'm still learning! Try checking your settings or asking about: adding records, search, or API keys. You can also reach admin at ${ADMIN_EMAIL}.`;
    }

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: answer },
      ]);
    }, 400);
  };

  const handleQuickAdd = async () => {
    if (!addContent.trim() && activeTab !== 'file') {
      toast.error("Provide some content first");
      return;
    }

    setLoading(true);
    try {
      const type = activeTab === 'link' ? 'link' : 'note';
      await addRecord(addContent, type);
      toast.success("Knowledge added!");
      setAddContent('');
      queryClient.invalidateQueries({ queryKey: ["records"] });
      setMode('chat');
      setMessages(p => [...p, { id: Date.now(), role: "assistant", text: "✅ I've processed that link/note for you! It's now in your vault." }]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      await uploadFile(file);
      toast.success("File uploaded!");
      queryClient.invalidateQueries({ queryKey: ["records"] });
      setMode('chat');
      setMessages(p => [...p, { id: Date.now(), role: "assistant", text: `📎 I've analyzed **${file.name}** and extracted the key information for your vault.` }]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const renderText = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {/* Floating Entry Button (Replaces the old separate ones) */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 45 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-8 right-8 z-50 h-16 w-16 rounded-full gradient-bg text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          >
            <Bot className="h-8 w-8" />
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 border-2 border-background rounded-full animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-50 w-[420px] h-[650px] max-h-[90vh] rounded-[2.5rem] border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
                    <Bot className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 rounded-full border-2 border-card" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Recall Hub</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Active Assistant</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                className="p-2.5 rounded-2xl hover:bg-secondary text-muted-foreground transition-all hover:rotate-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-Nav Tabs */}
            <div className="flex p-1.5 gap-1.5 bg-secondary/30 mx-6 mt-6 rounded-[1.25rem] border border-border/50">
              <button
                onClick={() => setMode('chat')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  mode === 'chat' ? 'bg-card text-primary shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="h-4 w-4" /> Ask AI
              </button>
              <button
                onClick={() => setMode('add')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  mode === 'add' ? 'bg-card text-primary shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Plus className="h-4 w-4" /> Add Knowledge
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {mode === 'chat' ? (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full flex flex-col p-6"
                  >
                    <div className="flex-1 overflow-y-auto space-y-5 pb-4 scrollbar-hide">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[88%] rounded-3xl px-5 py-3.5 text-xs leading-relaxed shadow-sm ${
                            msg.role === "user" 
                              ? "bg-primary text-primary-foreground rounded-tr-none" 
                              : "bg-secondary/80 text-foreground rounded-tl-none border border-border/50 backdrop-blur-sm"
                          }`}>
                            {renderText(msg.text)}
                          </div>
                        </div>
                      ))}
                      <div ref={bottomRef} />
                    </div>
                    
                    <div className="relative mt-2">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                        placeholder="What have I saved about..."
                        className="w-full bg-secondary border border-border rounded-2xl pl-5 pr-14 py-4 text-xs focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-inner"
                      />
                      <button
                        onClick={() => handleSend(input)}
                        className="absolute right-2.5 top-2 p-2.5 rounded-xl gradient-bg text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="add"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full flex flex-col p-6 space-y-6"
                  >
                    <div className="flex gap-2 p-1 bg-secondary/50 rounded-2xl border border-border/30">
                      {(['text', 'link', 'file'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setActiveTab(t)}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                            activeTab === t ? 'bg-card text-primary shadow-sm border border-border/50' : 'text-muted-foreground'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0">
                      {activeTab === 'text' && (
                        <Textarea
                          placeholder="Paste a brilliant idea, a code snippet, or a quote you want to remember..."
                          className="w-full min-h-[250px] bg-secondary border-border rounded-[2rem] p-6 text-xs focus:ring-primary leading-relaxed resize-none"
                          value={addContent}
                          onChange={(e) => setAddContent(e.target.value)}
                        />
                      )}
                      
                      {activeTab === 'link' && (
                        <div className="space-y-6 pt-4">
                          <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">Universal Link Importer</Label>
                            <Input
                              placeholder="Paste a Reel, YouTube video, or Article..."
                              className="bg-secondary border-border h-14 rounded-2xl px-6 text-xs shadow-inner"
                              value={addContent}
                              onChange={(e) => setAddContent(e.target.value)}
                            />
                          </div>
                          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                            <p className="text-[10px] text-primary/80 leading-relaxed font-medium">
                              Our engine automatically extracts transcripts from YouTube and captions from Reels, bypassing login requirements.
                            </p>
                          </div>
                        </div>
                      )}

                      {activeTab === 'file' && (
                        <div 
                          className={`h-full min-h-[300px] border-2 border-dashed rounded-[3rem] p-12 flex flex-col items-center justify-center text-center transition-all relative group ${
                            loading ? 'opacity-50 pointer-events-none' : 'hover:bg-primary/5 hover:border-primary border-border bg-secondary/30'
                          }`}
                        >
                          <div className={`p-6 rounded-[2rem] bg-card shadow-xl text-primary mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 border border-border/50`}>
                            {loading ? <Loader2 className="h-10 w-10 animate-spin" /> : <Paperclip className="h-10 w-10" />}
                          </div>
                          <p className="text-sm font-black tracking-tight">{loading ? 'Synthesizing...' : 'Drop Intelligence Here'}</p>
                          <p className="text-[10px] text-muted-foreground mt-3 px-8 leading-relaxed font-medium capitalize">PDF, DOCX, TXT, or Visuals</p>
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                            disabled={loading}
                          />
                        </div>
                      )}
                    </div>

                    {activeTab !== 'file' && (
                      <Button 
                        onClick={handleQuickAdd} 
                        disabled={loading} 
                        className="w-full h-14 rounded-2xl gradient-bg text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-3" />}
                        Inject into Vault
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Support Bar */}
            <div className="px-8 py-5 border-t border-border bg-card/50 flex items-center justify-between">
              <a href={`mailto:${ADMIN_EMAIL}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-all flex items-center gap-2">
                <Mail className="h-4 w-4" /> Reach Support
              </a>
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 rounded-full bg-border" />
                <p className="text-[10px] font-black italic text-muted-foreground/50 tracking-tighter">RECALL.INTELLIGENCE</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UnifiedAssistant;
