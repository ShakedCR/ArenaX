/**
 * Tournament Service
 * Handles all tournament-related business logic
 */

import { Types } from 'mongoose';
import Tournament from '../models/tournament.model';
import User from '../models/user.model';
import Transaction from '../models/transaction.model';
import Match from '../models/match.model';
import BlackjackGameStateModel from '../models/blackjack-game-state.model';
import { blackjackEngine } from '../games/blackjack.engine';
import { getIO } from '../socket';
import QRCode from 'qrcode';

/**
 * Generate a unique 8-character invite code
 */
const generateInviteCode = (): string => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  return `${randomPart}${timePart}`;
};

/**
 * Generate unique invite code (ensures no duplicates)
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
 * Generate QR code data URL
 */
const generateQRCode = async (url: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H' as const,
      margin: 1,
      width: 300
    });
    return qrDataUrl as string;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Check if user is tournament creator
 */
const isTournamentCreator = (createdBy: Types.ObjectId | string, userId: string): boolean =>
  createdBy.toString() === userId;

/**
 * Validate ObjectId
 */
const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

/**
 * Shuffle array utility
 */
const shuffleArray = <T>(arr: T[]): T[] => {
  const d = [...arr];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
};

/**
 * Create a blackjack game for tournament
 */
const createBlackjackGame = async (
  tournamentId: Types.ObjectId,
  playerIds: string[],
  stage: number
): Promise<{ matchId: string; gameId: string }> => {
  const users = await User.find({ _id: { $in: playerIds } })
    .select('_id username fullName')
    .lean() as { _id: Types.ObjectId; username?: string; fullName?: string }[];

  const players = playerIds.map(pid => {
    const u = users.find(u => u._id.toString() === pid);
    return { id: pid, name: u?.username || u?.fullName || pid };
  });

  // Create match document
  const match = await Match.create({
    tournament: tournamentId,
    gameTitle: 'Blackjack',
    round: stage,
    participants: playerIds.map(id => new Types.ObjectId(id)),
    status: 'live',
    startedAt: new Date(),
  });

  const gameId = (match._id as Types.ObjectId).toString();

  // Initialize engine
  blackjackEngine.createGame(gameId, players);
  const state = blackjackEngine.startBettingPhase(gameId);

  await BlackjackGameStateModel.findOneAndUpdate(
    { gameId },
    {
      $set: {
        status: 'active',
        stateSnapshot: state,
        leaderboard: blackjackEngine.getLeaderboard(gameId),
        lastAction: 'betting'
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Match.findByIdAndUpdate(match._id, { 'matchData.gameId': gameId });

  return { matchId: gameId, gameId };
};

/**
 * Calculate advancing participants for next round
 */
const getAdvancingCount = (playerCount: number): number => {
  if (playerCount <= 3) return 0; // single stage — no advancement needed
  if (playerCount <= 6) return Math.ceil(playerCount / 2);
  return 4;
};

/**
 * Join tournament (with validation)
 */
export const joinTournament = async (
  tournamentId: string,
  userId: string,
  walletService: any
): Promise<any> => {
  if (!isValidObjectId(tournamentId)) {
    throw { status: 400, message: 'Invalid tournament ID' };
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw { status: 404, message: 'Tournament not found' };
  }

  if (tournament.status !== 'open') {
    throw { status: 400, message: 'Tournament is not open for joining' };
  }

  if (tournament.participants.includes(new Types.ObjectId(userId))) {
    throw { status: 400, message: 'User already joined this tournament' };
  }

  if (tournament.participants.length >= tournament.maxParticipants) {
    throw { status: 400, message: 'Tournament is full' };
  }

  // Handle entry fee if applicable
  if (tournament.entryFee > 0) {
    await walletService.deductBalance(userId, tournament.entryFee, 'entry_fee', tournamentId);
    tournament.prizePool = (tournament.prizePool || 0) + tournament.entryFee;
  }

  tournament.participants.push(new Types.ObjectId(userId));
  tournament.participantCount = tournament.participants.length;
  await tournament.save();

  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(`tournament:${tournamentId}`).emit('tournament:participant-added', {
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
    throw { status: 404, message: 'Tournament not found' };
  }

  if (tournament.isPrivate && tournament.privatePassword !== privatePassword) {
    throw { status: 403, message: 'Invalid tournament password' };
  }

  if (tournament.status !== 'open') {
    throw { status: 400, message: 'Tournament is not open for joining' };
  }

  if (tournament.participants.includes(new Types.ObjectId(userId))) {
    throw { status: 400, message: 'User already joined this tournament' };
  }

  if (tournament.participants.length >= tournament.maxParticipants) {
    throw { status: 400, message: 'Tournament is full' };
  }

  // Handle entry fee if applicable
  if (tournament.entryFee > 0) {
    await walletService.deductBalance(userId, tournament.entryFee, 'entry_fee', tournament._id.toString());
    tournament.prizePool = (tournament.prizePool || 0) + tournament.entryFee;
  }

  tournament.participants.push(new Types.ObjectId(userId));
  tournament.participantCount = tournament.participants.length;
  await tournament.save();

  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(`tournament:${tournament._id.toString()}`).emit('tournament:participant-added', {
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
export const getTournamentByInviteCode = async (inviteCode: string): Promise<any> => {
  const tournament = await Tournament.findOne({ inviteCode })
    .select('-privatePassword')
    .populate('createdBy', 'username fullName')
    .lean();

  if (!tournament) {
    throw { status: 404, message: 'Tournament not found' };
  }

  return tournament;
};

/**
 * Get invite link details
 */
export const getInviteLink = async (tournamentId: string, userId: string): Promise<any> => {
  if (!isValidObjectId(tournamentId)) {
    throw { status: 400, message: 'Invalid tournament ID' };
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw { status: 404, message: 'Tournament not found' };
  }

  if (!isTournamentCreator(tournament.createdBy, userId)) {
    throw { status: 403, message: 'Only tournament creator can access invite link' };
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const inviteLink = `${clientUrl}/tournaments/join/${tournament.inviteCode}`;

  // Generate QR code
  const qrImage = await generateQRCode(inviteLink);

  return {
    inviteCode: tournament.inviteCode,
    inviteLink,
    qrImage,
    isPrivate: tournament.isPrivate,
    hasPassword: !!tournament.privatePassword
  };
};

/**
 * Regenerate invite code
 */
export const regenerateInviteCode = async (tournamentId: string, userId: string): Promise<any> => {
  if (!isValidObjectId(tournamentId)) {
    throw { status: 400, message: 'Invalid tournament ID' };
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw { status: 404, message: 'Tournament not found' };
  }

  if (!isTournamentCreator(tournament.createdBy, userId)) {
    throw { status: 403, message: 'Only tournament creator can regenerate invite code' };
  }

  const newInviteCode = await generateUniqueInviteCode();
  tournament.inviteCode = newInviteCode;
  await tournament.save();

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const inviteLink = `${clientUrl}/tournaments/join/${newInviteCode}`;
  const qrImage = await generateQRCode(inviteLink);

  return {
    inviteCode: newInviteCode,
    inviteLink,
    qrImage
  };
};

/**
 * Generate QR image for tournament
 */
export const getQRImage = async (tournamentId: string): Promise<string> => {
  if (!isValidObjectId(tournamentId)) {
    throw { status: 400, message: 'Invalid tournament ID' };
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw { status: 404, message: 'Tournament not found' };
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const inviteLink = `${clientUrl}/tournaments/join/${tournament.inviteCode}`;

  return generateQRCode(inviteLink);
};

/**
 * Open tournament (creator only)
 */
export const openTournament = async (tournamentId: string, userId: string): Promise<any> => {
  if (!isValidObjectId(tournamentId)) {
    throw { status: 400, message: 'Invalid tournament ID' };
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw { status: 404, message: 'Tournament not found' };
  }

  if (!isTournamentCreator(tournament.createdBy, userId)) {
    throw { status: 403, message: 'Only tournament creator can open tournament' };
  }

  if (tournament.status !== 'draft') {
    throw { status: 400, message: 'Tournament is not in draft status' };
  }

  tournament.status = 'open';
  await tournament.save();

  // Emit socket event
  const io = getIO();
  if (io) {
    io.emit('tournament:opened', { tournamentId, status: 'open' });
  }

  return tournament;
};

export const TournamentService = {
  joinTournament,
  joinTournamentByInvite,
  getTournamentByInviteCode,
  getInviteLink,
  regenerateInviteCode,
  getQRImage,
  openTournament,
  generateUniqueInviteCode,
  createBlackjackGame,
  getAdvancingCount,
  shuffleArray,
  isValidObjectId,
  isTournamentCreator
};
