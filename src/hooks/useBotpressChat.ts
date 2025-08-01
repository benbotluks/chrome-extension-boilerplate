import { useState, useCallback, useEffect } from "react";
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
}

interface UseBotpressChatReturn {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  isConfigured: boolean;

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
  });

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

        // Add user message to state immediately
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          type: "user",
          content,
          timestamp: new Date(),
          pageContext:
            pageContext || initialPageContext
              ? {
                  url: (pageContext || initialPageContext)!.url,
                  title: (pageContext || initialPageContext)!.title,
                }
              : undefined,
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, userMessage],
        }));

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

        // Get updated messages from Botpress
        const messagesResult = await botpressService.getMessages(
          state.conversationId!
        );
        if (messagesResult.error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: messagesResult.error!.message,
          }));
          return;
        }

        const updatedMessages = messagesResult.messages || [];
        setState((prev) => ({
          ...prev,
          messages: updatedMessages,
          isLoading: false,
        }));

        // Update conversation session in storage
        const context = pageContext || initialPageContext;
        if (context) {
          const updatedSession: ConversationSession = {
            id: state.conversationId!,
            url: context.url,
            title: context.title,
            messages: updatedMessages,
            conversationId: state.conversationId!,
            createdAt: new Date(), // This should be preserved from original
            lastActivity: new Date(),
          };

          await storageService.saveConversation(updatedSession);
        }
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
    error: state.error,
    conversationId: state.conversationId,
    isConfigured: state.isConfigured,
    sendMessage,
    startNewConversation,
    loadConversationHistory,
    clearError,
    configure,
  };
};
