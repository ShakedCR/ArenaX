import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const SECRET = 'test-jwt-secret';

// ── Helpers ────────────────────────────────────────────────────────────────────

const makeReq = (authHeader?: string): AuthRequest => ({
  headers: authHeader ? { authorization: authHeader } : {},
} as AuthRequest);

const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const makeNext = (): NextFunction => jest.fn();

const sign = (payload: object, secret = SECRET): string =>
  jwt.sign(payload, secret, { expiresIn: '1h' });

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('authMiddleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    jest.restoreAllMocks();
  });

  test('calls next() and attaches userId for a valid token', () => {
    const token = sign({ userId: 'user-abc' });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe('user-abc');
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header is missing', () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'No token provided' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header does not start with "Bearer "', () => {
    const token = sign({ userId: 'user-abc' });
    const req = makeReq(`Token ${token}`);
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for a token signed with the wrong secret', () => {
    const token = sign({ userId: 'user-xyz' }, 'wrong-secret');
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid token' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for a syntactically invalid token string', () => {
    const req = makeReq('Bearer not.a.jwt');
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for an expired token', () => {
    const token = jwt.sign({ userId: 'user-abc' }, SECRET, { expiresIn: -1 });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid token' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 500 when JWT_SECRET environment variable is not set', () => {
    delete process.env.JWT_SECRET;
    const token = sign({ userId: 'user-abc' });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'JWT_SECRET is not defined' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('does not attach userId when authentication fails', () => {
    const req = makeReq(`Bearer invalid-token`);
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect((req as AuthRequest).userId).toBeUndefined();
  });

  test('correctly extracts userId from token payload', () => {
    const userId = 'mongo-object-id-here';
    const token = sign({ userId });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect(req.userId).toBe(userId);
  });

  test('handles "Bearer " with no token after it (empty string)', () => {
    const req = makeReq('Bearer ');
    const res = makeRes();
    const next = makeNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
