import React, { useState } from "react";
import { Send, X } from "lucide-react";
import { ChatMessage, GraphData, Node } from "../types";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (query: string) => void;
  graph: GraphData; // Add graph data to map node IDs to labels
  onClose?: () => void; // Optional close handler
}

const ChatPanel: React.FC<Props> = ({
  messages,
  loading,
  onSend,
  graph = { nodes: [], links: [] }, // Default empty graph to prevent undefined errors
  onClose,
}) => {
  const [input, setInput] = useState("");

  // Function to get node label by ID
  const getNodeLabel = (nodeId: string): string => {
    if (!graph || !graph.nodes) return nodeId;
    const node = graph.nodes.find(n => n.id === nodeId);
    return node ? node.label : nodeId;
  };

  // Function to format reasoning trace with meaningful labels
  const formatReasoningTrace = (trace: string[]): string => {
    if (!graph || !graph.nodes) return trace.join(" → ");
    return trace.map(nodeId => getNodeLabel(nodeId)).join(" → ");
  };

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && onClose) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed top-0 left-64 right-0 bottom-0 bg-[#080808] flex items-center justify-center p-4 z-40">
      <div className="w-[70%] max-w-4xl h-[80vh] bg-[#0a0a0a] rounded-2xl shadow-2xl border border-white/10 flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Research Graph Chat</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10"
              title="Close chat"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-8">
              <div className="mb-2">💬</div>
              <div>Ask questions about your research graph!</div>
              <div className="text-xs mt-2 text-gray-600">
                Example: "What methods were used in these papers?"
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              {msg.reasoningTrace && (
                <div className="text-xs text-purple-400 p-2 bg-purple-900/20 rounded-lg border border-purple-700/30 max-w-[80%]">
                  <div className="text-purple-300 font-medium mb-1">🧠 Reasoning Path:</div>
                  <div className="text-purple-200 break-words">
                    {formatReasoningTrace(msg.reasoningTrace)}
                  </div>
                </div>
              )}
              <div
                className={`p-3 rounded-lg text-sm max-w-[80%] break-words ${msg.role === "user"
                  ? "bg-blue-700 text-white rounded-br-none"
                  : "bg-gray-700 text-gray-100 rounded-bl-none"
                  }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center justify-center text-blue-400 text-sm py-4 animate-pulse">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce mr-2"></div>
              <span>Analyzing graph...</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-[#0d0d0d]">
          <div className="flex items-center gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              className="flex-1 bg-[#1a1a1a] border border-gray-600 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-white placeholder-gray-500 transition-all duration-200"
              placeholder="Ask about your research graph..."
              onKeyDown={handleKeyDown}
              disabled={loading}
              style={{ maxHeight: '150px', minHeight: '48px' }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl transition-colors duration-200 flex items-center justify-center"
              title="Send message"
            >
              <Send size={20} className="text-white" />
            </button>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;