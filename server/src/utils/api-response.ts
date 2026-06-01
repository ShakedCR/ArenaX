/**
 * Standardized API Response Utility
 * Ensures all endpoints return consistent response format
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: number;
}

export class ApiResponseHandler {
  /**
   * Send success response
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: Date.now()
    };
  }

  /**
   * Send error response
   */
  static error(message: string, code: string = 'INTERNAL_ERROR'): ApiResponse {
    return {
      success: false,
      error: message,
      code,
      timestamp: Date.now()
    };
  }

  /**
   * Send validation error
   */
  static validationError(message: string): ApiResponse {
    return this.error(message, 'VALIDATION_ERROR');
  }

  /**
   * Send not found error
   */
  static notFound(resource: string): ApiResponse {
    return this.error(`${resource} not found`, 'NOT_FOUND');
  }

  /**
   * Send unauthorized error
   */
  static unauthorized(): ApiResponse {
    return this.error('Unauthorized', 'UNAUTHORIZED');
  }

  /**
   * Send forbidden error
   */
  static forbidden(message: string = 'Access denied'): ApiResponse {
    return this.error(message, 'FORBIDDEN');
  }

  /**
   * Send conflict error (e.g., already exists)
   */
  static conflict(message: string): ApiResponse {
    return this.error(message, 'CONFLICT');
  }

  /**
   * Send server error
   */
  static serverError(message: string = 'Internal server error'): ApiResponse {
    return this.error(message, 'SERVER_ERROR');
  }
}
