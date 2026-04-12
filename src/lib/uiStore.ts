import { create } from 'zustand';

interface UIState {
  activeChatUserId: string | null;
  setActiveChatUserId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeChatUserId: null,
  setActiveChatUserId: (id) => set({ activeChatUserId: id }),
}));
