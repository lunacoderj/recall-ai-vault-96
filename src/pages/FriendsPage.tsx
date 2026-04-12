import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Check,
  X,
  MessageCircle,
  Share2,
  Inbox,
  Loader2,
  Send,
  Trash2,
  Plus as PlusIcon,
  FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import { SkeletonGrid } from "@/components/SkeletonLoaders";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  searchUsers,
  sendFriendRequest,
  getPendingRequests,
  respondToFriendRequest,
  getFriends,
  removeFriend,
  getSharedRecords,
  uploadChatFile,
  type FriendUser,
} from "@/lib/services";
import {
  sendMessage as sendChatMsg,
  getMessages,
  clearChat,
  syncFriendsLocally,
  type LocalMessage,
} from "@/lib/chatStore";
import { toast } from "sonner";
import { useChat } from "@/contexts/ChatProvider";
import { useUIStore } from "@/lib/uiStore";
import { markChatAsSeen } from "@/lib/chatStore";


type Tab = "friends" | "requests" | "search" | "shared";

const FriendsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("friends");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Media upload preview state
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string; type: 'image' | 'file' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [chatFriend, setChatFriend] = useState<FriendUser | null>(null);
  const [chatMsgs, setChatMsgs] = useState<LocalMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatUploading, setChatUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { lastSyncTrigger } = useChat();
  const { setActiveChatUserId } = useUIStore();

  const { data: friends, isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const data = await getFriends();
      await syncFriendsLocally(data);
      return data;
    },
    enabled: !!user,
  });

  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: getPendingRequests,
    enabled: !!user,
  });

  const { data: shared, isLoading: loadingShared } = useQuery({
    queryKey: ["shared-records"],
    queryFn: getSharedRecords,
    enabled: !!user,
  });

  // Track active chat for notification suppression
  useEffect(() => {
    setActiveChatUserId(chatFriend?._id || null);
    return () => setActiveChatUserId(null);
  }, [chatFriend, setActiveChatUserId]);

  // Load chat messages
  useEffect(() => {
    if (chatFriend && user) {
      getMessages(user._id, chatFriend._id).then(setChatMsgs);
    }
  }, [chatFriend, user, lastSyncTrigger]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Mark current chat as seen when new messages arrive or chat opens
    if (chatFriend && user && chatMsgs.length > 0) {
      markChatAsSeen(user._id, chatFriend._id);
    }
  }, [chatMsgs, chatFriend, user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQ.trim());
      setSearchResults(results);
    } catch { toast.error("Search failed"); }
    setSearching(false);
  };

  const handleSendRequest = async (userId: string) => {
    setSendingTo(userId);
    try {
      await sendFriendRequest(userId);
      toast.success("Friend request sent!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send request");
    }
    setSendingTo(null);
  };

  const handleRespond = async (requestId: string, action: "accepted" | "rejected") => {
    try {
      await respondToFriendRequest(requestId, action);
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast.success(action === "accepted" ? "Friend added!" : "Request declined");
    } catch { toast.error("Failed to respond"); }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm("Remove this friend?")) return;
    try {
      await removeFriend(friendId);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast.success("Friend removed");
    } catch { toast.error("Failed to remove friend"); }
  };

  const handleSendChat = async (textOverride?: string, type: LocalMessage['type'] = 'text', fileData?: { url: string; name: string }) => {
    const text = textOverride || chatInput.trim();
    if (!text && !fileData && !chatFriend) return;
    if (!chatFriend || !user) return;

    if (!chatFriend.publicKey) {
      toast.error(`${chatFriend.name} hasn't enabled E2EE yet. They need to login once with the latest version.`);
      return;
    }
    
    // 1. If we have a preview file but no fileData was passed (manual send button), upload first
    if (previewFile && !fileData) {
      setChatUploading(true);
      try {
        const result = await uploadChatFile(previewFile.file);
        const fileType = result.mimeType.startsWith('image/') ? 'image' : 'file';
        setPreviewFile(null); // Clear preview
        
        const msg = await sendChatMsg(user._id, chatFriend._id, text, chatFriend.publicKey, fileType, { url: result.url, name: result.fileName });
        setChatMsgs((prev) => [...prev, msg]);
        setChatInput("");
        return;
      } catch (err) {
        toast.error("Upload failed");
        setChatUploading(false);
        return;
      } finally {
        setChatUploading(false);
      }
    }

    // 2. Standard text message or pre-uploaded file
    const msg = await sendChatMsg(user._id, chatFriend._id, text, chatFriend.publicKey, type, fileData);
    setChatMsgs((prev) => [...prev, msg]);
    if (!textOverride) setChatInput("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const url = URL.createObjectURL(file);
    setPreviewFile({ file, url, type: isImage ? 'image' : 'file' });
  };

  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatFriend || !user) return;

    setChatUploading(true);
    try {
      const result = await uploadChatFile(file);
      const type = result.mimeType.startsWith('image/') ? 'image' : 'file';
      await handleSendChat(result.fileName, type, { url: result.url, name: result.fileName });
      toast.success("File sent!");
    } catch (err) {
      toast.error("Failed to upload file");
    } finally {
      setChatUploading(false);
    }
  };

  const handleClearChat = async () => {
    if (!chatFriend || !user) return;
    if (!confirm("Clear this chat history?")) return;
    await clearChat(user._id, chatFriend._id);
    setChatMsgs([]);
    toast.success("Chat cleared");
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "friends", label: "Friends", count: friends?.length },
    { key: "requests", label: "Requests", count: requests?.length },
    { key: "search", label: "Find People" },
    { key: "shared", label: "Shared", count: shared?.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-6">Friends</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? "gradient-bg text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 min-w-4 px-1 flex items-center justify-center border-current"
                >
                  {t.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {tab === "search" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search by name, email, or username..."
                  className="h-11 pl-11 bg-card border-border rounded-xl"
                />
              </div>
            </form>

            {searching ? (
              <SkeletonGrid count={3} type="friend" />
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card"
                  >
                    <Avatar className="h-10 w-10 border border-border">
                      {u.avatar ? <AvatarImage src={u.avatar} /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.username ? `@${u.username} · ` : ""}{u.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gradient-bg text-primary-foreground text-xs h-8"
                      disabled={sendingTo === u._id}
                      onClick={() => handleSendRequest(u._id)}
                    >
                      {sendingTo === u._id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <><UserPlus className="h-3 w-3 mr-1" /> Add</>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchQ ? (
              <p className="text-center text-sm text-muted-foreground py-10">No users found matching "{searchQ}"</p>
            ) : null}
          </motion.div>
        )}

        {tab === "requests" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loadingRequests ? (
              <SkeletonGrid count={3} type="friend" />
            ) : requests && requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card"
                  >
                    <Avatar className="h-10 w-10 border border-border">
                      {r.from.avatar ? <AvatarImage src={r.from.avatar} /> : null}
                      <AvatarFallback className="bg-amber-500/10 text-amber-400 text-sm font-bold">
                        {r.from.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{r.from.name}</p>
                      <p className="text-xs text-muted-foreground">{r.from.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 text-white text-xs h-8 hover:bg-green-700"
                        onClick={() => handleRespond(r._id, "accepted")}
                      >
                        <Check className="h-3 w-3 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 border-border"
                        onClick={() => handleRespond(r._id, "rejected")}
                      >
                        <X className="h-3 w-3 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No pending requests</p>
              </div>
            )}
          </motion.div>
        )}

        {tab === "friends" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loadingFriends ? (
              <SkeletonGrid count={4} type="friend" />
            ) : friends && friends.length > 0 ? (
              <div className="space-y-3">
                {friends.map((f) => (
                  <div
                    key={f._id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card group"
                  >
                    <Avatar className="h-10 w-10 border border-border">
                      {f.avatar ? <AvatarImage src={f.avatar} /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {f.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{f.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {f.username ? `@${f.username}` : f.email}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 border-border"
                        onClick={() => setChatFriend(f)}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" /> Chat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 border-destructive/30 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveFriend(f._id)}
                      >
                        <UserX className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <UserCheck className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No friends yet</p>
                <Button
                  size="sm"
                  onClick={() => setTab("search")}
                  className="gradient-bg text-primary-foreground"
                >
                  <Search className="h-3 w-3 mr-1.5" /> Find People
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {tab === "shared" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loadingShared ? (
              <SkeletonGrid count={3} type="friend" />
            ) : shared && shared.length > 0 ? (
              <div className="space-y-3">
                {shared.map((s) => (
                  <div
                    key={s._id}
                    className="p-4 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() =>
                      s.recordId?._id && navigate(`/record/${(s.recordId as any)._id}`)
                    }
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Share2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Shared by <strong className="text-foreground">{s.sharedBy?.name}</strong>
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {(s.recordId as any)?.aiGeneratedTitle || "Untitled Record"}
                    </p>
                    {s.message && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{s.message}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <Share2 className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No shared records yet</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {chatFriend && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-card border-l border-border z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Avatar className="h-8 w-8">
                {chatFriend.avatar ? <AvatarImage src={chatFriend.avatar} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {chatFriend.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{chatFriend.name}</p>
                <p className="text-[10px] text-muted-foreground">Syncing message to vault</p>
              </div>
              <button onClick={handleClearChat} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Clear chat">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setChatFriend(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatMsgs.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8">
                  No messages yet. Say hi to {chatFriend.name}! 👋<br />
                  <span className="text-[10px] opacity-60">Messages are stored locally on your device only.</span>
                </div>
              )}
              {chatMsgs.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed flex flex-col gap-2 relative ${
                      m.sender === "me"
                        ? "bg-primary text-primary-foreground rounded-br-sm shadow-md shadow-primary/20"
                        : "bg-secondary text-foreground rounded-bl-sm border border-border"
                    }`}
                  >
                    {m.type === 'image' && (
                      <div className="relative group/img overflow-hidden rounded-lg">
                        <img 
                          src={m.fileUrl} 
                          alt="sent" 
                          className="max-w-full h-auto cursor-pointer hover:scale-[1.02] transition-transform duration-300" 
                          onClick={() => window.open(m.fileUrl, '_blank')} 
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <Share2 className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}
                    {m.type === 'file' && (
                      <div 
                        className="flex items-center gap-3 p-3 rounded-lg bg-black/10 cursor-pointer hover:bg-black/20 transition-colors border border-white/10"
                        onClick={() => window.open(m.fileUrl, '_blank')}
                      >
                        <div className="p-2 rounded-lg bg-white/10">
                          <FileIcon className="h-5 w-5 text-current" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-[11px] mb-0.5">{m.fileName}</p>
                          <p className="text-[9px] opacity-60">Click to open document</p>
                        </div>
                      </div>
                    )}
                    {(m.type === 'text' || m.text) && (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    )}
                    <div className="flex items-center justify-end gap-1.5 self-end mt-1">
                      <span className={`text-[9px] opacity-60`}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {m.sender === 'me' && (
                        <div className="flex items-center">
                          {m.status === 'seen' ? (
                            <div className="flex -space-x-1.5 animate-in fade-in zoom-in duration-300">
                              <Check className="h-2.5 w-2.5 text-blue-400" />
                              <Check className="h-2.5 w-2.5 text-blue-400 ml-0.5" />
                            </div>
                          ) : m.status === 'sent' ? (
                            <Check className="h-2.5 w-2.5 text-white/50" />
                          ) : (
                             /* Delivered but not seen */
                             <div className="flex -space-x-1.5 opacity-50">
                              <Check className="h-2.5 w-2.5" />
                              <Check className="h-2.5 w-2.5 ml-0.5" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div ref={chatEndRef} />
            </div>

            <div className="flex flex-col border-t border-border bg-card/50 backdrop-blur-md">
              <AnimatePresence>
                {previewFile && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-4 bg-secondary/30 border-b border-border relative flex items-center gap-3"
                  >
                    {previewFile.type === 'image' ? (
                      <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-border/50 shadow-lg">
                        <img src={previewFile.url} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center border border-border">
                        <FileIcon className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">{previewFile.file.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{Math.round(previewFile.file.size / 1024)} KB · {previewFile.type}</p>
                    </div>
                    <button 
                      onClick={() => setPreviewFile(null)}
                      className="p-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 px-4 py-3">
                <div className="relative">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground transition-all duration-300 hover:scale-105 active:scale-95 glass-morphism border border-white/5 ${chatUploading ? 'opacity-50' : ''}`}
                    disabled={chatUploading}
                  >
                    {chatUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <PlusIcon className="h-4 w-4" />}
                  </button>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    onChange={handleFileSelect}
                    disabled={chatUploading}
                    accept="image/*, .pdf, .doc, .docx"
                  />
                </div>
                
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder={previewFile ? "Add a caption..." : "Write a secret message..."}
                  disabled={chatUploading}
                  className="flex-1 bg-secondary/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 h-10 transition-all"
                />
                
                <Button 
                  onClick={() => handleSendChat()} 
                  disabled={chatUploading || (!chatInput.trim() && !previewFile)}
                  className="p-2.5 rounded-xl gradient-bg text-white h-10 w-10 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FriendsPage;
