import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Send, Bot, User, BookOpen, Zap, Trash2, Clock, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { booksApi } from "../services/api";
import { useAppStore } from "../store/appStore";
import Header from "../components/Header";

const EXAMPLE_QUESTIONS = [
  "What books do you have about mystery or detective fiction?",
  "Can you recommend a good thriller with high ratings?",
  "Which books have the best reviews?",
  "Tell me about books in the fantasy genre.",
  "What's the most affordable book available?",
];

function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-ink-300 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function AskPage() {
  const { chatMessages, addMessage, clearChat } = useAppStore();
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const { data: history = [] } = useQuery({
    queryKey: ["qa-history"],
    queryFn: () => booksApi.qaHistory(15),
    enabled: showHistory,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loading]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;

    setInput("");
    addMessage({ role: "user", content: q });
    setLoading(true);

    try {
      const res = await booksApi.ask({ question: q, top_k: 5 });
      addMessage({
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        cached: res.cached,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Something went wrong. Please try again.";
      toast.error(msg);
      addMessage({ role: "assistant", content: `Error: ${msg}` });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Ask AI" subtitle="RAG-powered book Q&A with source citations" />

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

        {/* ── Left: Chat ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Welcome */}
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-up">
                <div className="w-16 h-16 rounded-2xl bg-accent-500/10 flex items-center justify-center">
                  <Bot size={28} className="text-accent-500" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink-800">Ask anything about books</h2>
                  <p className="text-sm text-ink-400 font-body mt-2 max-w-md">
                    I use RAG (Retrieval-Augmented Generation) to search your book collection and provide
                    grounded answers with citations.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      className="text-left text-sm bg-white border border-ink-100 rounded-xl px-4 py-3
                                 text-ink-600 font-body hover:border-accent-400 hover:text-ink-800
                                 transition-all duration-200 hover:shadow-card"
                      onClick={() => send(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 animate-fade-up ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${msg.role === "user" ? "bg-accent-500" : "bg-ink-800"}`}>
                  {msg.role === "user"
                    ? <User size={14} className="text-parchment-50" />
                    : <Bot  size={14} className="text-parchment-50" />}
                </div>

                <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={msg.role === "user" ? "chat-user" : "chat-assistant"}>
                    {msg.role === "assistant" ? (
                      <ReactMarkdown className="prose prose-sm max-w-none text-ink-800">
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.sources.map((s) => (
                        <span
                          key={s.book_id}
                          className="inline-flex items-center gap-1 text-[10px] font-body
                                     bg-parchment-100 border border-ink-100 text-ink-500
                                     px-2 py-0.5 rounded-full"
                        >
                          <BookOpen size={9} />
                          {s.title.length > 30 ? s.title.slice(0, 30) + "…" : s.title}
                          <span className="text-teal-600 font-mono">
                            {Math.round(s.relevance_score * 100)}%
                          </span>
                        </span>
                      ))}
                      {msg.cached && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono
                                         bg-amber-50 border border-amber-200 text-amber-600
                                         px-2 py-0.5 rounded-full">
                          <Zap size={9} /> cached
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-ink-300 font-mono">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-ink-800 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-parchment-50" />
                </div>
                <div className="chat-assistant">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-ink-100 bg-parchment-50/80 backdrop-blur p-4">
            {chatMessages.length > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  className="text-xs text-ink-300 hover:text-ink-500 flex items-center gap-1 font-body"
                  onClick={clearChat}
                >
                  <Trash2 size={11} /> Clear chat
                </button>
              </div>
            )}
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                className="input-field flex-1 resize-none min-h-[44px] max-h-32 py-3"
                placeholder="Ask about your books… (Enter to send, Shift+Enter for newline)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ height: "auto" }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 128) + "px";
                }}
              />
              <button
                className="btn-primary h-11 px-4 flex-shrink-0"
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: History sidebar ─────────────────────────────────── */}
        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-ink-100 bg-white flex flex-col">
          <button
            className="flex items-center justify-between px-5 py-3 border-b border-ink-100
                       text-sm font-body font-medium text-ink-600 hover:bg-parchment-50"
            onClick={() => setShowHistory((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <Clock size={14} /> Q&A History
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${showHistory ? "rotate-180" : ""}`}
            />
          </button>

          {showHistory && (
            <div className="flex-1 overflow-y-auto divide-y divide-ink-50">
              {history.length === 0 ? (
                <p className="text-xs text-ink-300 font-body text-center py-8">No history yet.</p>
              ) : (
                history.map((h) => (
                  <button
                    key={h.id}
                    className="w-full text-left px-5 py-3 hover:bg-parchment-50 transition-colors"
                    onClick={() => send(h.question)}
                  >
                    <p className="text-xs font-body font-medium text-ink-700 line-clamp-2">{h.question}</p>
                    <p className="text-[10px] text-ink-300 font-mono mt-1">
                      {new Date(h.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
