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
                setError(null);

                if (loadingState) {
                    setIsLoading(true);
                }

                const result = await asyncFn();

                return result;
            } catch (err) {
                const formattedError = errorMessage || ErrorUtils.formatUserMessage(err as ErrorInput);
                setError(formattedError);

                if (onError && err instanceof Error) {
                    onError(err);
                }
                return null;
            } finally {
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