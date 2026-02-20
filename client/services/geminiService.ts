import { ExtractionResult, GraphData, ChatMessage } from "../types";
import { PDFChunk } from "./pdfService";

const API_BASE_URL = "http://localhost:3000";

/* =========================
   TYPES
========================= */

export interface SourceCitation {
  nodeId: string;
  nodeLabel: string;
  similarity: number;
  chunkContent?: string;
}

export interface ChatResponse {
  role: "assistant";
  content: string;
  sources?: SourceCitation[];
  reasoningTrace?: string[];
  confidence?: number;
}

export interface IngestionProgress {
  total: number;
  current: number;
  status: "extracting" | "chunking" | "embedding" | "done" | "error";
  message: string;
}

/* =========================
   EXTRACT KNOWLEDGE GRAPH
========================= */

export const extractKnowledgeGraph = async (
  text: string,
  sourceDocId?: string
): Promise<ExtractionResult> => {
  const response = await fetch(`${API_BASE_URL}/api/graph/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source_doc_id: sourceDocId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to extract knowledge graph");
  }

  return response.json();
};

/* =========================
   INGEST PDF CHUNKS INTO SUPABASE
========================= */

export const ingestPDFChunks = async (
  chunks: PDFChunk[],
  nodeId: string,
  sourceDocId: string,
  onProgress?: (progress: IngestionProgress) => void
): Promise<void> => {
  const total = chunks.length;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    onProgress?.({
      total,
      current: i + 1,
      status: "embedding",
      message: `Embedding chunk ${i + 1} of ${total} (pages ${chunk.pageStart}–${chunk.pageEnd})`,
    });

    const response = await fetch(`${API_BASE_URL}/api/chunks/insert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        node_id: nodeId,
        content: chunk.content,
        chunk_index: chunk.chunkIndex,
        source_url: sourceDocId,
        metadata: {
          ...chunk.metadata,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
        },
      }),
    });

    if (!response.ok) {
      console.error(`Failed to insert chunk ${i + 1}`);
    }

    // Rate limit protection between chunk insertions
    await new Promise((r) => setTimeout(r, 1200));
  }

  onProgress?.({
    total,
    current: total,
    status: "done",
    message: `All ${total} chunks ingested successfully`,
  });
};

/* =========================
   QUERY GRAPH (RAG) — WITH STREAMING
========================= */

export const queryGraphRAGStream = async (
  query: string,
  onToken: (token: string) => void,
  onDone: (response: ChatResponse) => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to query knowledge graph");
    }

    // Check if server supports streaming
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      // SSE streaming path
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let sources: SourceCitation[] = [];
      let reasoningTrace: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                fullContent += parsed.token;
                onToken(parsed.token);
              }
              if (parsed.sources) sources = parsed.sources;
              if (parsed.reasoningTrace) reasoningTrace = parsed.reasoningTrace;
            } catch {
              // Plain text token
              fullContent += data;
              onToken(data);
            }
          }
        }
      }

      onDone({
        role: "assistant",
        content: fullContent,
        sources,
        reasoningTrace,
        confidence: sources.length > 0
          ? sources.reduce((acc, s) => acc + s.similarity, 0) / sources.length
          : undefined,
      });
    } else {
      // Non-streaming fallback — simulate streaming by revealing words progressively
      const data: ChatResponse = await response.json();
      const words = data.content.split(" ");

      for (const word of words) {
        onToken(word + " ");
        await new Promise((r) => setTimeout(r, 18));
      }

      onDone({
        ...data,
        confidence: data.sources && data.sources.length > 0
          ? data.sources.reduce((acc, s) => acc + s.similarity, 0) / data.sources.length
          : undefined,
      });
    }
  } catch (err: any) {
    onError(err.message || "Unknown error");
  }
};

/* =========================
   QUERY GRAPH (RAG) — STANDARD
========================= */

export const queryGraphRAG = async (query: string): Promise<ChatMessage> => {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to query knowledge graph");
  }

  return response.json();
};

/* =========================
   FETCH GRAPH DATA
========================= */

export const fetchGraphData = async (): Promise<GraphData> => {
  const response = await fetch(`${API_BASE_URL}/api/graph`);
  if (!response.ok) throw new Error("Failed to fetch graph data");
  return response.json();
};

/* =========================
   CLEAR GRAPH DATA
========================= */

export const clearGraphData = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/graph/clear`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to clear graph data");
};