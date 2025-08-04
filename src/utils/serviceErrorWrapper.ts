import { ErrorCategory, ErrorInput } from '../types/errors';
import { ErrorUtils } from './errorUtils';

/**
 * Standardized result format for service operations
 */
export interface ServiceResult<T> {
    success: boolean;
    data?: T;
    error?: ErrorCategory;
}

/**
 * Service error wrapper utility for standardizing error handling across service classes
 * 
 * This class provides a consistent way to handle errors in service methods,
 * ensuring all service operations return a standardized result format.
 */
export class ServiceErrorWrapper {
    /**
     * Executes a service operation with standardized error handling
     * 
     * @param operation - The async operation to execute
     * @param context - Optional context string for debugging (e.g., "BotpressService.sendMessage")
     * @returns Promise<ServiceResult<T>> - Standardized result with success/error information
     */
    static async execute<T>(
        operation: () => Promise<T>,
        context?: string
    ): Promise<ServiceResult<T>> {
        try {
            const data = await operation();
            return {
                success: true,
                data
            };
        } catch (error: unknown) {
            const errorCategory = ErrorUtils.categorizeError(error as ErrorInput);

            // Add context to technical message if provided
            if (context) {
                errorCategory.technicalMessage = `[${context}] ${errorCategory.technicalMessage}`;
            }

            return {
                success: false,
                error: errorCategory
            };
        }
    }

    /**
     * Executes a synchronous service operation with standardized error handling
     * 
     * @param operation - The synchronous operation to execute
     * @param context - Optional context string for debugging
     * @returns ServiceResult<T> - Standardized result with success/error information
     */
    static executeSync<T>(
        operation: () => T,
        context?: string
    ): ServiceResult<T> {
        try {
            const data = operation();
            return {
                success: true,
                data
            };
        } catch (error: unknown) {
            const errorCategory = ErrorUtils.categorizeError(error as ErrorInput);

            // Add context to technical message if provided
            if (context) {
                errorCategory.technicalMessage = `[${context}] ${errorCategory.technicalMessage}`;
            }

            return {
                success: false,
                error: errorCategory
            };
        }
    }

    /**
     * Creates a successful service result
     * 
     * @param data - The successful operation data
     * @returns ServiceResult<T> - Success result
     */
    static success<T>(data: T): ServiceResult<T> {
        return {
            success: true,
            data
        };
    }

    /**
     * Creates a failed service result from an error
     * 
     * @param error - The error that occurred
     * @param context - Optional context string for debugging
     * @returns ServiceResult<T> - Error result
     */
    static failure<T>(error: ErrorInput, context?: string): ServiceResult<T> {
        const errorCategory = ErrorUtils.categorizeError(error);

        // Add context to technical message if provided
        if (context) {
            errorCategory.technicalMessage = `[${context}] ${errorCategory.technicalMessage}`;
        }

        return {
            success: false,
            error: errorCategory
        };
    }

    /**
     * Checks if a service result represents a success
     * 
     * @param result - The service result to check
     * @returns boolean - True if the result is successful
     */
    static isSuccess<T>(result: ServiceResult<T>): result is ServiceResult<T> & { success: true; data: T } {
        return result.success === true;
    }

    /**
     * Checks if a service result represents a failure
     * 
     * @param result - The service result to check
     * @returns boolean - True if the result is a failure
     */
    static isFailure<T>(result: ServiceResult<T>): result is ServiceResult<T> & { success: false; error: ErrorCategory } {
        return result.success === false;
    }

    /**
     * Extracts data from a successful service result, throwing if the result is a failure
     * 
     * @param result - The service result
     * @returns T - The data from the successful result
     * @throws Error - If the result represents a failure
     */
    static unwrap<T>(result: ServiceResult<T>): T {
        if (this.isSuccess(result)) {
            return result.data;
        }

        const error = result.error!;
        throw new Error(`Service operation failed: ${error.userMessage} (${error.technicalMessage})`);
    }

    /**
     * Extracts data from a service result, returning a default value if the result is a failure
     * 
     * @param result - The service result
     * @param defaultValue - The default value to return on failure
     * @returns T - The data from the result or the default value
     */
    static unwrapOr<T>(result: ServiceResult<T>, defaultValue: T): T {
        if (this.isSuccess(result)) {
            return result.data;
        }

        return defaultValue;
    }
}