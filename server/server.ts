import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import { generateEmbedding } from "./embedding";
import evidenceRouter from "./evidence/evidenceRouter";
import { runAdaptiveAgent } from "./agent/adaptiveAgent";

dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY is not set.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/evidence", evidenceRouter);

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

interface SourceCitation {
  nodeId: string;
  nodeLabel: string;
  similarity: number;
  chunkId?: string;
  sourceDocId?: string;
  pageStart?: number;
  pageEnd?: number;
  chunkContent?: string;
}

const readGraphData = async () => {
  const [{ data: nodes, error: nodesError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from("nodes").select("*"),
    supabase.from("links").select("*"),
  ]);
  if (nodesError) throw nodesError;
  if (linksError) throw linksError;
  return { nodes: nodes || [], links: links || [] };
};

async function insertChunk({
  nodeId,
  content,
  chunkIndex = 0,
  metadata = {},
  sourceDocId,
}: {
  nodeId: string;
  content: string;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
  sourceDocId?: string;
}) {
  const embedding = await generateEmbedding(content);
  if (!embedding) throw new Error(`No embedding generated for chunk linked to ${nodeId}`);

  const { error } = await supabase.from("chunks").insert({
    node_id: nodeId,
    content,
    embedding: `[${embedding.join(",")}]`,
    chunk_index: chunkIndex,
    source_url: sourceDocId ?? null,
    metadata,
  });
  if (error) throw error;
}

async function insertGraph(graph: GraphData, sourceDocId?: string) {
  let successCount = 0;

  for (const node of graph.nodes) {
    try {
      const embeddingText = `${node.label} (${node.type}): ${node.description}`;
      const embedding = await generateEmbedding(embeddingText);
      if (!embedding) continue;

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
      if (error) throw error;

      successCount += 1;
      await insertChunk({
        nodeId: formattedId,
        content: node.description,
        chunkIndex: 0,
        metadata: { label: node.label, type: node.type, auto: true },
        sourceDocId,
      });
    } catch (error) {
      console.error("Node persistence failed:", node.label, error);
    }
  }

  if (successCount > 0 && graph.links?.length) {
    const formattedLinks = graph.links.map((link) => ({
      source: link.source.toLowerCase().replace(/\s+/g, ""),
      target: link.target.toLowerCase().replace(/\s+/g, ""),
      relationship: link.relationship,
      type: link.type,
      reason: link.reason,
      weight: link.weight ?? 1.0,
    }));
    const { error } = await supabase.from("links").insert(formattedLinks);
    if (error) throw error;
  }
}

app.get("/api/graph", async (_req, res) => {
  try {
    res.json(await readGraphData());
  } catch (error) {
    console.error("Graph fetch failed:", error);
    res.status(500).json({ message: "Failed to retrieve graph data" });
  }
});

app.post("/api/graph/extract", async (req, res) => {
  const { text, source_doc_id } = req.body;
  if (!text) return res.status(400).json({ message: "Text required" });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(`
Extract a structured technical knowledge graph from the text below.

For every NODE include:
- "id": unique identifier (lowercase, no spaces)
- "label": entity name
- "type": category
- "description": concise technical explanation

For every LINK include:
- "source": id of starting node
- "target": id of ending node
- "relationship": verb describing the relation
- "type": connection category
- "reason": brief explanation

Return ONLY valid JSON: { "nodes": [], "links": [] }

TEXT:
${text}
`);

    const raw = result.response.text();
    const parsedGraph: GraphData = JSON.parse(raw.replace(/```json|```/g, "").trim());
    await insertGraph(parsedGraph, source_doc_id);
    res.json(parsedGraph);
  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({ message: "Extraction failed" });
  }
});

