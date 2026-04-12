import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Save,
  Loader2,
  User,
  AtSign,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import { ProfileSkeleton } from "@/components/SkeletonLoaders";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile as updateProfileApi, uploadChatFile } from "@/lib/services";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername((user as any)?.username || "");
      setBio((user as any)?.bio || "");
      setAvatarUrl(user.avatar || "");
      setLoaded(true);
    }
  }, [user]);

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadChatFile(file);
      setAvatarUrl(result.url);
      toast.success("Avatar uploaded! Don't forget to save changes.");
    } catch (err) {
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfileApi({
        name: name.trim(),
        username: username.trim() || undefined,
        bio: bio.trim(),
        avatar: avatarUrl.trim() || undefined,
      });

      // Update local storage
      const stored = localStorage.getItem("recallai_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem(
          "recallai_user",
          JSON.stringify({ ...parsed, ...updated })
        );
      }

      toast.success("Profile updated!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to update profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 py-8 max-w-2xl">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground mb-8">
            Edit Profile
          </h1>

          {/* Avatar section */}
          <div className="flex items-center gap-5 mb-8">
            <div 
              className={`relative group h-20 w-20 rounded-full border-2 transition-all ${uploading ? 'opacity-50' : 'hover:border-primary border-primary/20 cursor-pointer'}`}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-primary');
                const file = e.dataTransfer.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            >
              <Avatar className="h-full w-full">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
              </div>
              <Input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
                accept="image/*"
                disabled={uploading}
              />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Avatar URL (or upload above)
              </Label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="h-9 text-sm bg-secondary border-border"
              />
            </div>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              {/* Name */}
              <div>
                <Label className="text-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Display Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="mt-2 h-11 bg-secondary border-border"
                  maxLength={100}
                />
              </div>

              {/* Username */}
              <div>
                <Label className="text-foreground flex items-center gap-1.5">
                  <AtSign className="h-3.5 w-3.5 text-primary" />
                  Username
                </Label>
                <Input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  placeholder="your_username"
                  className="mt-2 h-11 bg-secondary border-border font-mono text-sm"
                  maxLength={30}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Lowercase letters, numbers, and underscores only. Friends can
                  find you by this.
                </p>
              </div>

              {/* Bio */}
              <div>
                <Label className="text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Bio
                </Label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={300}
                  rows={3}
                  className="mt-2 w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {bio.length}/300
                </p>
              </div>

              {/* Email (read-only) */}
              <div>
                <Label className="text-muted-foreground text-xs">
                  Email (managed by Firebase)
                </Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="mt-2 h-11 bg-secondary/50 border-border text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gradient-bg text-primary-foreground w-full h-11"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
