/**
 * Wallet Service
 * Handles wallet and transaction operations
 */

import { Types } from 'mongoose';
import User from '../models/user.model';
import Transaction from '../models/transaction.model';
import { getIO } from '../socket';

/**
 * Get user wallet
 */
export const getWallet = async (userId: string): Promise<any> => {
  const user = await User.findById(userId).select(
    'fullName username email walletBalance'
  );

  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  return {
    userId: user._id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    walletBalance: user.walletBalance
  };
};

/**
 * Deposit to wallet
 */
export const depositBalance = async (
  userId: string,
  amount: number,
  description: string = 'Deposit'
): Promise<any> => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw { status: 400, message: 'Amount must be a positive number' };
  }

  const user = await User.findById(userId);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  const normalizedDescription =
    typeof description === 'string' && description.trim() !== ''
      ? description.trim()
      : 'Deposit';

  user.walletBalance += amount;
  await user.save();

  const transaction = await Transaction.create({
    user: userId,
    amount,
    type: 'deposit',
    description: normalizedDescription,
    status: 'completed',
    performedAt: new Date(),
  });

  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('wallet:updated', {
      walletBalance: user.walletBalance,
      transaction: transaction
    });
  }

  return {
    wallet: {
      userId: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      walletBalance: user.walletBalance
    },
    transaction
  };
};

/**
 * Withdraw from wallet
 */
export const withdrawBalance = async (
  userId: string,
  amount: number,
  description: string = 'Withdrawal'
): Promise<any> => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw { status: 400, message: 'Amount must be a positive number' };
  }

  const user = await User.findById(userId);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  if (user.walletBalance < amount) {
    throw { status: 400, message: 'Insufficient wallet balance' };
  }

  const normalizedDescription =
    typeof description === 'string' && description.trim() !== ''
      ? description.trim()
      : 'Withdrawal';

  user.walletBalance -= amount;
  await user.save();

  const transaction = await Transaction.create({
    user: userId,
    amount,
    type: 'withdrawal',
    description: normalizedDescription,
    status: 'completed',
    performedAt: new Date(),
  });

  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('wallet:updated', {
      walletBalance: user.walletBalance,
      transaction: transaction
    });
  }

  return {
    wallet: {
      userId: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      walletBalance: user.walletBalance
    },
    transaction
  };
};

/**
 * Deduct balance for tournament entry fee
 */
export const deductBalance = async (
  userId: string,
  amount: number,
  type: 'entry_fee' | 'prize_payout' | 'refund' = 'entry_fee',
  tournamentId?: string
): Promise<any> => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw { status: 400, message: 'Amount must be a positive number' };
  }

  const user = await User.findById(userId);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  if (user.walletBalance < amount) {
    throw { status: 400, message: 'Insufficient wallet balance' };
  }

  user.walletBalance -= amount;
  await user.save();

  const transactionDescription = type === 'entry_fee'
    ? `Tournament entry fee${tournamentId ? ` - ${tournamentId}` : ''}`
    : type === 'prize_payout'
    ? `Prize payout${tournamentId ? ` - ${tournamentId}` : ''}`
    : 'Refund';

  const transaction = await Transaction.create({
    user: userId,
    amount,
    type,
    description: transactionDescription,
    relatedTournament: tournamentId ? new Types.ObjectId(tournamentId) : undefined,
    status: 'completed',
    performedAt: new Date(),
  });

  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('wallet:updated', {
      walletBalance: user.walletBalance,
      transaction: transaction
    });
  }

  return {
    wallet: {
      userId: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      walletBalance: user.walletBalance
    },
    transaction
  };
};

/**
 * Add balance (prize payout, welcome bonus, etc.)
 */
export const addBalance = async (
  userId: string,
  amount: number,
  type: 'prize_payout' | 'welcome_bonus' | 'refund' = 'prize_payout',
  description: string = '',
  tournamentId?: string
): Promise<any> => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw { status: 400, message: 'Amount must be a positive number' };
  }

  const user = await User.findById(userId);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  user.walletBalance += amount;
  await user.save();

  const finalDescription = description || (type === 'welcome_bonus' ? 'Welcome bonus' : 'Prize payout');

  const transaction = await Transaction.create({
    user: userId,
    amount,
    type,
    description: finalDescription,
    relatedTournament: tournamentId ? new Types.ObjectId(tournamentId) : undefined,
    status: 'completed',
    performedAt: new Date(),
  });

  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('wallet:updated', {
      walletBalance: user.walletBalance,
      transaction: transaction
    });
  }

  return {
    wallet: {
      userId: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      walletBalance: user.walletBalance
    },
    transaction
  };
};

/**
 * Get user transactions
 */
export const getTransactions = async (
  userId: string,
  limit: number = 50,
  skip: number = 0
): Promise<any> => {
  const transactions = await Transaction.find({ user: userId })
    .sort({ performedAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Transaction.countDocuments({ user: userId });

  return {
    transactions,
    pagination: {
      total,
      limit,
      skip,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get transaction by ID
 */
export const getTransaction = async (transactionId: string, userId: string): Promise<any> => {
  if (!Types.ObjectId.isValid(transactionId)) {
    throw { status: 400, message: 'Invalid transaction ID' };
  }

  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId
  });

  if (!transaction) {
    throw { status: 404, message: 'Transaction not found' };
  }

  return transaction;
};

export const WalletService = {
  getWallet,
  depositBalance,
  withdrawBalance,
  deductBalance,
  addBalance,
  getTransactions,
  getTransaction
};
