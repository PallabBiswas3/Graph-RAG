import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("GOOGLE_API_KEY is not set.");
}

const genAI = new GoogleGenerativeAI(apiKey);
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSION = 768;

function normalizeEmbedding(values: number[]): number[] {
  if (values.length < EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding model returned ${values.length} dimensions; expected at least ${EMBEDDING_DIMENSION}.`
    );
  }

  // gemini-embedding-001 uses Matryoshka embeddings. Keep the first 768
  // dimensions to remain compatible with the existing Supabase vector(768)
  // schema, then normalize the truncated vector for cosine retrieval.
  const truncated = values.slice(0, EMBEDDING_DIMENSION);
  const norm = Math.sqrt(truncated.reduce((sum, value) => sum + value * value, 0));

  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error("Embedding model returned an invalid zero-norm vector.");
  }

  return truncated.map((value) => value / norm);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return normalizeEmbedding(result.embedding.values);
}
