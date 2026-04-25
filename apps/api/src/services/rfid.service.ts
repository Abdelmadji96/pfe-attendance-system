import { rfidRepository } from "../repositories/rfid.repository";
import { userRepository } from "../repositories/user.repository";
import { ApiError } from "../utils/api-error";
import { mapUserToDto } from "./user.service";

export const rfidService = {
  async scan(uid: string) {
    const card = await rfidRepository.findByUid(uid);

    if (!card) {
      return { found: false, user: null, message: "Card not registered" };
    }

    if (!card.isActive) {
      return { found: false, user: null, message: "Card is deactivated" };
    }

    return {
      found: true,
      user: mapUserToDto(card.user),
      message: "Card found",
    };
  },

  async assign(uid: string, userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound("User not found");

    const existingCard = await rfidRepository.findByUid(uid);
    if (existingCard && existingCard.userId !== userId) {
      throw ApiError.conflict("RFID card is already assigned to another user");
    }

    const card = await rfidRepository.assign(uid, userId);
    return {
      card: {
        id: card.id,
        uid: card.uid,
        isActive: card.isActive,
        assignedAt: card.assignedAt.toISOString(),
      },
      user: mapUserToDto(card.user),
    };
  },

  async getUserByUid(uid: string) {
    const card = await rfidRepository.findByUid(uid);
    if (!card) throw ApiError.notFound("Card not found");
    return mapUserToDto(card.user);
  },
};
