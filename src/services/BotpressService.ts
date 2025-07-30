import * as chat from "@botpress/chat";
import type {
  BotpressConfig,
  ChatMessage,
  ConversationSession,
  PageContent,
} from "../types";

export interface BotpressServiceError {
  type: "authentication" | "network" | "api_limit" | "validation" | "unknown";
  message: string;
  details?: any;
}

export class BotpressService {
  private client: chat.AuthenticatedClient | null = null;
  private config: BotpressConfig | null = null;

  constructor(config?: BotpressConfig) {
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the service with Botpress credentials
   */
  async configure(config: BotpressConfig): Promise<void> {
    this.config = config;
    if (config.webhookId && config.isConfigured) {
      this.client = await chat.Client.connect({
        webhookId: config.webhookId,
      });
    }
  }

  /**
   * Test the connection to Botpress
   */
  async testConnection(): Promise<{
    success: boolean;
    error?: BotpressServiceError;
  }> {
    if (!this.client || !this.config) {
      return {
        success: false,
        error: {
          type: "authentication",
          message: "Service not configured. Please provide valid credentials.",
        },
      };
    }

    try {
      // Test connection by attempting to get bot info
      await this.client.listConversations({});
      return { success: true };
    } catch (error: any) {
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
    content: string,
    pageContext?: PageContent
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
      // Prepare the message with context
      let messageContent = content;

      if (pageContext) {
        const contextInfo = `
Page Context:
- URL: ${pageContext.url}
- Title: ${pageContext.title}
- Content Type: ${pageContext.contentType}
- Domain: ${pageContext.domain}

Page Content:
${pageContext.extractedText}

User Question: ${content}`;

        messageContent = contextInfo;
      }

      await this.client.createMessage({
        conversationId,
        payload: { type: "text", text: messageContent },
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

      const messages: ChatMessage[] = response.messages.map((msg) => ({
        id: msg.id,
        type: msg.userId === "user" ? "user" : "bot",
        content:
          msg.payload.type === "text" ? msg.payload.text : "[Non-text message]",
        timestamp: new Date(msg.createdAt),
      }));

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
