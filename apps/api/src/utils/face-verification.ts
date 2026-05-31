import fs from "fs";
import path from "path";
import { env } from "../config/env";

/**
 * Face verification — embeddings from Pi FaceNet service when configured.
 */

export interface IFaceVerificationService {
  generateEmbedding(imagePath: string): Promise<number[]>;
  compareEmbeddings(a: number[], b: number[]): number;
  verify(liveEmbedding: number[], storedEmbeddings: number[][]): { match: boolean; score: number };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

function generateMockEmbedding(dim: number = env.EMBEDDING_DIMENSION): number[] {
  const embedding = Array.from({ length: dim }, () => Math.random() * 2 - 1);
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => v / norm);
}

async function embedViaPiService(imagePath: string): Promise<number[]> {
  const url = env.FACE_EMBED_SERVICE_URL;
  if (!url) {
    throw new Error("FACE_EMBED_SERVICE_URL is not configured");
  }

  const absolutePath = path.isAbsolute(imagePath)
    ? imagePath
    : path.resolve(process.cwd(), imagePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Image file not found: ${absolutePath}`);
  }

  const buffer = fs.readFileSync(absolutePath);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: buffer,
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot reach face embedding service (${url}): ${cause}. ` +
        "The API server must be able to reach FACE_EMBED_SERVICE_URL (not a private Pi IP from a remote VPS). " +
        "Run face_embed_server.py on the API host or expose the Pi embed port with a public/tunnel URL."
    );
  }

  const body = (await response.json()) as {
    success?: boolean;
    embedding?: number[];
    message?: string;
  };

  if (!response.ok) {
    throw new Error(body.message || `Embed service HTTP ${response.status}`);
  }

  if (!body.embedding?.length) {
    throw new Error(body.message || "Embed service returned no embedding");
  }

  if (body.embedding.length !== env.EMBEDDING_DIMENSION) {
    throw new Error(
      `Embed dimension mismatch: expected ${env.EMBEDDING_DIMENSION}, got ${body.embedding.length}`
    );
  }

  return body.embedding;
}

export const faceVerificationService: IFaceVerificationService = {
  async generateEmbedding(imagePath: string): Promise<number[]> {
    if (env.FACE_EMBED_SERVICE_URL) {
      return embedViaPiService(imagePath);
    }

    console.warn(
      "[face-verification] FACE_EMBED_SERVICE_URL not set — using mock embedding. " +
        "Gate verification will fail until Pi embed server is configured."
    );
    return generateMockEmbedding();
  },

  compareEmbeddings(a: number[], b: number[]): number {
    return cosineSimilarity(a, b);
  },

  verify(
    liveEmbedding: number[],
    storedEmbeddings: number[][]
  ): { match: boolean; score: number } {
    if (storedEmbeddings.length === 0) {
      return { match: false, score: 0 };
    }

    const scores = storedEmbeddings.map((stored) =>
      cosineSimilarity(liveEmbedding, stored)
    );
    const maxScore = Math.max(...scores);

    return {
      match: maxScore >= env.SIMILARITY_THRESHOLD,
      score: Math.round(maxScore * 10000) / 10000,
    };
  },
};
