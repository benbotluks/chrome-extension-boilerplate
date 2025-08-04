export interface StandardError {
    type: 'network' | 'validation' | 'configuration' | 'authentication' | 'unknown';
    message: string;
    technicalDetails?: unknown;
    context?: string;
    timestamp: string;
}

export interface ServiceError extends StandardError {
    service: string;
    operation: string;
}

export interface ErrorCategory {
    type: 'network' | 'validation' | 'configuration' | 'authentication' | 'unknown';
    userMessage: string;
    technicalMessage: string;
}


export interface HttpErrorResponse {
    status?: number;
    statusCode?: number;
    message?: string;
    data?: unknown;
}

export interface NetworkError extends Error {
    code?: string;
    errno?: number;
    syscall?: string;
}

// Union type for all possible error inputs
export type ErrorInput =
    | Error
    | NetworkError
    | HttpErrorResponse
    | string
    | null
    | undefined
    | { message?: string;[key: string]: unknown };