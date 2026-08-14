/**
 * Tournament Service
 * Handles all tournament-related business logic
 */

import { Types } from "mongoose";
import Tournament from "../models/tournament.model";
import { getIO } from "../socket";
/**
 * Generate a unique invite code
 */
const generateInviteCode = (): string => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();

  return `${randomPart}${timePart}`;
};

/**
 * Generate unique invite code and ensure no duplicates
 */
const generateUniqueInviteCode = async (): Promise<string> => {
  let inviteCode: string;
  let exists = true;

  while (exists) {
    inviteCode = generateInviteCode();
    exists = !!(await Tournament.exists({ inviteCode }));
  }

  return inviteCode!;
};

/**
 * Check if user is tournament creator
 */
const isTournamentCreator = (
  createdBy: Types.ObjectId | string,
  userId: string
): boolean => createdBy.toString() === userId;

/**
 * Validate ObjectId
 */
const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

/**
 * Shuffle array utility
 */
const shuffleArray = <T>(arr: T[]): T[] => {
  const shuffled = [...arr];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

/**
 * Calculate advancing participants for next round
 */
const getAdvancingCount = (playerCount: number): number => {
  if (playerCount <= 3) return 0;
  if (playerCount <= 6) return Math.ceil(playerCount / 2);

  return 4;
};

/**
 * Join tournament with validation
 */
export const joinTournament = async (
  tournamentId: string,
  userId: string,
  walletService: any
): Promise<any> => {
  if (!isValidObjectId(tournamentId)) {
    throw { status: 400, message: "Invalid tournament ID" };
  }

  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    throw { status: 404, message: "Tournament not found" };
  }

  if (tournament.status !== "open") {
    throw { status: 400, message: "Tournament is not open for joining" };
  }

  const userObjectId = new Types.ObjectId(userId);

  const alreadyJoined = tournament.participants.some((participantId) =>
    participantId.equals(userObjectId)
  );

  if (alreadyJoined) {
    throw { status: 400, message: "User already joined this tournament" };
  }

  if (tournament.participants.length >= tournament.maxParticipants) {
    throw { status: 400, message: "Tournament is full" };
  }

  if (tournament.entryFee > 0) {
    await walletService.deductBalance(
      userId,
      tournament.entryFee,
      "entry_fee",
      tournamentId
    );

    tournament.prizePool = (tournament.prizePool || 0) + tournament.entryFee;
  }

  tournament.participants.push(userObjectId);
  tournament.participantCount = tournament.participants.length;

  await tournament.save();

  const io = getIO();

  if (io) {
    io.to(`tournament:${tournamentId}`).emit("tournament:participant-added", {
      participant: { _id: userId },
      participantCount: tournament.participantCount,
      maxParticipants: tournament.maxParticipants
    });
  }

  return tournament;
};

/**
 * Join tournament by invite code
 */
export const joinTournamentByInvite = async (
  inviteCode: string,
  userId: string,
  privatePassword: string | undefined,
  walletService: any
): Promise<any> => {
  const tournament = await Tournament.findOne({ inviteCode });

  if (!tournament) {
    throw { status: 404, message: "Tournament not found" };
  }

  if (tournament.isPrivate && tournament.privatePassword !== privatePassword) {
    throw { status: 403, message: "Invalid tournament password" };
  }

  if (tournament.status !== "open") {
    throw { status: 400, message: "Tournament is not open for joining" };
  }

  const userObjectId = new Types.ObjectId(userId);

  const alreadyJoined = tournament.participants.some((participantId) =>
    participantId.equals(userObjectId)
  );

  if (alreadyJoined) {
    throw { status: 400, message: "User already joined this tournament" };
  }

  if (tournament.participants.length >= tournament.maxParticipants) {
    throw { status: 400, message: "Tournament is full" };
  }

  if (tournament.entryFee > 0) {
    await walletService.deductBalance(
      userId,
      tournament.entryFee,
      "entry_fee",
      tournament._id.toString()
    );

    tournament.prizePool = (tournament.prizePool || 0) + tournament.entryFee;
  }

  tournament.participants.push(userObjectId);
  tournament.participantCount = tournament.participants.length;

  await tournament.save();

  const io = getIO();
  const tournamentId = tournament._id.toString();

  if (io) {
    io.to(`tournament:${tournamentId}`).emit("tournament:participant-added", {
      participant: { _id: userId },
      participantCount: tournament.participantCount,
      maxParticipants: tournament.maxParticipants
    });
  }

  return tournament;
};

/**
 * Get tournament by invite code
 */
export const getTournamentByInviteCode = async (
  inviteCode: string
): Promise<any> => {
  const tournament = await Tournament.findOne({ inviteCode })
    .select("-privatePassword")
    .populate("createdBy", "username fullName")
    .lean();

  if (!tournament) {
    throw { status: 404, message: "Tournament not found" };
  }

  return tournament;
};

/**
 * Get invite link details
 */
export const getInviteLink = async (
  tournamentId: string,
  userId: string
): Promise<any> => {
  if (!isValidObjectId(tournamentId)) {
    throw { status: 400, message: "Invalid tournament ID" };
  }

  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    throw { status: 404, message: "Tournament not found" };
  }

  if (!isTournamentCreator(tournament.createdBy, userId)) {
    throw {
      status: 403,
      message: "Only tournament creator can access invite link"
    };
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const inviteLink = `${clientUrl}/tournaments/join/${tournament.inviteCode}`;

  return {
    inviteCode: tournament.inviteCode,
    inviteLink,
    isPrivate: tournament.isPrivate,
    hasPassword: !!tournament.privatePassword
  };
};

/**
 * Regenerate invite code
 */
export const regenerateInviteCode = async (
  tournamentId: string,
  userId: string
): Promise<any> => {
  if (!isValidObjectId(tournamentId)) {
    throw { status: 400, message: "Invalid tournament ID" };
  }

  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    throw { status: 404, message: "Tournament not found" };
  }

  if (!isTournamentCreator(tournament.createdBy, userId)) {
    throw {
      status: 403,
      message: "Only tournament creator can regenerate invite code"
    };
  }

  const newInviteCode = await generateUniqueInviteCode();

  tournament.inviteCode = newInviteCode;
  await tournament.save();

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const inviteLink = `${clientUrl}/tournaments/join/${newInviteCode}`;

  return {
    inviteCode: newInviteCode,
    inviteLink
  };
};

/**
 * Open tournament creator only
 */
export const openTournament = async (
  tournamentId: string,
  userId: string
): Promise<any> => {
  if (!isValidObjectId(tournamentId)) {
    throw { status: 400, message: "Invalid tournament ID" };
  }

  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    throw { status: 404, message: "Tournament not found" };
  }

  if (!isTournamentCreator(tournament.createdBy, userId)) {
    throw {
      status: 403,
      message: "Only tournament creator can open tournament"
    };
  }

  if (tournament.status !== "draft") {
    throw { status: 400, message: "Tournament is not in draft status" };
  }

  tournament.status = "open";
  await tournament.save();

  const io = getIO();

  if (io) {
    io.emit("tournament:opened", {
      tournamentId,
      status: "open"
    });
  }

  return tournament;
};

export const TournamentService = {
  joinTournament,
  joinTournamentByInvite,
  getTournamentByInviteCode,
  getInviteLink,
  regenerateInviteCode,
  openTournament,
  generateUniqueInviteCode,
  getAdvancingCount,
  shuffleArray,
  isValidObjectId,
  isTournamentCreator
};