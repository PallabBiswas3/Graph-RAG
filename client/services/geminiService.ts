import {
  ExtractionResult,
  GraphData,
  ChatMessage
} from "../types";

const API_BASE_URL = "http://localhost:3000";

/* =========================
   EXTRACT KNOWLEDGE GRAPH
========================= */

export const extractKnowledgeGraph = async (
  text: string
): Promise<ExtractionResult> => {
  const response = await fetch(`${API_BASE_URL}/api/graph/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || "Failed to extract knowledge graph"
    );
  }

  return response.json();
};

/* =========================
   QUERY GRAPH (RAG)
========================= */

export const queryGraphRAG = async (
  query: string
): Promise<ChatMessage> => {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || "Failed to query knowledge graph"
    );
  }

  return response.json();
};

/* =========================
   FETCH GRAPH DATA
========================= */

export const fetchGraphData = async (): Promise<GraphData> => {
  const response = await fetch(`${API_BASE_URL}/api/graph`);

  if (!response.ok) {
    throw new Error("Failed to fetch graph data");
  }

  return response.json();
};

/* =========================
   CLEAR GRAPH DATA
========================= */

export const clearGraphData = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/graph/clear`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to clear graph data");
  }
};
