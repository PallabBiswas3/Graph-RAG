import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ChatMessage, GraphData } from "../types";
import { queryGraphRAGStream, SourceCitation } from "../services/geminiService";

/* =========================
   TYPES
========================= */

interface EnrichedMessage extends ChatMessage {
  sources?: SourceCitation[];
  reasoningTrace?: string[];
  confidence?: number;
  isStreaming?: boolean;
}

interface Props {
  messages: EnrichedMessage[];
  setMessages: React.Dispatch<React.SetStateAction<EnrichedMessage[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  graph: GraphData;
  onClose?: () => void;
}

/* =========================
   CONFIDENCE BADGE
========================= */

const ConfidenceBadge: React.FC<{ score: number }> = ({ score }) => {
  const pct = Math.round(score * 100);
  const color =
    pct >= 75 ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
      pct >= 50 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
        "text-rose-400 border-rose-500/30 bg-rose-500/10";

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${color}`}>
      <Zap size={9} />
      {pct}% confidence
    </span>
  );
};

/* =========================
   SOURCE CITATIONS PANEL
========================= */

const SourcesPanel: React.FC<{ sources: SourceCitation[]; graph: GraphData }> = ({
  sources,
  graph,
}) => {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  const getNodeLabel = (nodeId: string) => {
    const node = graph?.nodes?.find((n) => n.id === nodeId);
    return node?.label ?? nodeId;
  };

  return (
    <div className="mt-2 rounded-xl border border-white/8 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/4 hover:bg-white/6 transition-colors text-xs text-gray-400 hover:text-gray-200"
      >
        <span className="flex items-center gap-1.5">
          <FileText size={11} />
          {sources.length} source{sources.length > 1 ? "s" : ""} retrieved
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="divide-y divide-white/5">
          {sources.map((src, i) => {
            const pct = Math.round(src.similarity * 100);
            const barColor =
              pct >= 75 ? "bg-emerald-500" :
                pct >= 50 ? "bg-amber-500" : "bg-rose-500";

            return (
              <div key={i} className="px-3 py-2.5 bg-black/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-200 truncate max-w-[70%]">
                    {src.nodeLabel || getNodeLabel(src.nodeId)}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">{pct}%</span>
                </div>
                {/* Similarity bar */}
                <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {src.chunkContent && (
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                    {src.chunkContent}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* =========================
   REASONING TRACE
========================= */

const ReasoningTrace: React.FC<{ trace: string[]; graph: GraphData }> = ({
  trace,
  graph,
}) => {
  const [open, setOpen] = useState(false);

  if (!trace || trace.length === 0) return null;

  const getLabel = (id: string) =>
    graph?.nodes?.find((n) => n.id === id)?.label ?? id;

  return (
    <div className="mt-1.5 rounded-xl border border-violet-500/20 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 bg-violet-500/5 hover:bg-violet-500/10 transition-colors text-xs text-violet-400"
      >
        <span className="flex items-center gap-1.5">
          <Brain size={11} />
          Reasoning path
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="px-3 py-2.5 bg-black/20">
          <div className="flex flex-wrap gap-1 items-center">
            {trace.map((id, i) => (
              <React.Fragment key={i}>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/20">
                  {getLabel(id)}
                </span>
                {i < trace.length - 1 && (
                  <span className="text-gray-600 text-xs">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================
   MESSAGE BUBBLE
========================= */

const MessageBubble: React.FC<{ msg: EnrichedMessage; graph: GraphData }> = ({
  msg,
  graph,
}) => {
  const isUser = msg.role === "user";

  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
      {/* Role label */}
      <span className="text-[10px] text-gray-600 px-1 font-mono uppercase tracking-widest">
        {isUser ? "you" : "graph rag"}
      </span>

      <div className={`max-w-[82%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {/* Main bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser
              ? "bg-blue-600/90 text-white rounded-tr-sm shadow-lg shadow-blue-900/20"
              : "bg-[#141414] border border-white/8 text-gray-100 rounded-tl-sm"
            }`}
        >
          {msg.content}
          {msg.isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-blue-400 rounded-sm animate-pulse align-middle" />
          )}
        </div>

        {/* Confidence + metadata row */}
        {!isUser && !msg.isStreaming && (
          <div className="flex items-center gap-2 px-1">
            {msg.confidence !== undefined && (
              <ConfidenceBadge score={msg.confidence} />
            )}
          </div>
        )}

        {/* Sources */}
        {!isUser && !msg.isStreaming && msg.sources && (
          <div className="w-full">
            <SourcesPanel sources={msg.sources} graph={graph} />
          </div>
        )}

        {/* Reasoning trace */}
        {!isUser && !msg.isStreaming && msg.reasoningTrace && (
          <div className="w-full">
            <ReasoningTrace trace={msg.reasoningTrace} graph={graph} />
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================
   EMPTY STATE
========================= */

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
    <div className="relative">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/10 flex items-center justify-center">
        <Brain size={24} className="text-blue-400" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
        <Zap size={10} className="text-emerald-400" />
      </div>
    </div>
    <div className="text-center">
      <p className="text-gray-300 text-sm font-medium mb-1">Graph RAG Assistant</p>
      <p className="text-gray-600 text-xs max-w-[220px] leading-relaxed">
        Ask questions grounded in your knowledge graph. Sources and reasoning paths are shown for every answer.
      </p>
    </div>
    <div className="flex flex-col gap-1.5 w-full max-w-[260px]">
      {[
        "What concepts are connected to this topic?",
        "Explain the relationship between X and Y",
        "Summarize the key ideas in the graph",
      ].map((ex, i) => (
        <div
          key={i}
          className="text-[11px] text-gray-500 px-3 py-2 rounded-lg border border-white/5 bg-white/2 text-center"
        >
          "{ex}"
        </div>
      ))}
    </div>
  </div>
);

/* =========================
   MAIN CHAT PANEL
========================= */

const ChatPanel: React.FC<Props> = ({
  messages,
  setMessages,
  loading,
  setLoading,
  graph = { nodes: [], links: [] },
  onClose,
}) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [input]);

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput("");
    setError(null);
    setLoading(true);

    // Add user message
    const userMsg: EnrichedMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);

    // Add placeholder streaming assistant message
    const streamingId = Date.now();
    const streamingMsg: EnrichedMessage = {
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, streamingMsg]);

