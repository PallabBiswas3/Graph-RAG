import React from "react";
import GraphCanvas from "../components/GraphCanvas";
import NodeInspector from "./NodeInspector";
import { GraphData, Node } from "../types";

interface Props {
  graph: GraphData;
  selectedNode: Node | null;
  onSelect: (node: Node | null) => void;
}

const GraphWorkspace: React.FC<Props> = ({
  graph,
  selectedNode,
  onSelect,
}) => {
  return (
    <div className="flex-1 relative bg-gray-950 w-full h-full">
      <GraphCanvas data={graph} onNodeClick={onSelect} />

      {selectedNode && (
        <NodeInspector node={selectedNode} />
      )}
    </div>
  );
};

export default GraphWorkspace;