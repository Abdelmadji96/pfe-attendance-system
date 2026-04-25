import { faceRepository } from "../repositories/face.repository";
import { userRepository } from "../repositories/user.repository";
import { faceVerificationService } from "../utils/face-verification";
import { ApiError } from "../utils/api-error";
import { MAX_FACE_IMAGES } from "@pfe/shared";

export const faceService = {
  async enroll(userId: string, files: Express.Multer.File[]) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound("User not found");

    const existingCount = await faceRepository.countByUserId(userId);
    const totalAfter = existingCount + files.length;

    if (totalAfter > MAX_FACE_IMAGES) {
      throw ApiError.badRequest(
        `Maximum ${MAX_FACE_IMAGES} face images allowed. Current: ${existingCount}, uploading: ${files.length}`
      );
    }

    const templates = await Promise.all(
      files.map(async (file) => {
        const embedding = await faceVerificationService.generateEmbedding(file.path);
        return {
          userId,
          embedding,
          imagePath: file.path.replace(/\\/g, "/"),
          qualityScore: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
        };
      })
    );

    await faceRepository.createMany(templates);

    const allTemplates = await faceRepository.findByUserId(userId);

    return {
      enrolled: files.length,
      total: allTemplates.length,
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
