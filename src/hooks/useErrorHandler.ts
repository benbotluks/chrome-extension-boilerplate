import { useState, useCallback } from 'react';
import { ErrorUtils } from '../utils/errorUtils';
import { ErrorInput } from '../types/errors';

export interface ErrorHandlingOptions {
    loadingState?: boolean;
    errorMessage?: string;
    onError?: (error: Error) => void;
}

export interface UseErrorHandlerReturn {
    error: string | null;
    isLoading: boolean;
    setError: (error: string | null) => void;
    clearError: () => void;
    withErrorHandling: <T>(
        asyncFn: () => Promise<T>,
        options?: ErrorHandlingOptions
    ) => Promise<T | null>;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const withErrorHandling = useCallback(
        async <T>(
            asyncFn: () => Promise<T>,
            options: ErrorHandlingOptions = {}
        ): Promise<T | null> => {
            const {
                loadingState = true,
                errorMessage,
                onError
            } = options;

            try {
                // Clear any existing errors
                setError(null);

                // Set loading state if requested
                if (loadingState) {
                    setIsLoading(true);
                }

                // Execute the async operation
                const result = await asyncFn();

                return result;
            } catch (err) {
                // Format error message using ErrorUtils
                const formattedError = errorMessage || ErrorUtils.formatUserMessage(err as ErrorInput);
                setError(formattedError);

                // Call custom error handler if provided
                if (onError && err instanceof Error) {
                    onError(err);
                }

                return null;
            } finally {
                // Always clear loading state
                if (loadingState) {
                    setIsLoading(false);
                }
            }
        },
        []
    );

    return {
        error,
        isLoading,
        setError,
        clearError,
        withErrorHandling
    };
};