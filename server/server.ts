import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import { generateEmbedding } from "./embedding";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", "../../env") });

const app = express();
const PORT = process.env.PORT || 3000;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY is not set.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

app.use(cors());
app.use(express.json());

/* =========================
   TYPES
========================= */

interface Node {
  id: string;
  label: string;
  type: string;
  description: string;
  properties?: Record<string, unknown>;
  source_doc_id?: string;
  confidence?: number;
}

interface Link {
  source: string;
  target: string;
  relationship: string;
  type: string;
  reason: string;
  weight?: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface MatchedNode {
  id: string;
  label: string;
  description: string;
  similarity: number;
}

interface MatchedChunk {
  id: string;
  node_id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

interface SubgraphEdge {
  source: string;
  target: string;
  relationship: string;
  depth: number;
}

interface SourceCitation {
  nodeId: string;
  nodeLabel: string;
  similarity: number;
  chunkContent?: string;
}

/* =========================
   DATABASE READ
========================= */

const readGraphData = async () => {
  const { data: nodes } = await supabase.from("nodes").select("*");
  const { data: links } = await supabase.from("links").select("*");
  return { nodes: nodes || [], links: links || [] };
};

/* =========================
   HYBRID SEARCH HELPER
   Combines pgvector cosine similarity + Postgres full-text search
========================= */

async function hybridSearchNodes(
  queryEmbedding: number[],
  queryText: string,
  limit = 8
): Promise<MatchedNode[]> {
  // 1️⃣ Vector search
  const { data: vectorResults } = await supabase.rpc("match_nodes", {
    query_embedding: queryEmbedding,
    match_count: limit,
  });

  // 2️⃣ Full-text keyword search
  const { data: textResults } = await supabase
    .from("nodes")
    .select("id, label, description, type")
    .or(
      `label.ilike.%${queryText}%,description.ilike.%${queryText}%,type.ilike.%${queryText}%`
    )
    .limit(limit);

  // 3️⃣ Merge and deduplicate — boost nodes found by BOTH methods
  const vectorMap = new Map<string, MatchedNode>(
    (vectorResults || []).map((n: MatchedNode) => [n.id, n])
  );

  const merged = new Map<string, MatchedNode>(vectorMap);

  for (const n of textResults || []) {
    if (merged.has(n.id)) {
      // Boost similarity for nodes found in both searches
      const existing = merged.get(n.id)!;
      merged.set(n.id, { ...existing, similarity: Math.min(existing.similarity + 0.15, 1.0) });
    } else {
      merged.set(n.id, { ...n, similarity: 0.5 }); // baseline for text-only hits
    }
  }

  // Sort by final similarity descending
  return Array.from(merged.values()).sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

async function hybridSearchChunks(
  queryEmbedding: number[],
  queryText: string,
  limit = 8
): Promise<MatchedChunk[]> {
  // 1️⃣ Vector search over chunks
  const { data: vectorResults } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: limit,
  });

  // 2️⃣ Full-text keyword search over chunks
  const { data: textResults } = await supabase
    .from("chunks")
    .select("id, node_id, content, metadata")
    .ilike("content", `%${queryText}%`)
    .limit(limit);

  const vectorMap = new Map<string, MatchedChunk>(
    (vectorResults || []).map((c: MatchedChunk) => [c.id, c])
  );

  const merged = new Map<string, MatchedChunk>(vectorMap);

