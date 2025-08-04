# Design Document

## Overview

This design creates a centralized error handling system to eliminate repetitive try-catch blocks and error state management across hooks and services. The solution provides reusable utilities while maintaining backward compatibility with existing code.

## Architecture

### Core Components

1. **Error Handling Hook (`useErrorHandler`)** - Manages error state and provides async operation wrapping
2. **Error Utilities (`errorUtils`)** - Centralized error processing and formatting functions  
3. **Service Error Wrapper** - Standardized error handling for service classes
4. **Error Types** - Enhanced type definitions for consistent error categorization

### Design Principles

- **Non-breaking**: Existing APIs remain unchanged
- **Opt-in**: New patterns can be adopted gradually
- **Consistent**: Standardized error formatting across the application
- **Debuggable**: Preserves error context and stack traces

## Components and Interfaces

### 1. Error Handling Hook

```typescript
// src/hooks/useErrorHandler.ts
interface UseErrorHandlerReturn {
  error: string | null;
  isLoading: boolean;
  setError: (error: string | null) => void;
  clearError: () => void;
  withErrorHandling: <T>(
    asyncFn: () => Promise<T>,
    options?: ErrorHandlingOptions
  ) => Promise<T | null>;
}

interface ErrorHandlingOptions {
  loadingState?: boolean;
  errorMessage?: string;
  onError?: (error: Error) => void;
}
```

The hook provides:
- Automatic loading state management
- Consistent error formatting
- Async operation wrapping with try-catch elimination
- Optional custom error handling

### 2. Error Utilities

```typescript
// src/utils/errorUtils.ts
interface ErrorCategory {
  type: 'network' | 'validation' | 'configuration' | 'authentication' | 'unknown';
  userMessage: string;
  technicalMessage: string;
}

class ErrorUtils {
  static categorizeError(error: unknown): ErrorCategory;
  static formatUserMessage(error: unknown): string;
  static formatTechnicalMessage(error: unknown): string;
  static isNetworkError(error: unknown): boolean;
  static isValidationError(error: unknown): boolean;
  static isConfigurationError(error: unknown): boolean;
}
```

Provides centralized error categorization and message formatting.

### 3. Service Error Wrapper

```typescript
// src/utils/serviceErrorWrapper.ts
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ErrorCategory;
}

class ServiceErrorWrapper {
  static async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<ServiceResult<T>>;
}
```

Standardizes service method error handling and response formats.

## Data Models

### Enhanced Error Types

```typescript
// src/types/errors.ts
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
```

## Error Handling

### Centralized Error Processing

All errors flow through the `ErrorUtils.categorizeError()` function which:
1. Identifies error type based on properties and patterns
2. Generates appropriate user-friendly messages
3. Preserves technical details for debugging
4. Adds context information

### Error Categories

- **Network**: Connection issues, timeouts, CORS errors
- **Validation**: Invalid input, missing required fields
- **Configuration**: Missing or invalid configuration
- **Authentication**: Invalid credentials, expired tokens
- **Unknown**: Fallback for unrecognized errors

## Testing Strategy

### Unit Tests

1. **Error Utilities Tests**
   - Test error categorization for different error types
   - Verify message formatting consistency
   - Test edge cases (null, undefined, non-Error objects)

2. **Hook Tests**
   - Test async operation wrapping
   - Verify loading state management
   - Test error state updates
   - Test concurrent operation handling

3. **Service Wrapper Tests**
   - Test successful operation wrapping
   - Test error handling and formatting
   - Test context preservation

### Integration Tests

1. **Hook Integration**
   - Test with existing service methods
   - Verify backward compatibility
   - Test error propagation

2. **Service Integration**
   - Test with real service errors
   - Verify error categorization accuracy
   - Test user message quality

### Migration Strategy

The refactor will be implemented in phases:

1. **Phase 1**: Create error handling utilities and hook
2. **Phase 2**: Refactor `useContentScraping` as proof of concept
3. **Phase 3**: Gradually migrate other hooks and services
4. **Phase 4**: Deprecate old error handling patterns (optional)

This approach ensures no breaking changes while providing immediate value.