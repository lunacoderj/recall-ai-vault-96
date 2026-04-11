import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Search, Sparkles, Zap, ArrowRight, FileText, Video, Link, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Brain, title: "AI-Powered Summaries", desc: "Automatically generate concise summaries from any content you save." },
  { icon: Search, title: "Semantic Search", desc: "Find anything instantly with intelligent, context-aware search." },
  { icon: Sparkles, title: "Auto-Tagging", desc: "Content is automatically categorized and tagged for easy browsing." },
  { icon: Zap, title: "Instant Recall", desc: "Access key points and takeaways from your saved knowledge in seconds." },
];

const sourceTypes = [
  { icon: Video, label: "Videos", color: "from-red-500 to-pink-500" },
  { icon: FileText, label: "PDFs", color: "from-blue-500 to-cyan-500" },
  { icon: Link, label: "Links", color: "from-green-500 to-emerald-500" },
  { icon: StickyNote, label: "Notes", color: "from-yellow-500 to-orange-500" },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold gradient-text">RecallAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>Log In</Button>
            <Button className="gradient-bg text-primary-foreground" onClick={() => navigate("/signup")}>
              Get Started <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 gradient-bg" />
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" /> AI-Powered Knowledge Management
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              Your second brain,<br />
              <span className="gradient-text">powered by AI</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
              Save anything — videos, PDFs, links, notes. RecallAI summarizes, tags, and makes everything instantly searchable with AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gradient-bg text-primary-foreground px-8 h-12 text-base" onClick={() => navigate("/signup")}>
                Start for Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 text-base border-border" onClick={() => navigate("/login")}>
                Log In
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Source Types */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sourceTypes.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 glow-hover">
                <div className={`rounded-lg bg-gradient-to-br ${s.color} p-3`}>
                  <s.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-medium text-foreground">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Everything you need to <span className="gradient-text">remember everything</span></h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">Stop losing valuable knowledge. RecallAI organizes and resurfaces information when you need it most.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="rounded-xl border border-border bg-card p-6 glow-hover group">
                <div className="mb-4 inline-flex rounded-lg gradient-bg p-2.5">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2024 RecallAI. Your knowledge, amplified.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
