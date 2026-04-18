import { create } from "zustand";
import type { QAHistory } from "../services/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ book_id: number; title: string; relevance_score: number }>;
  cached?: boolean;
  timestamp: Date;
}

interface AppStore {
  // Search/filter
  searchQuery: string;
  selectedGenre: string;
  setSearchQuery: (q: string) => void;
  setSelectedGenre: (g: string) => void;

  // Chat
  chatMessages: ChatMessage[];
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearChat: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  searchQuery: "",
  selectedGenre: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedGenre: (selectedGenre) => set({ selectedGenre }),

  chatMessages: [],
  addMessage: (msg) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
      ],
    })),
  clearChat: () => set({ chatMessages: [] }),

  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