    let accumulated = "";

    await queryGraphRAGStream(
      query,
      // onToken
      (token) => {
        accumulated += token;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.isStreaming) {
            updated[updated.length - 1] = { ...last, content: accumulated };
          }
          return updated;
        });
      },
      // onDone
      (response) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: response.content,
            sources: response.sources,
            reasoningTrace: response.reasoningTrace,
            confidence: response.confidence,
            isStreaming: false,
          };
          return updated;
        });
        setLoading(false);
      },
      // onError
      (errMsg) => {
        setError(errMsg);
        setMessages((prev) => prev.slice(0, -1)); // remove streaming placeholder
        setLoading(false);
      }
    );
  }, [input, loading, setMessages, setLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed top-0 left-64 right-0 bottom-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40">
      <div
        className="w-[68%] max-w-3xl h-[82vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(145deg, #0d0d0d 0%, #0a0a0a 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.8)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Brain size={14} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">
                Graph RAG Chat
              </h2>
              <p className="text-[10px] text-gray-600 mt-0.5 font-mono">
                {graph.nodes?.length ?? 0} nodes · {graph.links?.length ?? 0} edges
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-mono">
                <Loader2 size={11} className="animate-spin" />
                querying…
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-white/8 rounded-lg transition-all duration-150"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scroll-smooth">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} graph={graph} />
            ))
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all duration-200"
            style={{
              background: "#111",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask anything about your knowledge graph…"
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 resize-none focus:outline-none py-1 leading-relaxed disabled:opacity-50"
              style={{ maxHeight: "140px", minHeight: "32px" }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="mb-0.5 p-2 rounded-lg transition-all duration-200 flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                  : "rgba(255,255,255,0.06)",
              }}
            >
              <Send size={15} className="text-white" />
            </button>
          </div>

          <p className="text-[10px] text-gray-700 mt-2 text-center font-mono">
            Enter ↵ to send · Shift+Enter for new line · Esc to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
