import { env } from "../config/env";

/**
 * Face Verification Service
 *
 * INTEGRATION POINT: Replace this mock implementation with a real
 * deep-learning model (e.g., a Python microservice using FaceNet/ArcFace
 * accessible via gRPC or HTTP). The interface remains the same.
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

export const faceVerificationService: IFaceVerificationService = {
  async generateEmbedding(_imagePath: string): Promise<number[]> {
    // INTEGRATION POINT: Call real model here
    // e.g., const response = await axios.post('http://face-model:8000/embed', { image_path: imagePath })
    // return response.data.embedding;
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
