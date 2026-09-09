import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { supabase } from "../supabase";
import { generateEmbedding } from "../embedding";
import { aggregateRetrievalMetrics, evaluateRetrievalCase } from "./metrics";
import { BenchmarkCase, RetrievalSnapshot } from "./types";

interface NodeResult {
  id: string;
  similarity: number;
  label?: string;
  description?: string;
  type?: string;
}

interface ChunkResult {
  id: string;
  node_id: string;
  similarity: number;
  content?: string;
  metadata?: Record<string, unknown>;
}

function rerankByTermOverlap<T extends { text: string; score: number }>(items: T[], query: string): T[] {
  const terms = query.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  return items
    .map((item) => {
      const lower = item.text.toLowerCase();
      const matches = terms.filter((term) => lower.includes(term)).length;
      const boost = matches / Math.max(terms.length, 1);
      return { ...item, score: item.score * 0.7 + boost * 0.3 };
    })
    .sort((a, b) => b.score - a.score);
}

async function retrieve(query: string, limit = 8): Promise<RetrievalSnapshot> {
  const start = performance.now();
  const embedding = await generateEmbedding(query);

  const [vectorNodes, textNodes, vectorChunks, textChunks] = await Promise.all([
    supabase.rpc("match_nodes", { query_embedding: embedding, match_count: limit }),
    supabase
      .from("nodes")
      .select("id,label,description,type")
      .or(`label.ilike.%${query}%,description.ilike.%${query}%,type.ilike.%${query}%`)
      .limit(limit),
    supabase.rpc("match_chunks", { query_embedding: embedding, match_count: limit }),
    supabase
      .from("chunks")
      .select("id,node_id,content,metadata")
      .ilike("content", `%${query}%`)
      .limit(limit),
  ]);

  if (vectorNodes.error) throw vectorNodes.error;
  if (textNodes.error) throw textNodes.error;
  if (vectorChunks.error) throw vectorChunks.error;
  if (textChunks.error) throw textChunks.error;

  const nodeMap = new Map<string, NodeResult>();
  for (const node of (vectorNodes.data || []) as NodeResult[]) nodeMap.set(node.id, node);
  for (const node of (textNodes.data || []) as NodeResult[]) {
    const existing = nodeMap.get(node.id);
    nodeMap.set(node.id, {
      ...node,
      similarity: existing ? Math.min(existing.similarity + 0.15, 1) : 0.5,
    });
  }

  const chunkMap = new Map<string, ChunkResult>();
  for (const chunk of (vectorChunks.data || []) as ChunkResult[]) chunkMap.set(chunk.id, chunk);
  for (const chunk of (textChunks.data || []) as ChunkResult[]) {
    const existing = chunkMap.get(chunk.id);
    chunkMap.set(chunk.id, {
      ...chunk,
      similarity: existing ? Math.min(existing.similarity + 0.15, 1) : 0.5,
    });
  }

  const nodeRanked = rerankByTermOverlap(
    Array.from(nodeMap.values()).map((node) => ({
      id: node.id,
      score: node.similarity,
      text: `${node.label || ""} ${node.description || ""}`,
    })),
    query
  )
    .filter((item) => item.score >= 0.35)
    .slice(0, 5)
    .map(({ id, score }) => ({ id, score }));

  const chunkRanked = rerankByTermOverlap(
    Array.from(chunkMap.values()).map((chunk) => ({
      id: chunk.id,
      score: chunk.similarity,
      text: chunk.content || "",
    })),
    query
  )
    .filter((item) => item.score >= 0.35)
    .slice(0, 6)
    .map(({ id, score }) => ({ id, score }));

  return {
    nodes: nodeRanked,
    chunks: chunkRanked,
    latencyMs: performance.now() - start,
  };
}

async function main() {
  const benchmarkPath = process.argv[2];
  if (!benchmarkPath) {
    throw new Error("Usage: npm run eval:retrieval -- <benchmark.json>");
  }

  const absolutePath = path.resolve(process.cwd(), benchmarkPath);
  const cases = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as BenchmarkCase[];

  const perCase = [];
  for (const benchmark of cases) {
    const snapshot = await retrieve(benchmark.query);
    perCase.push(evaluateRetrievalCase(benchmark, snapshot, 5));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    benchmark: absolutePath,
    aggregate: aggregateRetrievalMetrics(perCase),
    cases: perCase,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
