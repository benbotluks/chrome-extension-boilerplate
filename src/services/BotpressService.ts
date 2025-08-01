import * as chat from "@botpress/chat";
import type {
  BotpressConfig,
  ChatMessage,
  ConversationSession,
} from "../types";
import StorageService from "./StorageService";

export interface BotpressServiceError {
  type: "authentication" | "network" | "api_limit" | "validation" | "unknown";
  message: string;
  details?: any;
}

export class BotpressService {
  private client: chat.AuthenticatedClient | null = null;
  private config: BotpressConfig | null = null;
  private userId: string | null = null;
  private storageService: StorageService;

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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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

      const messages: ChatMessage[] = response.messages.map((msg) => {
        // Safely create timestamp with fallback
        let timestamp: Date;
        try {
          timestamp = msg.createdAt ? new Date(msg.createdAt) : new Date();
          // Check if the date is valid
          if (isNaN(timestamp.getTime())) {
            timestamp = new Date();
          }
        } catch (error) {
          console.warn(
            "Invalid timestamp from Botpress message:",
            msg.createdAt
          );
          timestamp = new Date();
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
    } catch (error: any) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * List all conversations for the bot
   */
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
            url: "", // Will be populated from local storage
            title: "", // Will be populated from local storage
            messages,
            conversationId: conv.id,
            createdAt: new Date(conv.createdAt),
            lastActivity: new Date(conv.updatedAt),
          };
        })
      );

      return { conversations };
    } catch (error: any) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * Delete a conversation
   */
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
    } catch (error: any) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  /**
   * Handle and categorize errors from the Botpress API
   */
  private handleError(error: any): BotpressServiceError {
    // Network errors
    if (error.code === "NETWORK_ERROR" || error.message?.includes("fetch")) {
      return {
        type: "network",
        message: "Network error. Please check your internet connection.",
        details: error,
      };
    }

    // Authentication errors
    if (error.status === 401 || error.status === 403) {
      return {
        type: "authentication",
        message: "Authentication failed. Please check your credentials.",
        details: error,
      };
    }

    // Rate limiting / API limits
    if (error.status === 429) {
      return {
        type: "api_limit",
        message: "API rate limit exceeded. Please try again later.",
        details: error,
      };
    }

    // Validation errors
    if (error.status === 400) {
      return {
        type: "validation",
        message: error.message || "Invalid request data.",
        details: error,
      };
    }

    // Generic error
    return {
      type: "unknown",
      message: error.message || "An unexpected error occurred.",
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