async function queryAdaptiveGraphAgent(query: string) {
  const agent = await runAdaptiveAgent(query, { maxSteps: 6, maxRequeries: 1 });
  const state = agent.state;

  if (agent.decision === "abstain" || !state.chunks.length) {
    return {
      content: "I could not find enough source evidence in the uploaded knowledge base to answer this reliably.",
      sources: [],
      reasoningTrace: state.trace.map(
        (item) => `${item.step}:${item.tool} — ${item.reason} | ${item.observation}`
      ),
    };
  }

  const requestedNodeIds = [
    ...new Set([
      ...state.nodes.map((node) => node.id),
      ...state.chunks.map((chunk) => chunk.node_id),
      ...state.expandedNodeIds,
    ]),
  ].slice(0, 40);

  const { data: fullNodes, error: nodesError } = requestedNodeIds.length
    ? await supabase
        .from("nodes")
        .select("id,label,type,description,properties,confidence")
        .in("id", requestedNodeIds)
    : { data: [], error: null };
  if (nodesError) throw nodesError;

  const nodeContext =
    (fullNodes || [])
      .map(
        (node: any) =>
          `[NODE] ${node.label} (${node.type}) — confidence: ${node.confidence ?? 1}\n${node.description}${
            node.properties && Object.keys(node.properties).length
              ? `\nProperties: ${JSON.stringify(node.properties)}`
              : ""
          }`
      )
      .join("\n\n") || "None";

  const edgeContext =
    state.expandedEdges
      .map((edge) => `${edge.source} --[${edge.relationship}]--> ${edge.target}`)
      .join("\n") || "Graph expansion was not required by the agent.";

  const chunkContext = state.chunks
    .map((chunk, index) => {
      const metadata: any = chunk.metadata || {};
      const pageStart = metadata.pageStart;
      const pageEnd = metadata.pageEnd;
      const pages = pageStart
        ? ` | pages ${pageStart}${pageEnd && pageEnd !== pageStart ? `-${pageEnd}` : ""}`
        : "";
      return `[CHUNK ${index + 1} | id ${chunk.id} | node ${chunk.node_id}${pages} | score ${chunk.similarity.toFixed(3)}]\n${chunk.content}`;
    })
    .join("\n\n");

  const evidenceContext = state.evidenceClaims.length
    ? state.evidenceClaims
        .map((claim: any, index: number) => {
          const pages = claim.page_start
            ? ` pages ${claim.page_start}${claim.page_end && claim.page_end !== claim.page_start ? `-${claim.page_end}` : ""}`
            : "";
          const supportingChunkIds = (claim.evidence || [])
            .map((item: any) => item.chunk_id)
            .join(", ");
          return `[CLAIM ${index + 1} | ${claim.polarity} | confidence ${Number(
            claim.extraction_confidence ?? 1
          ).toFixed(2)} | source ${claim.source_doc_id || "unknown"}${pages} | chunks ${supportingChunkIds}]\n${claim.claim_text}`;
        })
        .join("\n\n")
    : "No structured claims available; use the original source chunks.";

  const agentTrace = state.trace
    .map(
      (item) =>
        `[STEP ${item.step}] TOOL=${item.tool}\nReason: ${item.reason}\nObservation: ${item.observation}`
    )
    .join("\n\n");

  const sources: SourceCitation[] = [
    ...state.nodes.map((node) => ({
      nodeId: node.id,
      nodeLabel: node.label,
      similarity: node.similarity,
    })),
    ...state.chunks.map((chunk) => {
      const metadata: any = chunk.metadata || {};
      return {
        nodeId: chunk.node_id,
        nodeLabel:
          (fullNodes || []).find((node: any) => node.id === chunk.node_id)?.label ?? chunk.node_id,
        similarity: chunk.similarity,
        chunkId: chunk.id,
        sourceDocId: metadata.sourceDocId || metadata.source_doc_id || undefined,
        pageStart: metadata.pageStart,
        pageEnd: metadata.pageEnd,
        chunkContent: chunk.content.slice(0, 160) + (chunk.content.length > 160 ? "…" : ""),
      };
    }),
  ];

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(`
You are the synthesis component of a bounded evidence-grounded graph agent.

=== AGENT TOOL TRACE ===
${agentTrace}

=== GRAPH NODES ===
${nodeContext}

=== GRAPH CONNECTIONS ===
${edgeContext}

=== STRUCTURED EVIDENCE CLAIMS ===
${evidenceContext}

=== ORIGINAL SOURCE CHUNKS ===
${chunkContext}

=== USER QUESTION ===
${query}

Rules:
- Answer ONLY from the supplied evidence.
- Original source chunks are the ultimate source of truth.
- Structured claims are secondary representations linked to those chunks.
- Do not invent a graph connection merely because the agent did not expand the graph.
- Preserve uncertainty, negation, numerical qualifiers, and disagreement.
- If retrieved evidence is insufficient for part of the question, explicitly state that limitation.
- Cite chunk numbers/pages in the prose whenever practical.
`);

  return {
    content: result.response.text(),
    sources,
    reasoningTrace: state.trace.map(
      (item) => `${item.step}:${item.tool} — ${item.reason} | ${item.observation}`
    ),
  };
}

app.post("/api/chat", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ message: "Query required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const { content, sources, reasoningTrace } = await queryAdaptiveGraphAgent(query);
    for (const word of content.split(" ")) {
      sendEvent({ token: `${word} ` });
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
    sendEvent({ sources, reasoningTrace });
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Adaptive agent error:", error);
    sendEvent({ error: error.message || "Query failed" });
    res.end();
  }
});

// Legacy endpoint retained for compatibility. Phase 3+ PDF ingestion uses /api/evidence/chunks/insert.
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

app.post("/api/graph/clear", async (_req, res) => {
  const evidenceTables = ["claim_relations", "claim_entities", "claim_evidence", "claims", "documents"];
  for (const table of evidenceTables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq("created_at", "1900-01-01T00:00:00Z");
    if (error) console.warn(`Unable to clear optional evidence table ${table}:`, error.message);
  }

  await supabase.from("chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("links").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("nodes").delete().neq("id", "");
  res.json({ message: "Graph, chunks, and evidence cleared" });
});

app.get("/", (_req, res) => res.send("Adaptive evidence-grounded GraphRAG backend running 🚀"));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
