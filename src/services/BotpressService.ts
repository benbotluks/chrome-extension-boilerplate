import * as chat from "@botpress/chat";
import type {
  BotpressConfig,
  ChatMessage,
  ConversationSession,
  IncomingMessageEvent,
} from "../types";
import StorageService from "./StorageService";
import { ServiceErrorWrapper, ServiceResult } from "../utils/serviceErrorWrapper";

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
  async testConnection(): Promise<ServiceResult<boolean>> {
    console.log("Testing connection...", {
      client: !!this.client,
      config: !!this.config,
    });

    return ServiceErrorWrapper.execute(async () => {
      if (!this.client || !this.config) {
        console.log("Service not configured");
        throw new Error("Service not configured. Please provide valid credentials.");
      }

      console.log("Attempting to list conversations...");
      // Test connection by attempting to get bot info
      const result = await this.client.listConversations({});
      console.log("Connection test successful:", result);
      return true;
    }, "BotpressService.testConnection");
  }

  /**
   * Create a new conversation
   */
  async createConversation(): Promise<ServiceResult<string>> {
    return ServiceErrorWrapper.execute(async () => {
      if (!this.client || !this.config) {
        throw new Error("Service not configured");
      }

      const response = await this.client.createConversation({});
      return response.conversation.id;
    }, "BotpressService.createConversation");
  }

  /**
   * Send a message to a conversation with page content context
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<ServiceResult<boolean>> {
    return ServiceErrorWrapper.execute(async () => {
      if (!this.client || !this.config) {
        throw new Error("Service not configured");
      }

      await this.client.createMessage({
        conversationId,
        payload: { type: "text", text: content },
      });

      return true;
    }, "BotpressService.sendMessage");
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(conversationId: string): Promise<ServiceResult<ChatMessage[]>> {
    return ServiceErrorWrapper.execute(async () => {
      if (!this.client || !this.config) {
        throw new Error("Service not configured");
      }

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
        } catch (error) {
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

      return messages;
    }, "BotpressService.getMessages");
  }

  async listConversations(): Promise<ServiceResult<ConversationSession[]>> {
    return ServiceErrorWrapper.execute(async () => {
      if (!this.client || !this.config) {
        throw new Error("Service not configured");
      }

      const response = await this.client.listConversations({});

      const conversations: ConversationSession[] = await Promise.all(
        response.conversations.map(async (conv) => {
          // Get messages for each conversation to build the session
          const messagesResult = await this.getMessages(conv.id);
          const messages = ServiceErrorWrapper.isSuccess(messagesResult) ? messagesResult.data : [];

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

      return conversations;
    }, "BotpressService.listConversations");
  }

  async deleteConversation(conversationId: string): Promise<ServiceResult<boolean>> {
    return ServiceErrorWrapper.execute(async () => {
      if (!this.client || !this.config) {
        throw new Error("Service not configured");
      }

      await this.client.deleteConversation({
        id: conversationId,
      });

      return true;
    }, "BotpressService.deleteConversation");
  }

  async startListening(
    conversationId: string,
    onMessage: (message: ChatMessage) => void
  ): Promise<ServiceResult<boolean>> {
    return ServiceErrorWrapper.execute(async () => {
      if (!this.client || !this.config) {
        throw new Error("Service not configured");
      }

      // Stop any existing listener first
      const stopResult = await this.stopListening();
      if (ServiceErrorWrapper.isFailure(stopResult)) {
        console.warn("Failed to stop existing listener:", stopResult.error);
      }

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

      return true;
    }, "BotpressService.startListening");
  }

  async stopListening(): Promise<ServiceResult<boolean>> {
    return ServiceErrorWrapper.execute(async () => {
      if (this.listener) {
        await this.listener.disconnect();
        this.listener = null;
      }
      return true;
    }, "BotpressService.stopListening");
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
