import { useState, useCallback, useEffect, useRef } from "react";
import { botpressService } from "../services/BotpressService";
import { StorageService } from "../services/StorageService";
import type {
  ChatMessage,
  ConversationSession,
  PageContent,
  BotpressConfig,
} from "../types";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  isConfigured: boolean;
  isListening: boolean;
  isTyping: boolean;
}

interface UseBotpressChatReturn {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  isConfigured: boolean;
  isListening: boolean;
  isTyping: boolean;

  // Actions
  sendMessage: (content: string, pageContext?: PageContent) => Promise<void>;
  startNewConversation: (pageContext?: PageContent) => Promise<void>;
  loadConversationHistory: (conversationId: string) => Promise<void>;
  clearError: () => void;
  configure: (config: BotpressConfig) => Promise<boolean>;
}

let storageService: StorageService;

export const useBotpressChat = (
  initialPageContext?: PageContent
): UseBotpressChatReturn => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    conversationId: null,
    isConfigured: false,
    isListening: false,
    isTyping: false,
  });

  // Use ref to track current listening state to avoid stale closure issues
  const isListeningRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isListeningRef.current = state.isListening;
  }, [state.isListening]);

  // Initialize configuration on mount
  useEffect(() => {
    const initializeConfiguration = async () => {
      console.log("Hook: Initializing configuration...");
      try {
        storageService = StorageService.getInstance();
        const config = await storageService.loadBotpressConfig();
        if (config && config.isConfigured) {
          await botpressService.configure(config);
          setState((prev) => ({ ...prev, isConfigured: true }));
        } else {
          console.log("Hook: No valid config found, staying unconfigured");
        }
      } catch (error) {
        console.error("Failed to initialize Botpress configuration:", error);
        setState((prev) => ({
          ...prev,
          error:
            "Failed to load configuration. Please reconfigure the extension.",
        }));
      }
    };

    initializeConfiguration();
  }, []);

  // Load existing conversation for current page
  useEffect(() => {
    const loadExistingConversation = async () => {
      if (!initialPageContext || !state.isConfigured) return;

      try {
        const sessions = await storageService.loadAllConversations();
        const existingSession = Object.values(sessions).find(
          (session) => session.url === initialPageContext.url
        );

        if (existingSession && existingSession.conversationId) {
          setState((prev) => ({
            ...prev,
            conversationId: existingSession.conversationId!,
            messages: existingSession.messages,
          }));
        }
      } catch (error) {
        console.error("Failed to load existing conversation:", error);
      }
    };

    loadExistingConversation();
  }, [initialPageContext, state.isConfigured]);

  // Handle SSE connection when conversation becomes active
  useEffect(() => {
    const startSSEListening = async () => {
      if (!state.conversationId || !state.isConfigured) {
        return;
      }

      try {
        setState((prev) => ({ ...prev, isListening: true }));
        isListeningRef.current = true;

        const result = await botpressService.startListening(
          state.conversationId,
          (message: ChatMessage) => {
            // Update messages state when SSE events are received
            setState((prev) => {
              // Check if message already exists to prevent duplicates
              const messageExists = prev.messages.some(
                (existingMessage) => existingMessage.id === message.id
              );

              if (messageExists) {
                return prev;
              }

              const updatedMessages = [...prev.messages, message];

              // Update conversation session in storage
              if (initialPageContext) {
                const updatedSession: ConversationSession = {
                  id: state.conversationId!,
                  url: initialPageContext.url,
                  title: initialPageContext.title,
                  messages: updatedMessages,
                  conversationId: state.conversationId!,
                  createdAt: new Date(), // This should be preserved from original
                  lastActivity: new Date(),
                };

                storageService
                  .saveConversation(updatedSession)
                  .catch((error) => {
                    console.error(
                      "Failed to save conversation after SSE message:",
                      error
                    );
                  });
              }

              return {
                ...prev,
                isTyping: false,
                messages: updatedMessages,
              };
            });
          }
        );

        if (!result.success) {
          console.error("Failed to start SSE listening:", result.error);
          setState((prev) => ({ ...prev, isListening: false }));
          isListeningRef.current = false;
        }
      } catch (error) {
        console.error("Error starting SSE listening:", error);
        setState((prev) => ({ ...prev, isListening: false }));
        isListeningRef.current = false;
      }
    };

    const stopSSEListening = async () => {
      if (isListeningRef.current) {
        try {
          await botpressService.stopListening();
          setState((prev) => ({ ...prev, isListening: false }));
          isListeningRef.current = false;
        } catch (error) {
          console.error("Error stopping SSE listening:", error);
        }
      }
    };

    if (state.conversationId && state.isConfigured) {
      startSSEListening();
    } else {
      stopSSEListening();
    }

    // Cleanup function to stop listening when conversation changes or component unmounts
    return () => {
      stopSSEListening();
    };
  }, [state.conversationId, state.isConfigured, initialPageContext]);

  const configure = useCallback(
    async (config: BotpressConfig): Promise<boolean> => {
      console.log("useBotpressChat configure called with:", config);
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Test the configuration
        console.log("Configuring botpressService...");
        await botpressService.configure(config);

        console.log("Testing connection...");
        const testResult = await botpressService.testConnection();
        console.log("Test result:", testResult);

        if (!testResult.success) {
          console.log("Configuration test failed:", testResult.error);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: testResult.error?.message || "Configuration test failed",
          }));
          return false;
        }

        // Save configuration if test passes
        console.log("Saving configuration...");
        await storageService.saveBotpressConfig(config);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isConfigured: true,
        }));

        console.log("Configuration successful, isConfigured set to true");
        return true;
      } catch (error) {
        console.error("Configuration error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Configuration failed",
        }));
        return false;
      }
    },
    []
  );

  const startNewConversation = useCallback(
    async (pageContext?: PageContent) => {
      if (!state.isConfigured) {
        setState((prev) => ({ ...prev, error: "Botpress not configured" }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const result = await botpressService.createConversation();
        if (result.error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: result.error!.message,
          }));
          return;
        }

        const newConversationId = result.conversationId!;
        const context = pageContext || initialPageContext;

        // Create new conversation session
        if (context) {
          const newSession: ConversationSession = {
            id: newConversationId,
            url: context.url,
            title: context.title,
            messages: [],
            conversationId: newConversationId,
            createdAt: new Date(),
            lastActivity: new Date(),
          };

          await storageService.saveConversation(newSession);
        }

        setState((prev) => ({
          ...prev,
          conversationId: newConversationId,
          messages: [],
          isLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to start conversation",
        }));
      }
    },
    [state.isConfigured, initialPageContext]
  );

  const sendMessage = useCallback(
    async (content: string, pageContext?: PageContent) => {
      if (!state.isConfigured) {
        setState((prev) => ({ ...prev, error: "Botpress not configured" }));
        return;
      }

      // Start new conversation if none exists
      if (!state.conversationId) {
        await startNewConversation(pageContext);
        // Wait for conversation to be created
        if (!state.conversationId) return;
      }

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Don't add user message immediately - let SSE handle all message updates
        // This prevents duplicate messages when SSE receives the same message from server

        // Send message to Botpress
        const sendResult = await botpressService.sendMessage(
          state.conversationId!,
          content
        );

        if (sendResult.error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: sendResult.error!.message,
          }));
          return;
        }

        // Set loading to false and typing to true - SSE will handle all message updates
        setState((prev) => {
          console.log("Setting isTyping to true after sending message");
          return {
            ...prev,
            isLoading: false,
            isTyping: true,
          };
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to send message",
        }));
      }
    },
    [
      state.isConfigured,
      state.conversationId,
      initialPageContext,
      startNewConversation,
    ]
  );

  const loadConversationHistory = useCallback(
    async (conversationId: string) => {
      if (!state.isConfigured) {
        setState((prev) => ({ ...prev, error: "Botpress not configured" }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const messagesResult = await botpressService.getMessages(
          conversationId
        );
        if (messagesResult.error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: messagesResult.error!.message,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          conversationId,
          messages: messagesResult.messages || [],
          isLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load conversation",
        }));
      }
    },
    [state.isConfigured]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    isTyping: state.isTyping,
    error: state.error,
    conversationId: state.conversationId,
    isConfigured: state.isConfigured,
    isListening: state.isListening,
    sendMessage,
    startNewConversation,
    loadConversationHistory,
    clearError,
    configure,
  };
};
