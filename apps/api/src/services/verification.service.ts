import { rfidRepository } from "../repositories/rfid.repository";
import { faceRepository } from "../repositories/face.repository";
import { moduleRepository } from "../repositories/module.repository";
import { attendanceRepository } from "../repositories/attendance.repository";
import { faceVerificationService } from "../utils/face-verification";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { mapUserToDto } from "./user.service";
import { ApiError } from "../utils/api-error";
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

function buildSessionInfo(session: NonNullable<Awaited<ReturnType<typeof moduleRepository.findActiveSession>>>): SessionInfo {
  return {
    moduleId: session.module.id,
    moduleName: session.module.name,
    moduleCode: session.module.code,
    sessionId: session.id,
    roomName: session.module.room?.name || null,
    startTime: session.startTime,
    endTime: session.endTime,
  };
}

export const verificationService = {
  async verify(rfidUid: string, liveImageBase64?: string): Promise<VerificationResponse> {
    const liveEmbedding = await faceVerificationService.generateEmbedding(
      liveImageBase64 || "mock"
    );
    return verifyWithEmbedding(rfidUid, liveEmbedding);
  },

  async gateVerify(rfidUid: string, liveEmbedding: number[]): Promise<VerificationResponse> {
    if (liveEmbedding.length !== env.EMBEDDING_DIMENSION) {
      throw ApiError.badRequest(
        `Invalid embedding dimension: expected ${env.EMBEDDING_DIMENSION}, got ${liveEmbedding.length}`
      );
    }
    return verifyWithEmbedding(rfidUid, liveEmbedding);
  },

  async mockEntry(rfidUid: string, simulateMatch: boolean): Promise<VerificationResponse> {
    const card = await rfidRepository.findByUid(rfidUid);

    if (!card || !card.isActive) {
      await createAccessLog({
        rfidUid, userId: null, result: VerificationResult.UNKNOWN_CARD,
        reason: "Card not registered", score: null,
        led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
      });
      return {
        userFound: false, user: null, similarityScore: null,
        verificationResult: "UNKNOWN_CARD" as any,
        ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
        doorUnlocked: false, attendanceMarked: false, sessionInfo: null,
        message: "Card not found.",
      };
    }

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
        sessionInfo = buildSessionInfo(session);
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
      writeAttendance: simulateMatch && sessionId !== null,
    });

    return {
      userFound: true, user: mapUserToDto(card.user), similarityScore: roundedScore,
      verificationResult: result as any,
      ledFeedback: (simulateMatch ? "GREEN" : "RED") as any,
      buzzerFeedback: (simulateMatch ? "SHORT_BEEP" : "LONG_BEEP") as any,
      doorUnlocked: simulateMatch, attendanceMarked: simulateMatch && sessionId !== null, sessionInfo,
      message: simulateMatch ? "Mock verification successful." : "Mock verification failed.",
    };
  },
};

async function resolveActiveSession(user: { classGroupId: string | null }) {
  if (!user.classGroupId) {
    return null;
  }

  const dayOfWeek = new Date().getDay();
  const currentTime = currentTimeHHMM();
  return moduleRepository.findActiveSession(user.classGroupId, dayOfWeek, currentTime);
}

