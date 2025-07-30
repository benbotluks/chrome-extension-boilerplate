import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BotpressService } from "./BotpressService";
import type { BotpressConfig, PageContent } from "../types";

// Create a mock client that we can control
const createMockClient = () => ({
  createConversation: vi.fn(),
  createMessage: vi.fn(),
  listMessages: vi.fn(),
  listConversations: vi.fn(),
  deleteConversation: vi.fn(),
});

// Mock the @botpress/chat module
vi.mock("@botpress/chat", () => {
  let mockClient: any = null;

  return {
    Client: {
      connect: vi.fn().mockImplementation(async () => {
        mockClient = createMockClient();
        return mockClient;
      }),
    },
    // Export a way to get the current mock client for testing
    __getMockClient: () => mockClient,
  };
});

describe("BotpressService", () => {
  let service: BotpressService;
  let mockConfig: BotpressConfig;
  let mockClient: any;

  beforeEach(async () => {
    // Import the chat module to get access to the mock
    const chatModule = (await import("@botpress/chat")) as any;

    service = new BotpressService();
    mockConfig = {
      webhookId: "test-webhook-id",
      isConfigured: true,
    };

    // Configure the service to get the mock client
    await service.configure(mockConfig);
    mockClient = chatModule.__getMockClient();

    // Reset all mocks after configuration
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("configure", () => {
    it("should configure the service with valid config", async () => {
      const newService = new BotpressService();
      const chatModule = (await import("@botpress/chat")) as any;

      await newService.configure(mockConfig);

      expect(newService.isConfigured()).toBe(true);
      expect(newService.getConfig()).toEqual(mockConfig);
      expect(chatModule.Client.connect).toHaveBeenCalledWith({
        webhookId: "test-webhook-id",
      });
    });

    it("should not be configured with invalid config", async () => {
      const newService = new BotpressService();
      const chatModule = (await import("@botpress/chat")) as any;
      const invalidConfig = { webhookId: "", isConfigured: false };

      await newService.configure(invalidConfig);

      expect(newService.isConfigured()).toBe(false);
      // Should not call connect for invalid config
      expect(chatModule.Client.connect).not.toHaveBeenCalled();
    });
  });

  describe("testConnection", () => {
    it("should return success when connection is valid", async () => {
      mockClient.listConversations.mockResolvedValue({ conversations: [] });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockClient.listConversations).toHaveBeenCalledWith({});
    });

    it("should return error when service is not configured", async () => {
      const unconfiguredService = new BotpressService();
      const result = await unconfiguredService.testConnection();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("authentication");
      expect(result.error?.message).toContain("not configured");
    });

    it("should handle authentication errors", async () => {
      const authError = new Error("Unauthorized");
      (authError as any).status = 401;
      mockClient.listConversations.mockRejectedValue(authError);

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("authentication");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("fetch failed");
      (networkError as any).code = "NETWORK_ERROR";
      mockClient.listConversations.mockRejectedValue(networkError);

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("network");
    });
  });

  describe("createConversation", () => {
    it("should create a conversation successfully", async () => {
      const mockConversation = { id: "conv-123" };
      mockClient.createConversation.mockResolvedValue({
        conversation: mockConversation,
      });

      const result = await service.createConversation();

      expect(result.conversationId).toBe("conv-123");
      expect(result.error).toBeUndefined();
      expect(mockClient.createConversation).toHaveBeenCalledWith({});
    });

    it("should return error when service is not configured", async () => {
      const unconfiguredService = new BotpressService();
      const result = await unconfiguredService.createConversation();

      expect(result.conversationId).toBeUndefined();
      expect(result.error?.type).toBe("authentication");
    });

    it("should handle API errors", async () => {
      const apiError = new Error("Bad request");
      (apiError as any).status = 400;
      mockClient.createConversation.mockRejectedValue(apiError);

      const result = await service.createConversation();

      expect(result.conversationId).toBeUndefined();
      expect(result.error?.type).toBe("validation");
    });
  });

  describe("sendMessage", () => {
    const conversationId = "conv-123";
    const message = "Hello, bot!";

    it("should send a message successfully", async () => {
      mockClient.createMessage.mockResolvedValue({});

      const result = await service.sendMessage(conversationId, message);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockClient.createMessage).toHaveBeenCalledWith({
        conversationId,
        payload: {
          type: "text",
          text: message,
        },
      });
    });

    it("should send a message with page context", async () => {
      mockClient.createMessage.mockResolvedValue({});

      const pageContext: PageContent = {
        url: "https://example.com",
        title: "Test Page",
        domain: "example.com",
        contentType: "article",
        extractedText: "This is test content",
        metadata: {},
        extractedAt: new Date(),
      };

      const result = await service.sendMessage(
        conversationId,
        message,
        pageContext
      );

      expect(result.success).toBe(true);
      expect(mockClient.createMessage).toHaveBeenCalledWith({
        conversationId,
        payload: {
          type: "text",
          text: expect.stringContaining("Page Context:"),
        },
      });
    });

    it("should return error when service is not configured", async () => {
      const unconfiguredService = new BotpressService();
      const result = await unconfiguredService.sendMessage(
        conversationId,
        message
      );

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("authentication");
    });

    it("should handle rate limiting errors", async () => {
      const rateLimitError = new Error("Too many requests");
      (rateLimitError as any).status = 429;
      mockClient.createMessage.mockRejectedValue(rateLimitError);

      const result = await service.sendMessage(conversationId, message);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("api_limit");
    });
  });

  describe("getMessages", () => {
    const conversationId = "conv-123";

    it("should retrieve messages successfully", async () => {
      const mockMessages = [
        {
          id: "msg-1",
          userId: "user",
          payload: { type: "text", text: "Hello" },
          createdAt: "2024-01-01T10:00:00Z",
        },
        {
          id: "msg-2",
          userId: "bot",
          payload: { type: "text", text: "Hi there!" },
          createdAt: "2024-01-01T10:01:00Z",
        },
      ];
      mockClient.listMessages.mockResolvedValue({ messages: mockMessages });

      const result = await service.getMessages(conversationId);

      expect(result.messages).toHaveLength(2);
      expect(result.messages?.[0]).toMatchObject({
        id: "msg-1",
        type: "user",
        content: "Hello",
      });
      expect(result.messages?.[1]).toMatchObject({
        id: "msg-2",
        type: "bot",
        content: "Hi there!",
      });
      expect(result.error).toBeUndefined();
    });

    it("should handle non-text messages", async () => {
      const mockMessages = [
        {
          id: "msg-1",
          userId: "bot",
          payload: { type: "image", url: "https://example.com/image.jpg" },
          createdAt: "2024-01-01T10:00:00Z",
        },
      ];
      mockClient.listMessages.mockResolvedValue({ messages: mockMessages });

      const result = await service.getMessages(conversationId);

      expect(result.messages?.[0].content).toBe("[Non-text message]");
    });

    it("should return error when service is not configured", async () => {
      const unconfiguredService = new BotpressService();
      const result = await unconfiguredService.getMessages(conversationId);

      expect(result.messages).toBeUndefined();
      expect(result.error?.type).toBe("authentication");
    });
  });

  describe("listConversations", () => {
    it("should list conversations successfully", async () => {
      const mockConversations = [
        {
          id: "conv-1",
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:30:00Z",
        },
      ];
      mockClient.listConversations.mockResolvedValue({
        conversations: mockConversations,
      });
      mockClient.listMessages.mockResolvedValue({ messages: [] });

      const result = await service.listConversations();

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations?.[0]).toMatchObject({
        id: "conv-1",
        conversationId: "conv-1",
      });
      expect(result.error).toBeUndefined();
    });

    it("should return error when service is not configured", async () => {
      const unconfiguredService = new BotpressService();
      const result = await unconfiguredService.listConversations();

      expect(result.conversations).toBeUndefined();
      expect(result.error?.type).toBe("authentication");
    });
  });

  describe("deleteConversation", () => {
    const conversationId = "conv-123";

    it("should delete conversation successfully", async () => {
      mockClient.deleteConversation.mockResolvedValue({});

      const result = await service.deleteConversation(conversationId);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockClient.deleteConversation).toHaveBeenCalledWith({
        id: conversationId,
      });
    });

    it("should return error when service is not configured", async () => {
      const unconfiguredService = new BotpressService();
      const result = await unconfiguredService.deleteConversation(
        conversationId
      );

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("authentication");
    });
  });

  describe("error handling", () => {
    it("should categorize network errors correctly", async () => {
      const networkError = new Error("fetch failed");
      mockClient.listConversations.mockRejectedValue(networkError);

      const result = await service.testConnection();

      expect(result.error?.type).toBe("network");
      expect(result.error?.message).toContain("Network error");
    });

    it("should categorize authentication errors correctly", async () => {
      const authError = new Error("Forbidden");
      (authError as any).status = 403;
      mockClient.listConversations.mockRejectedValue(authError);

      const result = await service.testConnection();

      expect(result.error?.type).toBe("authentication");
      expect(result.error?.message).toContain("Authentication failed");
    });

    it("should categorize rate limit errors correctly", async () => {
      const rateLimitError = new Error("Too many requests");
      (rateLimitError as any).status = 429;
      mockClient.createMessage.mockRejectedValue(rateLimitError);

      const result = await service.sendMessage("conv-123", "test");

      expect(result.error?.type).toBe("api_limit");
      expect(result.error?.message).toContain("rate limit");
    });

    it("should categorize validation errors correctly", async () => {
      const validationError = new Error("Invalid webhook ID");
      (validationError as any).status = 400;
      mockClient.createConversation.mockRejectedValue(validationError);

      const result = await service.createConversation();

      expect(result.error?.type).toBe("validation");
      expect(result.error?.message).toBe("Invalid webhook ID");
    });

    it("should categorize unknown errors correctly", async () => {
      const unknownError = new Error("Internal server error");
      (unknownError as any).status = 500;
      mockClient.listConversations.mockRejectedValue(unknownError);

      const result = await service.testConnection();

      expect(result.error?.type).toBe("unknown");
      expect(result.error?.message).toBe("Internal server error");
    });
  });

  describe("utility methods", () => {
    it("should check configuration status correctly", async () => {
      const newService = new BotpressService();
      expect(newService.isConfigured()).toBe(false);

      await newService.configure(mockConfig);
      expect(newService.isConfigured()).toBe(true);

      await newService.configure({ webhookId: "", isConfigured: false });
      expect(newService.isConfigured()).toBe(false);
    });

    it("should return current configuration", async () => {
      const newService = new BotpressService();
      expect(newService.getConfig()).toBeNull();

      await newService.configure(mockConfig);
      expect(newService.getConfig()).toEqual(mockConfig);
    });
  });
});
