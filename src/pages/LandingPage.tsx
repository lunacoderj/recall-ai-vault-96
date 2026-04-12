import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Brain, Search, Sparkles, Zap, ArrowRight, FileText, 
  Video, Link2, ShieldCheck, Cpu, ChevronRight, 
  MessageSquare, Layers, MousePointer2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DemoAnimation from "@/components/DemoAnimation";
import { useState } from "react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [apiType, setApiType] = useState<"standard" | "own">("own");

  const bentoItems = [
    { 
      title: "Social Extraction", 
      desc: "Instantly turn Reels, YouTube shorts, and threads into searchable text.",
      icon: Video,
      image: "/hero/social.png",
      color: "text-red-500",
      bg: "bg-red-500/10",
      className: "md:col-span-2"
    },
    { 
      title: "Document Analysis", 
      desc: "Upload PDFs and Docs. Get insights automatically.",
      icon: FileText,
      image: "/hero/docs.png",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      className: "md:col-span-1"
    },
    { 
      title: "Intelligent Search", 
      desc: "Search context, not just keywords. Find anything in seconds.",
      icon: Search,
      image: "/hero/search.png",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      className: "md:col-span-1"
    },
    { 
      title: "Privacy First", 
      desc: "Your data stays yours. Plug in your own API for absolute ownership.",
      icon: ShieldCheck,
      image: "/hero/privacy.png",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      className: "md:col-span-2"
    }
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 selection:text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-1 border border-primary/20">
              <img src="/logo.png" alt="RecallAI Logo" className="h-7 w-7 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">RecallAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground mr-12">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-sm font-medium" onClick={() => navigate("/login")}>Log In</Button>
            <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-6" onClick={() => navigate("/signup")}>
              Start Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 bg-[radial-gradient(circle_at_center,var(--primary-muted),transparent_70%)] opacity-30 blur-3xl" />
          
          <div className="container mx-auto text-center max-w-4xl relative">
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" /> 
                Next-gen Personal Knowledge Management
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
                Your Personal <br />
                <span className="text-primary italic font-serif">AI Library.</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
                Extract meaning from <span className="text-foreground font-medium underline decoration-red-500/50">Reels</span>, 
                <span className="text-foreground font-medium underline decoration-blue-500/50 mx-1">YouTube</span>, 
                and <span className="text-foreground font-medium underline decoration-emerald-500/50">PDFs</span> instantly. 
                Keep your knowledge alive with Bring-Your-Own-API privacy.
              </p>

              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-10 h-14 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => navigate("/signup")}>
                    Start Free
                  </Button>
                  
                  <div className="flex items-center p-1 bg-secondary rounded-full border border-border">
                    <button 
                      onClick={() => setApiType("standard")}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${apiType === "standard" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Cloud AI
                    </button>
                    <button 
                      onClick={() => setApiType("own")}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${apiType === "own" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Use Your Key
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground animate-pulse">
                  {apiType === "own" ? "✓ Users with their own keys get unlimited extraction & enhanced privacy." : "✓ Managed infrastructure with privacy-preserving filters."}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Demo Section */}
        <section className="py-20 px-6 bg-gradient-to-b from-transparent via-secondary/20 to-transparent">
          <div className="container mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Capture everything, <br />
                <span className="text-muted-foreground">recall anything.</span>
              </h2>
              <div className="space-y-6">
                {[
                  { icon: MousePointer2, title: "One-Click Capture", desc: "Paste any link to instantly summarize and tag." },
                  { icon: MessageSquare, title: "Natural Language Retrieval", desc: "Search your brain like you search Google." },
                  { icon: Layers, title: "Automatic Indexing", desc: "Your records are contextually linked across themes." }
                ].map((item, i) => (
                  <motion.div 
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-4 items-start"
                  >
                    <div className="bg-primary/20 p-2.5 rounded-lg border border-primary/20">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="flex justify-center flex-col items-center gap-4">
              <DemoAnimation />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-mono text-emerald-500 uppercase tracking-widest">
                Real-time extraction preview
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="py-24 px-6 container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Built for the Modern Learner</h2>
            <p className="text-muted-foreground">A unified workspace for all your digital knowledge components.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 auto-rows-[300px]">
            {bentoItems.map((item, i) => (
              <motion.div 
                key={item.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group relative rounded-3xl border border-border/50 bg-card p-8 flex flex-col justify-between overflow-hidden hover:border-primary/50 transition-all ${item.className}`}
              >
                <div className="absolute top-0 right-0 p-8 text-muted-foreground group-hover:text-primary transition-colors z-20">
                  <item.icon className="h-6 w-6" />
                </div>
                
                {/* Image Background */}
                <div className="absolute inset-x-0 top-0 h-2/3 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card z-10" />
                  <motion.img 
                    src={item.image} 
                    alt={item.title}
                    whileHover={{ scale: 1.1 }}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700"
                  />
                </div>

                <div className="relative z-20">
                  <div className={`p-3 rounded-2xl w-fit ${item.bg} mb-4`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Bring Your Own API (BYOK) Trust Section */}
        <section className="py-24 px-6 relative">
          <div className="container mx-auto max-w-5xl">
            <div className="bg-gradient-to-br from-card to-card/50 border border-border rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_top_right,var(--primary-muted),transparent_40%)] opacity-20" />
              <div className="bg-primary/10 p-4 rounded-3xl border border-primary/20 mb-8">
                <ShieldCheck className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Your data, <span className="text-primary italic">your infrastructure.</span></h2>
              <p className="text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
                RecallAI is built on the philosophy of **User-Managed Intelligence**. 
                Plugging in your own Gemini or OpenAI keys ensures that your sensitive information 
                never touches a middleman. It stays secure, private, and works with the same incredible accuracy.
              </p>
              <div className="flex flex-wrap justify-center gap-12">
                {[
                  { label: "End-to-End Privacy", meta: "Direct LLM interaction" },
                  { label: "Zero Log Storage", meta: "No external training" },
                  { label: "High Performance", meta: "Dedicated user tier" }
                ].map((t) => (
                  <div key={t.label} className="text-center">
                    <p className="text-foreground font-bold">{t.label}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.meta}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 🚀 HIGH ENERGY: FREE API KEYS SECTION */}
        <section className="py-24 px-6">
          <div className="container mx-auto max-w-5xl">
            <div className="relative rounded-[3rem] bg-foreground text-background p-10 md:p-20 overflow-hidden group">
              {/* Dynamic Background Elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] -z-10 group-hover:bg-primary/40 transition-colors" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/20 blur-[100px] -z-10" />

              <div className="flex flex-col items-center text-center space-y-8 relative">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/10 border border-background/20 text-xs font-black uppercase tracking-[0.2em]">
                  <Zap className="h-4 w-4 text-yellow-400 fill-yellow-400" /> 100% Free Setup
                </div>
                
                <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter">
                  Stop Paying For <br /> AI Subscriptions.
                </h2>
                
                <p className="text-lg md:text-xl text-background/70 max-w-2xl font-medium leading-relaxed">
                  RecallAI gives you <span className="text-background underline decoration-primary decoration-4">Pro-Level features</span> for $0/mo. 
                  All you need is your own API keys. They're 100% free to get, take 60 seconds to set up, 
                  and unlock unlimited potential.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full pt-8">
                  {[
                    { name: "Gemini AI", desc: "Intelligence & Summaries", link: "Free at Google AI Studio" },
                    { name: "Instagram Engine", desc: "RapidAPI Free Tier", link: "1-Click Subscription" },
                    { name: "YouTube Cloud", desc: "Supadata Free Access", link: "Instant Key Retrieval" },
                    { name: "OpenRouter", desc: "Optional GPT/Claude", link: "Developer Sandbox" }
                  ].map((item, i) => (
                    <motion.div 
                      key={item.name}
                      whileHover={{ y: -5 }}
                      className="p-6 rounded-2xl bg-background/5 border border-background/10 text-left space-y-2"
                    >
                      <h4 className="font-black text-primary uppercase text-xs tracking-wider">{item.name}</h4>
                      <p className="text-sm font-bold text-background leading-tight">{item.desc}</p>
                      <p className="text-[10px] text-background/40">{item.link}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col gap-4 items-center pt-8">
                  <Button 
                    size="lg" 
                    className="rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform px-12 h-16 text-xl font-black shadow-2xl"
                    onClick={() => navigate("/signup")}
                  >
                    I'M READY — LET'S GO! <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                  <p className="text-xs text-background/50 font-mono">No Credit Card Required. Just pure, unadulterated intelligence.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-24 px-6 bg-secondary/30">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Master Your Knowledge in 3 Steps</h2>
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Simplifying the Capture-to-Concept workflow</p>
            </div>
            <div className="grid md:grid-cols-3 gap-12 relative">
              {[
                { step: "01", title: "Paste & Save", desc: "Paste a URL or upload a file. We handle the heavy lifting of extraction." },
                { step: "02", title: "AI Distillation", desc: "Our AI extracts the core essence, creating summaries and key takeaways." },
                { step: "03", title: "Instant Recall", desc: "Search your library using natural language like you're talking to a friend." }
              ].map((item, i) => (
                <div key={item.step} className="relative z-10 space-y-4">
                  <span className="text-6xl font-black text-foreground/5">{item.step}</span>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {item.title} <ChevronRight className="h-4 w-4 text-primary" />
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
              <div className="absolute top-1/2 left-0 w-full h-px bg-border/50 -z-10 hidden md:block" />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6 text-center">
          <motion.div whileInView={{ scale: [0.95, 1], opacity: [0, 1] }} className="max-w-3xl mx-auto space-y-10">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Ready to build your <br /> <span className="gradient-text">Second Brain?</span></h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-12 h-16 text-xl font-bold shadow-2xl shadow-primary/30" onClick={() => navigate("/signup")}>
                Start Now — For Free
              </Button>
            </div>
            <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm">
              <Cpu className="h-4 w-4" /> Powered by the world's most advanced LLMs
            </p>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="container mx-auto flex flex-col md:row items-center justify-between gap-6">
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-50">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">RecallAI</span>
          </div>
          <p className="text-sm text-muted-foreground pb-8">© 2026 RecallAI Vault. Designed for thinkers, builders, and learners.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
