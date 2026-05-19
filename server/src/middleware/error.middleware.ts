/**
 * API Error Handler Middleware
 * Standardizes error responses across all endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponseHandler } from '../utils/api-response';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof Error && 'status' in err) {
    const apiErr = err as ApiError;
    const statusCode = apiErr.status || 500;
    const code = apiErr.code || 'SERVER_ERROR';
    
    return res.status(statusCode).json(
      ApiResponseHandler.error(err.message, code)
    );
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      ApiResponseHandler.validationError(err.message)
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json(
      ApiResponseHandler.validationError('Invalid ID format')
    );
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && ('code' in err && (err as any).code === 11000)) {
    return res.status(409).json(
      ApiResponseHandler.conflict('Resource already exists')
    );
  }

  // Generic error
  return res.status(500).json(
    ApiResponseHandler.serverError()
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json(
    ApiResponseHandler.notFound('Route')
  );
};
