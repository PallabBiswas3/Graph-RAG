import React, { useState } from "react";
import { Send } from "lucide-react";
import { ChatMessage } from "../types";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (query: string) => void;
}

const ChatPanel: React.FC<Props> = ({
  messages,
  loading,
  onSend,
}) => {
  const [input, setInput] = useState("");

  return (
    <aside className="w-[480px] border-l border-white/5 bg-[#080808] flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${
              msg.role === "user"
                ? "text-right text-blue-400"
                : "text-left text-gray-300"
            }`}
          >
            {msg.reasoningTrace && (
              <div className="text-xs text-purple-500 mb-1">
                Path: {msg.reasoningTrace.join(" → ")}
              </div>
            )}
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="text-xs text-blue-400 animate-pulse">
            Reasoning...
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          className="flex-1 bg-[#0d0d0d] border border-white/10 rounded-xl p-3 text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(input);
              setInput("");
            }
          }}
        />

        <button
          onClick={() => {
            onSend(input);
            setInput("");
          }}
          disabled={!input.trim()}
          className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
    </aside>
  );
};

export default ChatPanel;