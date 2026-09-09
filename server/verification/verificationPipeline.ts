import { fetchEvidenceForChunks } from "../evidence/evidenceService";
import { retrieveHybrid, RetrievedChunk, RetrievedNode } from "../retrieval/hybridRetriever";
import { verifyClaimsAgainstChunks } from "./claimVerifier";
import {
  buildVerificationRetryQuery,
  shouldAbstainAfterVerification,
  shouldRetryVerification,
  summarizeVerification,
} from "./verificationPolicy";
import { VerificationOutcome, VerifiableClaim } from "./types";

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const merged = new Map<string, T>();
  for (const item of existing) merged.set(item.id, item);
  for (const item of incoming) merged.set(item.id, item);
  return [...merged.values()];
}

export interface VerificationPipelineInput {
  originalQuery: string;
  nodes: RetrievedNode[];
  chunks: RetrievedChunk[];
  claims: VerifiableClaim[];
  maxRetries?: number;
}

export interface VerificationPipelineResult extends VerificationOutcome {
  nodes: RetrievedNode[];
  chunks: RetrievedChunk[];
  claims: VerifiableClaim[];
}

export async function runVerificationPipeline(
  input: VerificationPipelineInput
): Promise<VerificationPipelineResult> {
  const maxRetries = input.maxRetries ?? 1;
  let nodes = input.nodes;
  let chunks = input.chunks;
  let claims = input.claims;
  let retryCount = 0;
  const trace: string[] = [];

  if (!claims.length) {
    return {
      available: false,
      retried: false,
      decision: "continue",
      results: [],
      summary: summarizeVerification([]),
      trace: ["No structured claims were available; raw chunks remain the grounding source."],
      nodes,
      chunks,
      claims,
    };
  }

  let results = await verifyClaimsAgainstChunks(claims, chunks);
  let summary = summarizeVerification(results);
  trace.push(
    `Initial verification: supported=${summary.supported}, contradicted=${summary.contradicted}, insufficient=${summary.insufficient}, score=${summary.calibratedScore.toFixed(3)}.`
  );

  if (shouldRetryVerification(summary, retryCount, maxRetries)) {
    retryCount += 1;
    const retryQuery = buildVerificationRetryQuery(input.originalQuery, results);
    const retrieval = await retrieveHybrid(retryQuery, 20);
    nodes = mergeById(nodes, retrieval.nodes);
    chunks = mergeById(chunks, retrieval.chunks);

    try {
      claims = (await fetchEvidenceForChunks(chunks.map((chunk) => chunk.id))) as VerifiableClaim[];
    } catch {
      // If evidence tables are unavailable, retain the previous structured claims and
      // still let the raw new chunks contribute to claim verification.
    }

    results = await verifyClaimsAgainstChunks(claims, chunks);
    summary = summarizeVerification(results);
    trace.push(
      `Verification retry '${retryQuery}' produced ${retrieval.chunks.length} chunks; supported=${summary.supported}, contradicted=${summary.contradicted}, insufficient=${summary.insufficient}, score=${summary.calibratedScore.toFixed(3)}.`
    );
  }

  const decision = shouldAbstainAfterVerification(summary) ? "abstain" : "continue";
  trace.push(
    decision === "abstain"
      ? "Verification policy selected abstention after bounded retry."
      : "Verification policy accepted the supported claim subset for synthesis."
  );

  return {
    available: true,
    retried: retryCount > 0,
    decision,
    results,
    summary,
    trace,
    nodes,
    chunks,
    claims,
  };
}
