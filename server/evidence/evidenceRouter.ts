import { Router } from "express";
import { generateEmbedding } from "../embedding";
import { supabase } from "../supabase";
import { fetchEvidenceForChunks, ingestEvidenceForChunk } from "./evidenceService";

const router = Router();

router.post("/chunks/insert", async (req, res) => {
  const { node_id, content, chunk_index, metadata, source_url } = req.body;
  if (!node_id || !content) {
    return res.status(400).json({ message: "node_id and content are required" });
  }

  try {
    const embedding = await generateEmbedding(content);
    if (!embedding) {
      return res.status(500).json({ message: "Failed to generate chunk embedding" });
    }

    const { data: chunk, error } = await supabase
      .from("chunks")
      .insert({
        node_id,
        content,
        embedding: `[${embedding.join(",")}]`,
        chunk_index: chunk_index ?? 0,
        source_url: source_url ?? null,
        metadata: metadata ?? {},
      })
      .select("id")
      .single();

    if (error) throw error;

    let claimsInserted = 0;
    let evidenceStatus: "created" | "deferred" = "created";
    let evidenceWarning: string | undefined;

    try {
      claimsInserted = await ingestEvidenceForChunk({
        chunkId: chunk.id,
        nodeId: node_id,
        content,
        sourceDocId: source_url,
        pageStart: metadata?.pageStart,
        pageEnd: metadata?.pageEnd,
        fileName: metadata?.fileName,
        totalPages: metadata?.totalPages,
      });
    } catch (evidenceError: any) {
      // Preserve ingestion if the migration has not yet been applied or evidence extraction fails.
      evidenceStatus = "deferred";
      evidenceWarning = evidenceError?.message || "Evidence extraction failed";
      console.warn("Evidence ingestion deferred:", evidenceWarning);
    }

    res.json({
      message: "Chunk inserted successfully",
      chunkId: chunk.id,
      claimsInserted,
      evidenceStatus,
      evidenceWarning,
    });
  } catch (error: any) {
    console.error("Evidence chunk insert error:", error);
    res.status(500).json({ message: error?.message || "Chunk insertion failed" });
  }
});

router.post("/for-chunks", async (req, res) => {
  const chunkIds = Array.isArray(req.body?.chunk_ids) ? req.body.chunk_ids : [];
  if (!chunkIds.length) return res.json({ claims: [] });

  try {
    const claims = await fetchEvidenceForChunks(chunkIds);
    res.json({ claims });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Evidence retrieval failed" });
  }
});

export default router;
