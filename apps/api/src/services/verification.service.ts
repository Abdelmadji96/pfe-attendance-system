import { rfidRepository } from "../repositories/rfid.repository";
import { faceRepository } from "../repositories/face.repository";
import { moduleRepository } from "../repositories/module.repository";
import { faceVerificationService } from "../utils/face-verification";
import { prisma } from "../config/prisma";
import { mapUserToDto } from "./user.service";
import {
  VerificationResult,
  AttendanceStatus,
  LedFeedback,
  BuzzerFeedback,
} from "@prisma/client";
import type { VerificationResponse, SessionInfo } from "@pfe/shared";

function currentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export const verificationService = {
  async verify(rfidUid: string, liveImageBase64?: string): Promise<VerificationResponse> {
    const card = await rfidRepository.findByUid(rfidUid);

    if (!card || !card.isActive) {
      await createLogs({
        rfidUid, userId: null, result: VerificationResult.UNKNOWN_CARD,
        reason: "Card not registered in system", score: null,
        led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
        attendanceStatus: AttendanceStatus.FAILED, moduleId: null, sessionId: null,
      });
      return {
        userFound: false, user: null, similarityScore: null,
        verificationResult: "UNKNOWN_CARD" as any,
        ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
        doorUnlocked: false, attendanceMarked: false, sessionInfo: null,
        message: "Card not found. Access denied.",
      };
    }

    const user = card.user;

    // Session check: find active session for the student's class group
    let sessionInfo: SessionInfo | null = null;
    let activeModuleId: string | null = null;
    let activeSessionId: string | null = null;

    if (user.classGroupId) {
      const dayOfWeek = new Date().getDay();
      const currentTime = currentTimeHHMM();
      const session = await moduleRepository.findActiveSession(user.classGroupId, dayOfWeek, currentTime);

      if (!session) {
        await createLogs({
          rfidUid, userId: user.id, result: VerificationResult.NO_SESSION,
          reason: "No module session scheduled at this time for this class",
          score: null, led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP,
          door: false, attendanceStatus: AttendanceStatus.FAILED,
          moduleId: null, sessionId: null,
        });
        return {
          userFound: true, user: mapUserToDto(user), similarityScore: null,
          verificationResult: "NO_SESSION" as any,
          ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
          doorUnlocked: false, attendanceMarked: false, sessionInfo: null,
          message: "No module scheduled now for your class.",
        };
      }

      activeModuleId = session.moduleId;
      activeSessionId = session.id;
      sessionInfo = {
        moduleId: session.module.id,
        moduleName: session.module.name,
        moduleCode: session.module.code,
        sessionId: session.id,
        roomName: session.module.room?.name || null,
        startTime: session.startTime,
        endTime: session.endTime,
      };
    }

    const templates = await faceRepository.findByUserId(user.id);

    if (templates.length === 0) {
      await createLogs({
        rfidUid, userId: user.id, result: VerificationResult.NO_FACE,
        reason: "No face templates enrolled", score: null,
        led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
        attendanceStatus: AttendanceStatus.FAILED,
        moduleId: activeModuleId, sessionId: activeSessionId,
      });
      return {
        userFound: true, user: mapUserToDto(user), similarityScore: null,
        verificationResult: "NO_FACE" as any,
        ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
        doorUnlocked: false, attendanceMarked: false, sessionInfo,
        message: "No face templates enrolled. Please enroll face first.",
      };
    }

    const liveEmbedding = await faceVerificationService.generateEmbedding(liveImageBase64 || "mock");
    const storedEmbeddings = templates.map((t) => t.embedding as number[]);
    const { match, score } = faceVerificationService.verify(liveEmbedding, storedEmbeddings);

    if (match) {
      await createLogs({
        rfidUid, userId: user.id, result: VerificationResult.MATCH,
        reason: "Face verification successful", score,
        led: LedFeedback.GREEN, buzzer: BuzzerFeedback.SHORT_BEEP, door: true,
        attendanceStatus: AttendanceStatus.PRESENT,
        moduleId: activeModuleId, sessionId: activeSessionId,
      });
      return {
        userFound: true, user: mapUserToDto(user), similarityScore: score,
        verificationResult: "MATCH" as any,
        ledFeedback: "GREEN" as any, buzzerFeedback: "SHORT_BEEP" as any,
        doorUnlocked: true, attendanceMarked: true, sessionInfo,
        message: "Verification successful. Welcome!",
      };
    }

    await createLogs({
      rfidUid, userId: user.id, result: VerificationResult.MISMATCH,
      reason: `Face mismatch (score: ${score})`, score,
      led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
      attendanceStatus: AttendanceStatus.FAILED,
      moduleId: activeModuleId, sessionId: activeSessionId,
    });
    return {
      userFound: true, user: mapUserToDto(user), similarityScore: score,
      verificationResult: "MISMATCH" as any,
      ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
      doorUnlocked: false, attendanceMarked: false, sessionInfo,
      message: "Face mismatch. Access denied.",
    };
  },

  async mockEntry(rfidUid: string, simulateMatch: boolean): Promise<VerificationResponse> {
    const card = await rfidRepository.findByUid(rfidUid);

    if (!card || !card.isActive) {
      await createLogs({
        rfidUid, userId: null, result: VerificationResult.UNKNOWN_CARD,
        reason: "Card not registered", score: null,
        led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
        attendanceStatus: AttendanceStatus.FAILED, moduleId: null, sessionId: null,
      });
      return {
        userFound: false, user: null, similarityScore: null,
        verificationResult: "UNKNOWN_CARD" as any,
        ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
        doorUnlocked: false, attendanceMarked: false, sessionInfo: null,
        message: "Card not found.",
      };
    }

    // Find any active session for mock
    let sessionInfo: SessionInfo | null = null;
    let moduleId: string | null = null;
    let sessionId: string | null = null;

    if (card.user.classGroupId) {
      const dayOfWeek = new Date().getDay();
      const currentTime = currentTimeHHMM();
      const session = await moduleRepository.findActiveSession(card.user.classGroupId, dayOfWeek, currentTime);
      if (session) {
        moduleId = session.moduleId;
        sessionId = session.id;
        sessionInfo = {
          moduleId: session.module.id,
          moduleName: session.module.name,
          moduleCode: session.module.code,
          sessionId: session.id,
          roomName: session.module.room?.name || null,
          startTime: session.startTime,
          endTime: session.endTime,
        };
      }
    }

    const score = simulateMatch ? 0.85 + Math.random() * 0.14 : 0.3 + Math.random() * 0.4;
    const roundedScore = Math.round(score * 10000) / 10000;
    const result = simulateMatch ? VerificationResult.MATCH : VerificationResult.MISMATCH;

    await createLogs({
      rfidUid, userId: card.user.id, result,
      reason: simulateMatch ? "Mock: Successful match" : "Mock: Face mismatch",
      score: roundedScore,
      led: simulateMatch ? LedFeedback.GREEN : LedFeedback.RED,
      buzzer: simulateMatch ? BuzzerFeedback.SHORT_BEEP : BuzzerFeedback.LONG_BEEP,
      door: simulateMatch,
      attendanceStatus: simulateMatch ? AttendanceStatus.PRESENT : AttendanceStatus.FAILED,
      moduleId, sessionId,
    });

    return {
      userFound: true, user: mapUserToDto(card.user), similarityScore: roundedScore,
      verificationResult: result as any,
      ledFeedback: (simulateMatch ? "GREEN" : "RED") as any,
      buzzerFeedback: (simulateMatch ? "SHORT_BEEP" : "LONG_BEEP") as any,
      doorUnlocked: simulateMatch, attendanceMarked: simulateMatch, sessionInfo,
      message: simulateMatch ? "Mock verification successful." : "Mock verification failed.",
    };
  },
};

async function createLogs(params: {
  rfidUid: string; userId: string | null; result: VerificationResult;
  reason: string; score: number | null; led: LedFeedback; buzzer: BuzzerFeedback;
  door: boolean; attendanceStatus: AttendanceStatus;
  moduleId: string | null; sessionId: string | null;
}) {
  await prisma.$transaction([
    prisma.attendanceLog.create({
      data: {
        userId: params.userId, rfidUid: params.rfidUid,
        status: params.attendanceStatus, verificationResult: params.result,
        similarityScore: params.score,
        moduleId: params.moduleId, moduleSessionId: params.sessionId,
      },
    }),
    prisma.accessLog.create({
      data: {
        userId: params.userId, rfidUid: params.rfidUid,
        result: params.result, reason: params.reason,
        ledFeedback: params.led, buzzerFeedback: params.buzzer,
        doorUnlocked: params.door, similarityScore: params.score,
      },
    }),
  ]);
}
