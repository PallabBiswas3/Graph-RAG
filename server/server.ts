import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import { generateEmbedding } from "./embedding";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

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
   READ GRAPH
========================= */

const readGraphData = async () => {
  const { data: nodes } = await supabase.from("nodes").select("*");
  const { data: links } = await supabase.from("links").select("*");

  return {
    nodes: nodes || [],
    links: links || [],
  };
};

/* =========================
   INSERT GRAPH
========================= */

async function insertGraph(graph: any) {
  for (const node of graph.nodes) {
    const embedding = await generateEmbedding(
      node.label + " " + (node.description || "")
    );

    await supabase.from("nodes").upsert({
      id: node.id,
      label: node.label,
      type: node.type,
      description: node.description,
      embedding,
    });
  }

  if (graph.links?.length) {
    await supabase.from("links").insert(graph.links);
  }
}

/* =========================
   GRAPH FETCH
========================= */

app.get("/api/graph", async (req, res) => {
  try {
    const graphData = await readGraphData();
    res.json(graphData);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve graph data" });
  }
});

/* =========================
   GRAPH EXTRACTION
========================= */

app.post("/api/graph/extract", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "Text required" });

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent(`
Extract a structured technical knowledge graph in JSON format.

Return format:
{
  "nodes": [],
  "links": []
}

TEXT:
${text}
    `);

    const raw = result.response.text();

    const parsedGraph = raw.startsWith("```")
      ? JSON.parse(raw.replace(/```json|```/g, "").trim())
      : JSON.parse(raw);

    await insertGraph(parsedGraph);

    res.json(parsedGraph);
  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({ message: "Extraction failed" });
  }
});

/* =========================
   GRAPH RAG QUERY
========================= */

async function queryGraphRAG(query: string) {
  const queryEmbedding = await generateEmbedding(query);

  // 1️⃣ Semantic search
  const { data: relevantNodes } = await supabase.rpc("match_nodes", {
    query_embedding: queryEmbedding,
    match_count: 5,
  });

  const nodeIds = relevantNodes?.map((n: any) => n.id) || [];

  if (nodeIds.length === 0) {
    return "No relevant knowledge found in graph.";
  }

  // 2️⃣ Recursive expansion
  const { data: subgraph } = await supabase.rpc("expand_graph", {
    start_ids: nodeIds,
    max_depth: 2,
  });

  const context =
    subgraph?.map(
      (e: any) => `${e.source} ${e.relationship} ${e.target}`
    ).join("\n") || "";

  // 3️⃣ LLM reasoning
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  const result = await model.generateContent(`
You are answering using a knowledge graph.

Knowledge:
${context}

Question:
${query}

Answer clearly and technically.
  `);

  return result.response.text();
}

/* =========================
   CHAT ENDPOINT
========================= */

app.post("/api/chat", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ message: "Query required" });

  try {
    const answer = await queryGraphRAG(query);

    res.json({
      role: "assistant",
      content: answer,
    });
  } catch (error) {
    console.error("RAG error:", error);
    res.status(500).json({ message: "Query failed" });
  }
});

/* =========================
   CLEAR GRAPH
========================= */

app.post("/api/graph/clear", async (req, res) => {
  await supabase.from("links").delete().neq("id", "");
  await supabase.from("nodes").delete().neq("id", "");

  res.json({ message: "Graph cleared" });
});

/* =========================
   ROOT
========================= */

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
