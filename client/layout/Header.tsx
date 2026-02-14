import React from "react";
import { Database, Network } from "lucide-react";
import { GraphData } from "../types";

interface HeaderProps {
  graph: GraphData;
  loading: boolean;
}

const Header: React.FC<HeaderProps> = ({ graph, loading }) => {
  return (
    <header className="h-16 border-b border-blue-900/30 flex items-center justify-between px-6 bg-gray-950 shadow-lg">
      <h1 className="text-xl font-extrabold tracking-tight text-gray-100">
        Research <span className="text-blue-500">LitGraph</span>
      </h1>

      <div className="flex gap-4 text-sm font-mono text-gray-300">
        <span className="flex items-center gap-2">
          <Database size={16} className="text-blue-400" /> {graph.nodes.length}
        </span>
        <span className="flex items-center gap-2">
          <Network size={16} className="text-purple-400" /> {graph.links.length}
        </span>
      </div>

      {loading && (
        <div className="text-blue-400 text-sm animate-pulse">
          Extracting...
        </div>
      )}
    </header>
  );
};

export default Header;