async function verifyWithEmbedding(
  rfidUid: string,
  liveEmbedding: number[]
): Promise<VerificationResponse> {
  const card = await rfidRepository.findByUid(rfidUid);

  if (!card || !card.isActive) {
    await createAccessLog({
      rfidUid, userId: null, result: VerificationResult.UNKNOWN_CARD,
      reason: "Card not registered in system", score: null,
      led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
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
  const session = await resolveActiveSession(user);

  if (!session) {
    await createAccessLog({
      rfidUid, userId: user.id, result: VerificationResult.NO_SESSION,
      reason: "No module session scheduled at this time for this class",
      score: null, led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
    });
    return {
      userFound: true, user: mapUserToDto(user), similarityScore: null,
      verificationResult: "NO_SESSION" as any,
      ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
      doorUnlocked: false, attendanceMarked: false, sessionInfo: null,
      message: "No module scheduled now for your class.",
    };
  }

  const sessionInfo = buildSessionInfo(session);
  const activeModuleId = session.moduleId;
  const activeSessionId = session.id;

  const templates = await faceRepository.findByUserId(user.id);

  if (templates.length === 0) {
    await createAccessLog({
      rfidUid, userId: user.id, result: VerificationResult.NO_FACE,
      reason: "No face templates enrolled", score: null,
      led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
    });
    return {
      userFound: true, user: mapUserToDto(user), similarityScore: null,
      verificationResult: "NO_FACE" as any,
      ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
      doorUnlocked: false, attendanceMarked: false, sessionInfo,
      message: "No face templates enrolled. Please enroll face first.",
    };
  }

  const storedEmbeddings = templates.map((t) => t.embedding as number[]);
  const { match, score } = faceVerificationService.verify(liveEmbedding, storedEmbeddings);

  if (!match) {
    await createAccessLog({
      rfidUid, userId: user.id, result: VerificationResult.MISMATCH,
      reason: `Face mismatch (score: ${score})`, score,
      led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
    });
    return {
      userFound: true, user: mapUserToDto(user), similarityScore: score,
      verificationResult: "MISMATCH" as any,
      ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
      doorUnlocked: false, attendanceMarked: false, sessionInfo,
      message: "Face mismatch. Access denied.",
    };
  }

  const existing = await attendanceRepository.findPresentForSessionToday(
    user.id,
    activeSessionId
  );

  if (existing) {
    await createAccessLog({
      rfidUid, userId: user.id, result: VerificationResult.ALREADY_CHECKED_IN,
      reason: `Already checked in for ${session.module.name} (${session.startTime}-${session.endTime})`,
      score, led: LedFeedback.RED, buzzer: BuzzerFeedback.LONG_BEEP, door: false,
    });
    return {
      userFound: true, user: mapUserToDto(user), similarityScore: score,
      verificationResult: "ALREADY_CHECKED_IN" as any,
      ledFeedback: "RED" as any, buzzerFeedback: "LONG_BEEP" as any,
      doorUnlocked: false, attendanceMarked: false, sessionInfo,
      message: `Already checked in for ${session.module.name} today.`,
    };
  }

  await createLogs({
    rfidUid, userId: user.id, result: VerificationResult.MATCH,
    reason: "Face verification successful", score,
    led: LedFeedback.GREEN, buzzer: BuzzerFeedback.SHORT_BEEP, door: true,
    attendanceStatus: AttendanceStatus.PRESENT,
    moduleId: activeModuleId, sessionId: activeSessionId,
    writeAttendance: true,
  });

  return {
    userFound: true, user: mapUserToDto(user), similarityScore: score,
    verificationResult: "MATCH" as any,
    ledFeedback: "GREEN" as any, buzzerFeedback: "SHORT_BEEP" as any,
    doorUnlocked: true, attendanceMarked: true, sessionInfo,
    message: "Verification successful. Welcome!",
  };
}

async function createAccessLog(params: {
  rfidUid: string; userId: string | null; result: VerificationResult;
  reason: string; score: number | null; led: LedFeedback; buzzer: BuzzerFeedback;
  door: boolean;
}) {
  await prisma.accessLog.create({
    data: {
      userId: params.userId, rfidUid: params.rfidUid,
      result: params.result, reason: params.reason,
      ledFeedback: params.led, buzzerFeedback: params.buzzer,
      doorUnlocked: params.door, similarityScore: params.score,
    },
  });
}

async function createLogs(params: {
  rfidUid: string; userId: string | null; result: VerificationResult;
  reason: string; score: number | null; led: LedFeedback; buzzer: BuzzerFeedback;
  door: boolean; attendanceStatus: AttendanceStatus;
  moduleId: string | null; sessionId: string | null;
  writeAttendance?: boolean;
}) {
  const ops = [
    prisma.accessLog.create({
      data: {
        userId: params.userId, rfidUid: params.rfidUid,
        result: params.result, reason: params.reason,
        ledFeedback: params.led, buzzerFeedback: params.buzzer,
        doorUnlocked: params.door, similarityScore: params.score,
      },
    }),
  ];

  if (params.writeAttendance !== false && params.sessionId) {
    ops.push(
      prisma.attendanceLog.create({
        data: {
          userId: params.userId, rfidUid: params.rfidUid,
          status: params.attendanceStatus, verificationResult: params.result,
          similarityScore: params.score,
          moduleId: params.moduleId, moduleSessionId: params.sessionId,
        },
      })
    );
  }

  await prisma.$transaction(ops);
}
