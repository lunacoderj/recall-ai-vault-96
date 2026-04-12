import api from "./api";

// ─── Records ────────────────────────────────────────

export interface Record {
  _id: string;
  aiGeneratedTitle: string;
  aiSummary: string;
  keyPoints: string[];
  tags: string[];
  contentType: string;
  createdAt: string;
  rawText?: string;
  originalContent?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
}

export const getRecords = async (page = 1, limit = 20) => {
  const { data } = await api.get(`/records?page=${page}&limit=${limit}`);
  return data.data as { records: Record[]; pagination: Pagination };
};

export const getRecord = async (id: string) => {
  const { data } = await api.get(`/records/${id}`);
  return data.data.record as Record;
};

export const addRecord = async (content: string, type = 'note') => {
  const { data } = await api.post('/records/add', { rawContent: content, contentType: type });
  return data.data.record as Record;
};

export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/records/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.record as Record;
};

export const deleteRecord = async (id: string) => {
  const { data } = await api.delete(`/records/${id}`);
  return data.success;
};

// ─── Search ─────────────────────────────────────────

export interface SearchResult extends Record {
  relevanceScore?: number;
  relevanceSummary?: string;
  similarity?: number;
}

export interface CitedSource {
  sourceIndex: number;
  id: string;
  title: string;
  relevance: string;
}

export interface AIAnswer {
  answer: string;
  keyInsights: string[];
  suggestedActions: string[];
  citedSources: CitedSource[];
}

export interface SearchResponse {
  results: SearchResult[];
  searchMethod: 'vector' | 'keyword';
  totalResults: number;
  aiAnswer: AIAnswer | null;
}

export const searchRecords = async (query: string) => {
  const { data } = await api.post('/search', { query });
  return data.data as SearchResponse;
};

// ─── Profile ────────────────────────────────────────

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  bio?: string;
  authProvider?: string;
  hasApiKey?: boolean;
  friends?: string[];
}

export const getProfile = async () => {
  const { data } = await api.get('/user/profile');
  return data.data as UserProfile;
};

export const updateProfile = async (updates: { name?: string; bio?: string; username?: string; avatar?: string }) => {
  const { data } = await api.put('/user/profile', updates);
  return data.data.user as UserProfile;
};

// ─── Friends ────────────────────────────────────────

export interface FriendUser {
  _id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

export interface FriendRequest {
  _id: string;
  from: FriendUser;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface SharedRecord {
  _id: string;
  recordId: Record;
  sharedBy: FriendUser;
  message: string;
  createdAt: string;
}

export const searchUsers = async (query: string) => {
  const { data } = await api.get(`/friends/search?q=${encodeURIComponent(query)}`);
  return data.data as FriendUser[];
};

export const sendFriendRequest = async (userId: string) => {
  const { data } = await api.post('/friends/request', { userId });
  return data;
};

export const getPendingRequests = async () => {
  const { data } = await api.get('/friends/requests');
  return data.data as FriendRequest[];
};

export const respondToFriendRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
  const { data } = await api.put('/friends/respond', { requestId, action });
  return data;
};

export const getFriends = async () => {
  const { data } = await api.get('/friends');
  return data.data as FriendUser[];
};

export const removeFriend = async (friendId: string) => {
  const { data } = await api.delete(`/friends/${friendId}`);
  return data;
};

export const shareRecordWithFriend = async (recordId: string, friendId: string, message = '') => {
  const { data } = await api.post('/friends/share', { recordId, friendId, message });
  return data;
};

export const getSharedRecords = async () => {
  const { data } = await api.get('/friends/shared');
  return data.data as SharedRecord[];
};

// ─── Messages & Chat ────────────────────────────────

export interface ChatMessage {
  _id?: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'link';
  fileUrl?: string;
  fileName?: string;
  isRead: boolean;
  localId: string;
  createdAt: string;
}

export const syncMessages = async (lastSyncTime?: string) => {
  const { data } = await api.get(`/messages/new${lastSyncTime ? `?lastSyncTime=${lastSyncTime}` : ''}`);
  return data.data.messages as ChatMessage[];
};

export const sendBackendMessage = async (msg: Partial<ChatMessage>) => {
  const { data } = await api.post('/messages/send', msg);
  return data.data.message as ChatMessage;
};

export const acknowledgeMessages = async (messageIds: string[]) => {
  const { data } = await api.post('/messages/ack', { messageIds });
  return data.success;
};


export const uploadChatFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/messages/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data as { url: string; fileName: string; fileSize: number; mimeType: string };
};
