import * as chat from "@botpress/chat";
import type {
  BotpressConfig,
  ChatMessage,
  ConversationSession,
  IncomingMessageEvent,
  ServiceError,
  ApiError,
  NetworkError,
} from "../types";
import StorageService from "./StorageService";

export interface BotpressServiceError {
  type: "authentication" | "network" | "api_limit" | "validation" | "unknown";
  message: string;
  details?: ServiceError;
}

// Interface for the Botpress SignalListener
interface SignalListener {
  on(event: "message_created", callback: (data: IncomingMessageEvent) => void): void;
  on(event: "error", callback: (error: Error) => void): void;
  on(event: string, callback: (data: unknown) => void): void;
  disconnect(): Promise<void>;
}

export class BotpressService {
  private client: chat.AuthenticatedClient | null = null;
  private config: BotpressConfig | null = null;
  private userId: string | null = null;
  private storageService: StorageService;
  private listener: SignalListener | null = null; // SignalListener from Botpress Chat API

  constructor(config?: BotpressConfig) {
    this.storageService = StorageService.getInstance();
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the service with Botpress credentials
   */
  async configure(config: BotpressConfig): Promise<void> {
    console.log("Configuring BotpressService with:", {
      webhookId: config.webhookId,
      isConfigured: config.isConfigured,
    });
    this.config = config;

    if (config.webhookId && config.isConfigured) {
      try {
        // Check for stored user key before connecting
        const storedUserKey = await this.storageService.loadUserKey();

        if (storedUserKey) {
          console.log(
            "Found stored user key, attempting to connect with existing user"
          );
          try {
            // Connect with stored user key
            this.client = await chat.Client.connect({
              webhookId: config.webhookId,
              userKey: storedUserKey,
            });
            console.log(
              "Successfully connected to Botpress with stored user key:",
              this.client
            );
            const { user } = await this.client.getUser({});
            this.userId = user.id;
            return; // Successfully connected with stored key
          } catch (error) {
            console.warn(
              "Failed to connect with stored user key, creating new user:",
              error
            );
            // Clear invalid user key and fall through to create new user
            await this.storageService.clearUserKey();
          }
        }

        // No stored key or connection failed, create new user and store the key
        console.log("Creating new user session");
        this.client = await chat.Client.connect({
          webhookId: config.webhookId,
        });
        console.log(
          "Successfully connected to Botpress with new user:",
          this.client
        );

        // Store the new user key after successful connection
        await this.storageService.saveUserKey(this.client.user.key);
        console.log("Stored new user key for future sessions");

        const { user } = await this.client.getUser({});
        this.userId = user.id;
      } catch (error) {
        console.error("Failed to connect to Botpress:", error);
        throw error;
      }
    }
  }

  /**
   * Test the connection to Botpress
   */
  async testConnection(): Promise<{
    success: boolean;
    error?: BotpressServiceError;
  }> {
    console.log("Testing connection...", {
      client: !!this.client,
      config: !!this.config,
    });

    if (!this.client || !this.config) {
      console.log("Service not configured");
      return {
        success: false,
        error: {
          type: "authentication",
          message: "Service not configured. Please provide valid credentials.",
        },
      };
    }

    try {
      console.log("Attempting to list conversations...");
      // Test connection by attempting to get bot info
      const result = await this.client.listConversations({});
      console.log("Connection test successful:", result);
      return { success: true };
    } catch (error: ServiceError) {
      console.error("Connection test failed:", error);
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(): Promise<{
    conversationId?: string;
    error?: BotpressServiceError;
  }> {
    if (!this.client || !this.config) {
      return {
        error: {
          type: "authentication",
          message: "Service not configured",
        },
      };
    }

    try {
      const response = await this.client.createConversation({});

      return { conversationId: response.conversation.id };
    } catch (error: ServiceError) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * Send a message to a conversation with page content context
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<{ success: boolean; error?: BotpressServiceError }> {
    if (!this.client || !this.config) {
      return {
        success: false,
        error: {
          type: "authentication",
          message: "Service not configured",
        },
      };
    }

    try {
      await this.client.createMessage({
        conversationId,
        payload: { type: "text", text: content },
      });

      return { success: true };
    } catch (error: ServiceError) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(conversationId: string): Promise<{
    messages?: ChatMessage[];
    error?: BotpressServiceError;
  }> {
    if (!this.client || !this.config) {
      return {
        error: {
          type: "authentication",
          message: "Service not configured",
        },
      };
    }

    try {
      const response = await this.client.listMessages({
        conversationId,
      });

      const messages: ChatMessage[] = response.messages.reverse().map((msg) => {
        // Safely create timestamp with fallback
        let timestamp: string;
        try {
          if (msg.createdAt) {
            // Validate the timestamp by creating a Date object
            const date = new Date(msg.createdAt);
            if (isNaN(date.getTime())) {
              timestamp = new Date().toISOString();
            } else {
              timestamp = typeof msg.createdAt === 'string' ? msg.createdAt : new Date(msg.createdAt).toISOString();
            }
          } else {
            timestamp = new Date().toISOString();
          }
        } catch (_) {
          console.error(
            "Invalid timestamp from Botpress message:",
            msg.createdAt
          );
          timestamp = new Date().toISOString();
        }

        return {
          id: msg.id,
          type: msg.userId === this.userId ? "user" : "bot",
          content:
            msg.payload.type === "text"
              ? msg.payload.text
              : "[Non-text message]",
          timestamp,
        };
      });

      return { messages };
    } catch (error: ServiceError) {
      return { error: this.handleError(error) };
    }
  }

  async listConversations(): Promise<{
    conversations?: ConversationSession[];
    error?: BotpressServiceError;
  }> {
    if (!this.client || !this.config) {
      return {
        error: {
          type: "authentication",
          message: "Service not configured",
        },
      };
    }

    try {
      const response = await this.client.listConversations({});

      const conversations: ConversationSession[] = await Promise.all(
        response.conversations.map(async (conv) => {
          // Get messages for each conversation to build the session
          const messagesResult = await this.getMessages(conv.id);
          const messages = messagesResult.messages || [];

          return {
            id: conv.id,
            url: "",
            title: "",
            messages,
            conversationId: conv.id,
            createdAt: new Date(conv.createdAt).toISOString(),
            lastActivity: new Date(conv.updatedAt).toISOString(),
          };
        })
      );

      return { conversations };
    } catch (error: ServiceError) {
      return { error: this.handleError(error) };
    }
  }

  async deleteConversation(conversationId: string): Promise<{
    success: boolean;
    error?: BotpressServiceError;
  }> {
    if (!this.client || !this.config) {
      return {
        success: false,
        error: {
          type: "authentication",
          message: "Service not configured",
        },
      };
    }

    try {
      await this.client.deleteConversation({
        id: conversationId,
      });

      return { success: true };
    } catch (error: ServiceError) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  async startListening(
    conversationId: string,
    onMessage: (message: ChatMessage) => void
  ): Promise<{ success: boolean; error?: BotpressServiceError }> {
    if (!this.client || !this.config) {
      return {
        success: false,
        error: {
          type: "authentication",
          message: "Service not configured",
        },
      };
    }

    try {
      // Stop any existing listener first
      await this.stopListening();

      // Start listening for events on the conversation
      this.listener = await this.client.listenConversation({
        id: conversationId,
      });

      // Handle message_created events
      this.listener.on("message_created", (event: IncomingMessageEvent) => {
        try {
          // Convert the event to ChatMessage format
          const message: ChatMessage = {
            id: event.id,
            type: event.isBot ? "bot" : "user",
            content:
              event.payload.type === "text"
                ? event.payload.text
                : "[Non-text message]",
            timestamp: event.createdAt || new Date().toISOString(),
          };

          // Call the callback with the converted message
          onMessage(message);
        } catch (error) {
          console.error("Error processing message_created event:", error);
        }
      });

      // Handle connection errors
      this.listener.on("error", (error: Error) => {
        console.error("SSE connection error:", error);
      });

      return { success: true };
    } catch (error: ServiceError) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  async stopListening(): Promise<{
    success: boolean;
    error?: BotpressServiceError;
  }> {
    try {
      if (this.listener) {
        await this.listener.disconnect();
        this.listener = null;
      }
      return { success: true };
    } catch (error: ServiceError) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  private handleError(error: ServiceError): BotpressServiceError {
    // Type guard functions to safely check error properties
    const hasStatus = (err: unknown): err is ApiError =>
      typeof err === 'object' && err !== null && 'status' in err;

    const hasMessage = (err: unknown): err is { message: string } =>
      typeof err === 'object' && err !== null && 'message' in err;

    const hasCode = (err: unknown): err is NetworkError =>
      typeof err === 'object' && err !== null && 'code' in err;

    // Network errors
    if (hasCode(error) && error.code === "NETWORK_ERROR") {
      return {
        type: "network",
        message: "Network error. Please check your internet connection.",
        details: error,
      };
    }

    if (hasMessage(error) && error.message.includes("fetch")) {
      return {
        type: "network",
        message: "Network error. Please check your internet connection.",
        details: error,
      };
    }

    // Authentication errors
    if (hasStatus(error) && (error.status === 401 || error.status === 403)) {
      return {
        type: "authentication",
        message: "Authentication failed. Please check your credentials.",
        details: error,
      };
    }

    if (hasStatus(error) && error.status === 429) {
      return {
        type: "api_limit",
        message: "API rate limit exceeded. Please try again later.",
        details: error,
      };
    }

    if (hasStatus(error) && error.status === 400) {
      const message = hasMessage(error) ? error.message : "Invalid request data.";
      return {
        type: "validation",
        message,
        details: error,
      };
    }

    let message = "An unexpected error occurred.";
    if (hasMessage(error)) {
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }

    return {
      type: "unknown",
      message,
      details: error,
    };
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.client;
  }

  /**
   * Get current configuration
   */
  getConfig(): BotpressConfig | null {
    return this.config;
  }
}

// Export a singleton instance
export const botpressService = new BotpressService();
