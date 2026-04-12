import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
      toast.success("Password reset email sent!");
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/user-not-found") {
        toast.error("No account found with this email");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many requests. Please wait and try again.");
      } else {
        toast.error("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: "var(--gradient-hero)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold gradient-text">RecallAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            We'll send you a link to reset your password
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="mx-auto w-fit p-3 rounded-full bg-green-500/10 mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Check your email
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a password reset link to{" "}
                <strong className="text-foreground">{email}</strong>. Check your
                inbox and follow the instructions.
              </p>
              <Button
                variant="outline"
                className="border-border"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Send another link
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-foreground">
                  Email address
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-secondary border-border"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 gradient-bg text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
