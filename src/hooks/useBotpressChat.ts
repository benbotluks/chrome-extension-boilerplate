import { useState, useCallback, useEffect, useRef } from "react";
import { botpressService } from "../services/BotpressService";
import { StorageService } from "../services/StorageService";
import { ServiceErrorWrapper } from "../utils/serviceErrorWrapper";
import type {
  ChatMessage,
  ConversationSession,
  PageContent,
  BotpressConfig,
  ChatState
} from "../types";

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
  sendMessage: (content: string, pageContext?: PageContent | null) => Promise<void>;
  startNewConversation: (pageContext?: PageContent | null) => Promise<string | null>;
  loadConversationHistory: (conversationId: string) => Promise<void>;
  clearError: () => void;
  configure: (config: BotpressConfig) => Promise<boolean>;
}

let storageService: StorageService;

export const useBotpressChat = (
  initialPageContext?: PageContent | null
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

      const result = await ServiceErrorWrapper.execute(async () => {
        storageService = StorageService.getInstance();
        const config = await storageService.loadBotpressConfig();
        if (config && config.isConfigured) {
          await botpressService.configure(config);
          return true;
        } else {
          console.log("Hook: No valid config found, staying unconfigured");
          return false;
        }
      }, "useBotpressChat.initializeConfiguration");

      if (ServiceErrorWrapper.isSuccess(result)) {
        if (result.data) {
          setState((prev) => ({ ...prev, isConfigured: true }));
        }
      } else {
        console.error("Failed to initialize Botpress configuration:", result.error);
        setState((prev) => ({
          ...prev,
          error: result.error!.userMessage,
        }));
      }
    };

    initializeConfiguration();
  }, []);

  // Load existing conversation for current page
  useEffect(() => {
    const loadExistingConversation = async () => {
      if (!initialPageContext || !state.isConfigured) return;

      const result = await ServiceErrorWrapper.execute(async () => {
        const sessions = await storageService.loadAllConversations();
        const existingSessions = Object.values(sessions).filter(
          (session) => session.url === initialPageContext.url
        );

        const existingSession = existingSessions.reduce((latest, current) => {
          return !latest || current.lastActivity > latest.lastActivity ? current : latest;
        }, null as ConversationSession | null);

        return existingSession;
      }, "useBotpressChat.loadExistingConversation");

      if (ServiceErrorWrapper.isSuccess(result) && result.data && result.data.conversationId) {
        setState((prev) => ({
          ...prev,
          conversationId: result.data!.conversationId!,
          messages: result.data!.messages,
        }));
      } else if (ServiceErrorWrapper.isFailure(result)) {
        console.error("Failed to load existing conversation:", result.error);
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

      setState((prev) => ({ ...prev, isListening: true }));
      isListeningRef.current = true;

      const sseResult = await botpressService.startListening(
        state.conversationId!,
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
                createdAt: new Date().toISOString(), // This should be preserved from original
                lastActivity: new Date().toISOString(),
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

      if (ServiceErrorWrapper.isFailure(sseResult)) {
        console.error("Error starting SSE listening:", sseResult.error);
        setState((prev) => ({ ...prev, isListening: false }));
        isListeningRef.current = false;
      }
    };

    const stopSSEListening = async () => {
      if (isListeningRef.current) {
        const result = await botpressService.stopListening();

        if (ServiceErrorWrapper.isSuccess(result)) {
          setState((prev) => ({ ...prev, isListening: false }));
          isListeningRef.current = false;
        } else {
          console.error("Error stopping SSE listening:", result.error);
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
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Test the configuration
      console.log("Configuring botpressService...");
      await botpressService.configure(config);

      console.log("Testing connection...");
      const testResult = await botpressService.testConnection();
      console.log("Test result:", testResult);

      if (ServiceErrorWrapper.isFailure(testResult)) {
        console.log("Configuration test failed:", testResult.error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: testResult.error.userMessage,
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

      console.log("Configuration successful");
      return true;


    },
    []
  );

  const startNewConversation = useCallback(
    async (pageContext?: PageContent | null): Promise<string | null> => {
      if (!state.isConfigured) {
        setState((prev) => ({ ...prev, error: "Botpress not configured" }));
        return null;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const createResult = await botpressService.createConversation();
      if (ServiceErrorWrapper.isFailure(createResult)) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: createResult.error.userMessage,
        }));
        return null;
      }

      const newConversationId = createResult.data!;
      const context = pageContext || initialPageContext;

      // Create new conversation session
      if (context) {
        const newSession: ConversationSession = {
          id: newConversationId,
          url: context.url,
          title: context.title,
          messages: [],
          conversationId: newConversationId,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        };

        await storageService.saveConversation(newSession);
      }

      setState((prev) => ({
        ...prev,
        conversationId: newConversationId,
        messages: [],
        isLoading: false,
      }));

      return newConversationId;
    },
    [state.isConfigured, initialPageContext]
  );

  const sendMessage = useCallback(
    async (content: string, pageContext?: PageContent | null) => {
      if (!state.isConfigured) {
        setState((prev) => ({ ...prev, error: "Botpress not configured" }));
        return;
      }

      // Start new conversation if none exists
      let currentConversationId = state.conversationId;
      if (!currentConversationId) {
        currentConversationId = await startNewConversation(pageContext);
        if (!currentConversationId) return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Don't add user message immediately - let SSE handle all message updates
      // This prevents duplicate messages when SSE receives the same message from server

      // Send message to Botpress
      const sendResult = await botpressService.sendMessage(
        currentConversationId!,
        content
      );

      if (ServiceErrorWrapper.isFailure(sendResult)) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: sendResult.error.userMessage,
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
    },
    [state.isConfigured, state.conversationId, startNewConversation]
  );

  const loadConversationHistory = useCallback(
    async (conversationId: string) => {
      if (!state.isConfigured) {
        setState((prev) => ({ ...prev, error: "Botpress not configured" }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const messagesResult = await botpressService.getMessages(conversationId);
      if (ServiceErrorWrapper.isFailure(messagesResult)) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: messagesResult.error.userMessage,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        conversationId,
        messages: messagesResult.data!,
        isLoading: false,
      }));
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