  for (const c of textResults || []) {
    if (merged.has(c.id)) {
      const existing = merged.get(c.id)!;
      merged.set(c.id, { ...existing, similarity: Math.min(existing.similarity + 0.15, 1.0) });
    } else {
      merged.set(c.id, { ...c, similarity: 0.5 });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

/* =========================
   RERANKER
   Scores chunks/nodes by query term overlap as a lightweight cross-encoder proxy
========================= */

function rerankByTermOverlap<T extends { content?: string; description?: string; similarity: number }>(
  items: T[],
  query: string
): T[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  return items
    .map((item) => {
      const text = (item.content || item.description || "").toLowerCase();
      const matchCount = queryTerms.filter((term) => text.includes(term)).length;
      const termBoost = matchCount / Math.max(queryTerms.length, 1);
      return { ...item, similarity: item.similarity * 0.7 + termBoost * 0.3 };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

/* =========================
   INSERT GRAPH
========================= */

async function insertGraph(graph: GraphData, sourceDocId?: string) {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let successCount = 0;

  for (const node of graph.nodes) {
    try {
      await sleep(1500);

      const embeddingText = `${node.label} (${node.type}): ${node.description}`;
      const embedding = await generateEmbedding(embeddingText);

      if (!embedding) {
        console.error("❌ No embedding for:", node.label);
        continue;
      }

      const formattedId = node.id.toLowerCase().replace(/\s+/g, "");

      const { error } = await supabase.from("nodes").upsert({
        id: formattedId,
        label: node.label,
        type: node.type,
        description: node.description,
        embedding: `[${embedding.join(",")}]`,
        properties: node.properties ?? {},
        source_doc_id: sourceDocId ?? node.source_doc_id ?? null,
        confidence: node.confidence ?? 1.0,
      });

      if (error) {
        console.error("❌ Node insert error:", error);
        continue;
      }

      successCount++;

      // Auto-insert description as a chunk
      await insertChunk({
        nodeId: formattedId,
        content: node.description,
        chunkIndex: 0,
        metadata: { label: node.label, type: node.type, auto: true },
        sourceDocId,
      });
    } catch (err) {
      console.error("❌ Failed for:", node.label, err);
    }
  }

  if (successCount > 0 && graph.links?.length) {
    const formattedLinks = graph.links.map((l) => ({
      source: l.source.toLowerCase().replace(/\s+/g, ""),
      target: l.target.toLowerCase().replace(/\s+/g, ""),
      relationship: l.relationship,
      type: l.type,
      reason: l.reason,
      weight: l.weight ?? 1.0,
    }));

    const { error } = await supabase.from("links").insert(formattedLinks);
    if (error) console.error("❌ Link insert error:", error);
    else console.log("✅ Links inserted");
  }
}

/* =========================
   INSERT CHUNK HELPER
========================= */

interface InsertChunkOptions {
  nodeId: string;
  content: string;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
  sourceDocId?: string;
}

async function insertChunk({
  nodeId,
  content,
  chunkIndex = 0,
  metadata = {},
  sourceDocId,
}: InsertChunkOptions) {
  try {
    const embedding = await generateEmbedding(content);
    if (!embedding) return;

    const { error } = await supabase.from("chunks").insert({
      node_id: nodeId,
      content,
      embedding: `[${embedding.join(",")}]`,
      chunk_index: chunkIndex,
      source_url: sourceDocId ?? null,
      metadata,
    });

    if (error) console.error("❌ Chunk insert error:", error);
    else console.log(`✅ Chunk inserted for node: ${nodeId}`);
  } catch (err) {
    console.error("❌ Chunk embedding failed:", nodeId, err);
  }
}

/* =========================
   GRAPH FETCH
========================= */

app.get("/api/graph", async (req, res) => {
  try {
    res.json(await readGraphData());
  } catch {
    res.status(500).json({ message: "Failed to retrieve graph data" });
  }
});

/* =========================
   GRAPH EXTRACTION
========================= */

app.post("/api/graph/extract", async (req, res) => {
  const { text, source_doc_id } = req.body;
  if (!text) return res.status(400).json({ message: "Text required" });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Extract a structured technical knowledge graph from the text below.

      For every NODE include:
      - "id": unique identifier (lowercase, no spaces)
      - "label": entity name
      - "type": category (e.g. Tool, Concept, Language, Person, Method)
      - "description": concise technical explanation

      For every LINK include:
      - "source": id of starting node
      - "target": id of ending node
      - "relationship": verb (e.g. "implements", "extends", "uses")
      - "type": connection category (e.g. dependency, hierarchy)
      - "reason": brief explanation of the connection

      Return ONLY valid JSON: { "nodes": [], "links": [] }

      TEXT:
      ${text}
    `;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsedGraph: GraphData = raw.startsWith("```")
      ? JSON.parse(raw.replace(/```json|```/g, "").trim())
      : JSON.parse(raw);

    await insertGraph(parsedGraph, source_doc_id);
    res.json(parsedGraph);
  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({ message: "Extraction failed" });
  }
});

/* =========================
   GRAPH RAG CORE
========================= */

async function queryGraphRAG(query: string) {
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) throw new Error("Failed to generate query embedding");

  // 1️⃣ Hybrid search — nodes + chunks
  const [rawNodes, rawChunks] = await Promise.all([
    hybridSearchNodes(queryEmbedding, query, 8),
    hybridSearchChunks(queryEmbedding, query, 8),
  ]);

  // 2️⃣ Rerank by term overlap
  const relevantNodes = rerankByTermOverlap(rawNodes, query).slice(0, 5);
  const relevantChunks = rerankByTermOverlap(
    rawChunks.map((c) => ({ ...c, description: c.content })),
    query
  ).slice(0, 6) as MatchedChunk[];

  // 3️⃣ Similarity threshold filter (drop very low quality hits)
  const THRESHOLD = 0.35;
  const filteredNodes = relevantNodes.filter((n) => n.similarity >= THRESHOLD);
  const filteredChunks = relevantChunks.filter((c) => c.similarity >= THRESHOLD);

  if (filteredNodes.length === 0 && filteredChunks.length === 0) {
    return {
      content: "No relevant knowledge found in the graph for your query. Try rephrasing or adding more documents.",
      sources: [],
      reasoningTrace: [],
    };
  }

  // 4️⃣ Graph expansion from matched node IDs
  const nodeIds = filteredNodes.map((n) => n.id);
  const chunkNodeIds = filteredChunks.map((c) => c.node_id).filter((id) => !nodeIds.includes(id));
  const allNodeIds = [...new Set([...nodeIds, ...chunkNodeIds])];

  const { data: subgraph } = await supabase.rpc("expand_graph", {
    start_ids: allNodeIds,
    max_depth: 2,
  });

  // 5️⃣ Fetch full node details
  const { data: fullNodes } = await supabase
    .from("nodes")
    .select("id, label, type, description, properties, confidence")
    .in("id", allNodeIds);

  // 6️⃣ Build LLM context
  const nodeContext =
    (fullNodes as any[])
      ?.map(
        (n) =>
          `[NODE] ${n.label} (${n.type}) — confidence: ${n.confidence ?? 1.0}
  ${n.description}${n.properties && Object.keys(n.properties).length > 0 ? `\n  Properties: ${JSON.stringify(n.properties)}` : ""}`
      )
      .join("\n\n") || "None";

  const edgeContext =
    (subgraph as SubgraphEdge[])
      ?.map((e) => `  ${e.source} ──[${e.relationship}]──> ${e.target}`)
      .join("\n") || "None";

  const chunkContext =
    filteredChunks
      .map(
        (c, i) =>
          `[CHUNK ${i + 1} | node: ${c.node_id} | match: ${(c.similarity * 100).toFixed(0)}%]\n${c.content}`
      )
      .join("\n\n") || "None";

  // 7️⃣ Build source citations for the client
  const sources: SourceCitation[] = [
    ...filteredNodes.map((n) => ({
      nodeId: n.id,
      nodeLabel: n.label,
      similarity: n.similarity,
    })),
    ...filteredChunks.map((c) => ({
      nodeId: c.node_id,
      nodeLabel: (fullNodes as any[])?.find((n) => n.id === c.node_id)?.label ?? c.node_id,
      similarity: c.similarity,
      chunkContent: c.content.slice(0, 120) + (c.content.length > 120 ? "…" : ""),
    })),
  ];

  // 8️⃣ Build reasoning trace (path through the graph)
  const reasoningTrace = allNodeIds.slice(0, 6);

  // 9️⃣ Generate answer
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(`
You are a precise technical expert. Answer using ONLY the knowledge graph and text chunks below.

=== GRAPH NODES ===
${nodeContext}

=== GRAPH CONNECTIONS ===
${edgeContext}

=== SUPPORTING TEXT CHUNKS ===
${chunkContext}

=== USER QUESTION ===
${query}

Rules:
- Use ONLY the data above. Do not use external knowledge.
- If the data is insufficient, say so explicitly.
- Cite node labels or chunk numbers when referencing specific facts.
- Be clear, structured, and technically precise.
`);

  return {
    content: result.response.text(),
    sources,
    reasoningTrace,
  };
}

/* =========================
   CHAT ENDPOINT — SSE STREAMING
========================= */

app.post("/api/chat", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ message: "Query required" });

  console.log("🔥 /api/chat:", query);

  // Set SSE headers for streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { content, sources, reasoningTrace } = await queryGraphRAG(query);

    // Stream content word by word
    const words = content.split(" ");
    for (const word of words) {
      sendEvent({ token: word + " " });
      await new Promise((r) => setTimeout(r, 12));
    }

    // Send metadata after content
    sendEvent({ sources, reasoningTrace });
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("RAG error:", error);
    sendEvent({ error: error.message || "Query failed" });
    res.end();
  }
});

/* =========================
   CHUNK INSERT ENDPOINT
========================= */

app.post("/api/chunks/insert", async (req, res) => {
  const { node_id, content, chunk_index, metadata, source_url } = req.body;
  if (!node_id || !content) {
    return res.status(400).json({ message: "node_id and content are required" });
  }

  try {
    await insertChunk({
      nodeId: node_id,
      content,
      chunkIndex: chunk_index ?? 0,
      metadata: metadata ?? {},
      sourceDocId: source_url,
    });
    res.json({ message: "Chunk inserted successfully" });
  } catch (error) {
    console.error("Chunk insert error:", error);
    res.status(500).json({ message: "Chunk insertion failed" });
  }
});

/* =========================
   CLEAR
========================= */

app.post("/api/graph/clear", async (req, res) => {
  await supabase.from("chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("links").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("nodes").delete().neq("id", "");
  res.json({ message: "Graph and chunks cleared" });
});

app.get("/", (_req, res) => res.send("Backend running 🚀"));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));