/**
 * Standardized API Response Types
 *
 * Provides type-safe API response patterns for consistent
 * error handling and data formatting across all API routes.
 *
 * Usage in API routes:
 * ```typescript
 * import { ApiResponse, apiSuccess, apiError } from '@/app/types/api';
 *
 * // Success response
 * return NextResponse.json(apiSuccess(data));
 *
 * // Error response
 * return NextResponse.json(apiError('Not found', 'NOT_FOUND'), { status: 404 });
 *
 * // Paginated response
 * return NextResponse.json(apiPaginated(items, { page: 1, pageSize: 20, total: 100 }));
 * ```
 *
 * Usage in frontend:
 * ```typescript
 * const response = await fetch('/api/...');
 * const result: ApiResponse<MyData> = await response.json();
 *
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */

// ============================================================
// BASE RESPONSE TYPES
// ============================================================

/**
 * Successful API response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  meta?: Record<string, unknown>;
}

/**
 * Error API response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Combined API response type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================
// PAGINATION TYPES
// ============================================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated API response
 */
export interface ApiPaginatedResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: PaginationMeta;
}

// ============================================================
// COMMON ERROR CODES
// ============================================================

/**
 * Standard error codes for API responses
 */
export const ApiErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',

  // Business logic errors
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INVALID_STATE: 'INVALID_STATE',
  SYNC_FAILED: 'SYNC_FAILED',
} as const;

export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Create a successful API response
 */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(meta && { meta }),
  };
}

/**
 * Create an error API response
 */
export function apiError(
  error: string,
  code?: ApiErrorCode,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...(code && { code }),
    ...(details && { details }),
  };
}

/**
 * Create a paginated API response
 */
export function apiPaginated<T>(
  data: T[],
  pagination: { page: number; pageSize: number; total: number },
  meta?: Record<string, unknown>
): ApiPaginatedResponse<T> {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
    ...(meta && { meta }),
  };
}

// ============================================================
// TYPE GUARDS
// ============================================================

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

// ============================================================
// HTTP STATUS HELPERS
// ============================================================

/**
 * Get HTTP status code from error code
 */
export function getHttpStatusFromCode(code?: ApiErrorCode): number {
  if (!code) return 500;

  const statusMap: Record<ApiErrorCode, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 422,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    EXTERNAL_API_ERROR: 502,
    DUPLICATE_ENTRY: 409,
    INVALID_STATE: 409,
    SYNC_FAILED: 500,
  };

  return statusMap[code] || 500;
}

// ============================================================
// SYNC-SPECIFIC RESPONSE TYPES
// ============================================================

/**
 * Sync operation result
 */
export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  failed: number;
  errors?: string[];
}

/**
 * Create a sync result response
 */
export function apiSyncResult(result: SyncResult): ApiSuccessResponse<SyncResult> {
  return apiSuccess(result, {
    operation: 'sync',
  });
}
