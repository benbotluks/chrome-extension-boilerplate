import { ErrorCategory, ErrorInput, HttpErrorResponse } from '../types/errors';

export class ErrorUtils {
    /**
     * Categorizes an error based on its properties and patterns
     */
    static categorizeError(error: ErrorInput): ErrorCategory {
        // Handle null/undefined
        if (!error) {
            return {
                type: 'unknown',
                userMessage: 'An unexpected error occurred',
                technicalMessage: 'Error is null or undefined'
            };
        }

        // Handle Error objects
        if (error instanceof Error) {
            const message = error.message.toLowerCase();

            // Network errors
            if (this.isNetworkError(error)) {
                return {
                    type: 'network',
                    userMessage: 'Connection failed. Please check your internet connection and try again.',
                    technicalMessage: error.message
                };
            }

            // Validation errors
            if (this.isValidationError(error)) {
                return {
                    type: 'validation',
                    userMessage: 'Invalid input provided. Please check your data and try again.',
                    technicalMessage: error.message
                };
            }

            // Configuration errors
            if (this.isConfigurationError(error)) {
                return {
                    type: 'configuration',
                    userMessage: 'Configuration error. Please check your settings.',
                    technicalMessage: error.message
                };
            }

            // Authentication errors
            if (message.includes('auth') || message.includes('unauthorized') ||
                message.includes('forbidden') || message.includes('token')) {
                return {
                    type: 'authentication',
                    userMessage: 'Authentication failed. Please check your credentials.',
                    technicalMessage: error.message
                };
            }
        }

        // Handle HTTP Response errors
        if (typeof error === 'object' && error !== null) {
            const errorObj = error as HttpErrorResponse;

            if (errorObj.status || errorObj.statusCode) {
                const status = errorObj.status || errorObj.statusCode;

                if (status && status >= 400 && status < 500) {
                    if (status === 401 || status === 403) {
                        return {
                            type: 'authentication',
                            userMessage: 'Authentication failed. Please check your credentials.',
                            technicalMessage: `HTTP ${status}: ${errorObj.message || 'Authentication error'}`
                        };
                    }

                    if (status === 400 || status === 422) {
                        return {
                            type: 'validation',
                            userMessage: 'Invalid request. Please check your input.',
                            technicalMessage: `HTTP ${status}: ${errorObj.message || 'Validation error'}`
                        };
                    }
                }

                if (status && status >= 500) {
                    return {
                        type: 'network',
                        userMessage: 'Server error. Please try again later.',
                        technicalMessage: `HTTP ${status}: ${errorObj.message || 'Server error'}`
                    };
                }
            }
        }

        // Handle string errors
        if (typeof error === 'string') {
            const message = error.toLowerCase();

            if (message.includes('network') || message.includes('connection') ||
                message.includes('timeout') || message.includes('cors')) {
                return {
                    type: 'network',
                    userMessage: 'Connection failed. Please check your internet connection and try again.',
                    technicalMessage: error
                };
            }

            if (message.includes('validation') || message.includes('invalid') ||
                message.includes('required')) {
                return {
                    type: 'validation',
                    userMessage: 'Invalid input provided. Please check your data and try again.',
                    technicalMessage: error
                };
            }
        }

        // Default fallback
        return {
            type: 'unknown',
            userMessage: 'An unexpected error occurred. Please try again.',
            technicalMessage: String(error)
        };
    }

    /**
     * Formats a user-friendly error message
     */
    static formatUserMessage(error: ErrorInput): string {
        return this.categorizeError(error).userMessage;
    }

    /**
     * Formats a technical error message for debugging
     */
    static formatTechnicalMessage(error: ErrorInput): string {
        return this.categorizeError(error).technicalMessage;
    }

    /**
     * Checks if an error is network-related
     */
    static isNetworkError(error: ErrorInput): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return message.includes('network') ||
                message.includes('connection') ||
                message.includes('timeout') ||
                message.includes('cors') ||
                message.includes('fetch') ||
                error.name === 'NetworkError' ||
                error.name === 'TypeError' && message.includes('fetch');
        }

        if (typeof error === 'object' && error !== null) {
            const errorObj = error as HttpErrorResponse;
            const status = errorObj.status || errorObj.statusCode;
            return status !== undefined && (status >= 500 || status === 0);
        }

        return false;
    }

    /**
     * Checks if an error is validation-related
     */
    static isValidationError(error: ErrorInput): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return message.includes('validation') ||
                message.includes('invalid') ||
                message.includes('required') ||
                message.includes('missing') ||
                error.name === 'ValidationError';
        }

        if (typeof error === 'object' && error !== null) {
            const errorObj = error as HttpErrorResponse;
            const status = errorObj.status || errorObj.statusCode;
            return status !== undefined && (status === 400 || status === 422);
        }

        return false;
    }

    /**
     * Checks if an error is configuration-related
     */
    static isConfigurationError(error: ErrorInput): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return message.includes('config') ||
                message.includes('environment') ||
                message.includes('missing') && (message.includes('key') || message.includes('token')) ||
                error.name === 'ConfigurationError';
        }

        return false;
    }
}