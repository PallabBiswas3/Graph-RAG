import { ClaimVerification, VerificationSummary } from "./types";

export function summarizeVerification(results: ClaimVerification[]): VerificationSummary {
  const total = results.length;
  const supportedItems = results.filter((item) => item.label === "SUPPORTED");
  const contradicted = results.filter((item) => item.label === "CONTRADICTED").length;
  const insufficient = results.filter((item) => item.label === "INSUFFICIENT").length;
  const supported = supportedItems.length;
  const supportRatio = total ? supported / total : 0;
  const contradictionRatio = total ? contradicted / total : 0;
  const evidenceCoverage = total ? (supported + contradicted) / total : 0;
  const meanSupportedConfidence = supported
    ? supportedItems.reduce((sum, item) => sum + item.confidence, 0) / supported
    : 0;

  // Conservative selective-confidence score. It rewards supported coverage and
  // penalizes contradiction; it is not presented as a calibrated probability.
  const calibratedScore = Math.max(
    0,
    Math.min(1, supportRatio * meanSupportedConfidence * (1 - contradictionRatio))
  );

  return {
    total,
    supported,
    contradicted,
    insufficient,
    supportRatio,
    contradictionRatio,
    evidenceCoverage,
    meanSupportedConfidence,
    calibratedScore,
  };
}

export function shouldRetryVerification(
  summary: VerificationSummary,
  retryCount: number,
  maxRetries: number
): boolean {
  if (retryCount >= maxRetries || summary.total === 0) return false;
  return (
    summary.supported === 0 ||
    summary.supportRatio < 0.6 ||
    summary.insufficient > 0 ||
    summary.contradicted > 0
  );
}

export function shouldAbstainAfterVerification(summary: VerificationSummary): boolean {
  if (summary.total === 0) return false;
  if (summary.supported === 0) return true;
  if (summary.contradicted > summary.supported) return true;
  return summary.calibratedScore < 0.4;
}

export function buildVerificationRetryQuery(
  originalQuery: string,
  results: ClaimVerification[]
): string {
  const unresolved = results
    .filter((item) => item.label !== "SUPPORTED")
    .slice(0, 3)
    .map((item) => item.claimText)
    .join("; ");

  return unresolved
    ? `${originalQuery} corroborating source evidence for: ${unresolved}`
    : `${originalQuery} corroborating source evidence verification`;
}
