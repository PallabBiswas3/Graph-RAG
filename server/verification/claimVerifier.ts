import { GoogleGenerativeAI } from "@google/generative-ai";
import { RetrievedChunk } from "../retrieval/hybridRetriever";
import { ClaimVerification, VerifiableClaim, VerificationLabel } from "./types";

function cleanJson(raw: string): string {
  return raw.replace(/```json|```/g, "").trim();
}

function chunkMap(chunks: RetrievedChunk[]): Map<string, RetrievedChunk> {
  return new Map(chunks.map((chunk) => [chunk.id, chunk]));
}

function linkedChunksForClaim(claim: VerifiableClaim, chunks: RetrievedChunk[]): RetrievedChunk[] {
  const byId = chunkMap(chunks);
  const linkedIds = (claim.evidence || []).map((item) => item.chunk_id);
  const linked = linkedIds.map((id) => byId.get(id)).filter(Boolean) as RetrievedChunk[];
  return linked.length ? linked : chunks.slice(0, 3);
}

export async function verifyClaimAgainstChunks(
  claim: VerifiableClaim,
  chunks: RetrievedChunk[]
): Promise<ClaimVerification> {
  const evidenceChunks = linkedChunksForClaim(claim, chunks);
  const supportingChunkIds = evidenceChunks.map((chunk) => chunk.id);

  if (!evidenceChunks.length) {
    return {
      claimId: claim.id,
      claimText: claim.claim_text,
      label: "INSUFFICIENT",
      confidence: 1,
      reason: "No raw source chunks are available for verification.",
      supportingChunkIds: [],
    };
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      claimId: claim.id,
      claimText: claim.claim_text,
      label: "INSUFFICIENT",
      confidence: 1,
      reason: "Verifier unavailable because GOOGLE_API_KEY is not configured.",
      supportingChunkIds,
    };
  }

  const evidenceText = evidenceChunks
    .map((chunk, index) => `[SOURCE ${index + 1} | chunk_id=${chunk.id}]\n${chunk.content}`)
    .join("\n\n");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

  try {
    const result = await model.generateContent(`
You are a strict claim verifier.

Classify the CLAIM against ONLY the RAW SOURCE CHUNKS below.
Return JSON only:
{
  "label": "SUPPORTED | CONTRADICTED | INSUFFICIENT",
  "confidence": 0.0,
  "reason": "brief explanation"
}

Definitions:
- SUPPORTED: the source text directly entails the important factual content of the claim.
- CONTRADICTED: the source text directly conflicts with the claim.
- INSUFFICIENT: the source text does not establish either support or contradiction.

Rules:
- Do not use outside knowledge.
- Preserve negation, quantities, conditions, comparisons, and uncertainty.
- Mere topical similarity is not support.
- If a stronger or broader claim is not fully established, use INSUFFICIENT.

CLAIM:
${claim.claim_text}

RAW SOURCE CHUNKS:
${evidenceText}
`);

    const parsed = JSON.parse(cleanJson(result.response.text())) as {
      label?: VerificationLabel;
      confidence?: number;
      reason?: string;
    };

    const validLabels: VerificationLabel[] = ["SUPPORTED", "CONTRADICTED", "INSUFFICIENT"];
    const label = validLabels.includes(parsed.label as VerificationLabel)
      ? (parsed.label as VerificationLabel)
      : "INSUFFICIENT";

    return {
      claimId: claim.id,
      claimText: claim.claim_text,
      label,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
      reason: parsed.reason || "Verifier returned no explanation.",
      supportingChunkIds,
    };
  } catch (error: any) {
    return {
      claimId: claim.id,
      claimText: claim.claim_text,
      label: "INSUFFICIENT",
      confidence: 1,
      reason: `Verifier failed conservatively: ${error?.message || "unknown error"}`,
      supportingChunkIds,
    };
  }
}

export async function verifyClaimsAgainstChunks(
  claims: VerifiableClaim[],
  chunks: RetrievedChunk[],
  limit = 8
): Promise<ClaimVerification[]> {
  const selected = claims.slice(0, limit);
  const results: ClaimVerification[] = [];
  for (const claim of selected) {
    results.push(await verifyClaimAgainstChunks(claim, chunks));
  }
  return results;
}
