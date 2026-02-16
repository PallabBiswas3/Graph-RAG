import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function generateEmbedding(text: string) {
    const model = genAI.getGenerativeModel({
        model: "gemini-embedding-001",   // ✅ UPDATED MODEL
    });

    const result = await model.embedContent(text);

    return result.embedding.values;
}

