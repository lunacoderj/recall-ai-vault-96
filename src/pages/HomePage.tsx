import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Brain, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import RecordCard from "@/components/RecordCard";
import ApiKeyModal from "@/components/ApiKeyModal";
import { mockRecords } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";

const HomePage = () => {
  const [search, setSearch] = useState("");
  const [showApiModal, setShowApiModal] = useState(false);
  const { hasApiKey } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasApiKey()) setShowApiModal(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const records = mockRecords;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ApiKeyModal open={showApiModal} onClose={() => setShowApiModal(false)} />

      {/* Hero search */}
      <section className="relative py-16">
        <div className="absolute inset-0 opacity-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
              What do you want to <span className="gradient-text">recall</span>?
            </h2>
            <p className="text-muted-foreground mb-8">Search across all your saved knowledge</p>
            <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search your knowledge base... e.g. AI tools, internships"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-14 pl-12 pr-4 text-base bg-card border-border rounded-xl shadow-lg focus:border-primary"
                />
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Records */}
      <section className="container mx-auto px-6 pb-16">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Records</h3>
        {records.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <RecordCard record={r} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-secondary p-6 mb-4">
              <Inbox className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No records yet</h3>
            <p className="text-muted-foreground max-w-sm">Start saving videos, PDFs, links, and notes. RecallAI will summarize and organize them for you.</p>
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
