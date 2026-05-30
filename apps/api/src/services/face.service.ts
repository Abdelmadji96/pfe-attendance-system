import path from "path";
import { faceRepository } from "../repositories/face.repository";
import { userRepository } from "../repositories/user.repository";
import { faceVerificationService } from "../utils/face-verification";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import { MAX_FACE_IMAGES, MIN_FACE_IMAGES } from "@pfe/shared";

function toPublicImagePath(userId: string, filename: string): string {
  return `uploads/faces/${userId}/${filename}`;
}

export const faceService = {
  async enroll(userId: string, files: Express.Multer.File[]) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound("User not found");

    if (!env.FACE_EMBED_SERVICE_URL) {
      throw ApiError.internal(
        "Face embedding service is not configured. Set FACE_EMBED_SERVICE_URL to the Pi embed server " +
          "(e.g. http://192.168.1.10:5055/embed) and run: python face_embed_server.py"
      );
    }

    const existingCount = await faceRepository.countByUserId(userId);
    const totalAfter = existingCount + files.length;

    if (totalAfter > MAX_FACE_IMAGES) {
      throw ApiError.badRequest(
        `Maximum ${MAX_FACE_IMAGES} face images allowed. Current: ${existingCount}, uploading: ${files.length}`
      );
    }

    const templates: Array<{
      userId: string;
      embedding: number[];
      imagePath: string;
      qualityScore: number;
    }> = [];
    const skipped: Array<{ filename: string; reason: string }> = [];

    for (const file of files) {
      try {
        const embedding = await faceVerificationService.generateEmbedding(file.path);
        templates.push({
          userId,
          embedding,
          imagePath: toPublicImagePath(userId, path.basename(file.path)),
          qualityScore: 0.85,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Embedding failed";
        skipped.push({ filename: file.originalname, reason: message });
      }
    }

    const totalAfterSuccess = existingCount + templates.length;

    if (templates.length === 0) {
      const detail = skipped.map((item) => `${item.filename}: ${item.reason}`).join("; ");
      throw ApiError.badRequest(
        `No faces detected in uploaded images. ${detail}. ` +
          "Use clear front-facing photos with one visible face."
      );
    }

    if (totalAfterSuccess < MIN_FACE_IMAGES) {
      const detail = skipped.length
        ? ` Skipped: ${skipped.map((item) => item.filename).join(", ")}.`
        : "";
      throw ApiError.badRequest(
        `Only ${templates.length} of ${files.length} images had detectable faces ` +
          `(${totalAfterSuccess} total, need at least ${MIN_FACE_IMAGES}).${detail} ` +
          "Upload more clear front-facing photos."
      );
    }

    await faceRepository.createMany(templates);

    const allTemplates = await faceRepository.findByUserId(userId);

    return {
      enrolled: templates.length,
      skipped,
      total: allTemplates.length,
      embeddingDimension: env.EMBEDDING_DIMENSION,
      templates: allTemplates.map((t) => ({
        id: t.id,
        userId: t.userId,
        imagePath: t.imagePath,
        qualityScore: t.qualityScore,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  },

  async getTemplates(userId: string) {
    const templates = await faceRepository.findByUserId(userId);
    return templates.map((t) => ({
      id: t.id,
      userId: t.userId,
      imagePath: t.imagePath,
      qualityScore: t.qualityScore,
      createdAt: t.createdAt.toISOString(),
    }));
  },

  async deleteTemplate(templateId: string) {
    const template = await faceRepository.findById(templateId);
    if (!template) throw ApiError.notFound("Face template not found");
    await faceRepository.delete(templateId);
  },
};
