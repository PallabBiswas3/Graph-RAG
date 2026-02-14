import React from "react";
import { Node } from "../types";

interface Props {
  node: Node;
}

const NodeInspector: React.FC<Props> = ({ node }) => {
  return (
    <div className="absolute top-6 left-6 w-72 bg-gray-800 border border-blue-700/50 rounded-xl p-5 shadow-2xl">
      <span className="text-xs text-blue-400 uppercase tracking-wide">
        {node.type}
      </span>

      <h3 className="text-xl font-bold text-gray-100 mt-2 mb-2 leading-tight">
        {node.label}
      </h3>

      <p className="text-sm text-gray-300 leading-relaxed">
        {node.description || "No description available."}
      </p>
    </div>
  );
};

export default NodeInspector;