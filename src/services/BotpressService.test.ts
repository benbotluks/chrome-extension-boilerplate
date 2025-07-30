import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BotpressService } from "./BotpressService";
import type { BotpressConfig, PageContent } from "../types";

// Mock the @botpress/client
const mockClient = {
  getBot: vi.fn(),
  createConversation: vi.fn(),
  createMessage: vi.fn(),
  listMessages: vi.fn(),
  listConversations: vi.fn(),
  deleteConversation: vi.fn(),
};

const MockClient = vi.fn().mockImplementation(() => mockClient);

vi.mock("@botpress/client", () => ({
  Client: MockClient,
}));

describe("BotpressService", () => {
  let service: BotpressService;
  let mockConfig: BotpressConfig;

  beforeEach(() => {
    service = new BotpressService();
    mockConfig = {
      token: "test-token",
      botId: "test-bot-id",
      isConfigured: true,
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("configure", () => {
    it("should configure the service with valid config", () => {
      service.configure(mockConfig);

      expect(service.isConfigured()).toBe(true);
      expect(service.getConfig()).toEqual(mockConfig);
      expect(MockClient).toHaveBeenCalledWith({ token: "test-token" });
    });

    it("should not be configured with invalid config", () => {
      const invalidConfig = { token: "", botId: "", isConfigured: false };
      service.configure(invalidConfig);

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe("testConnection", () => {
    it("should return success when connection is valid", async () => {
      service.configure(mockConfig);
      mockClient.getBot.mockResolvedValue({ id: "test-bot-id" });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockClient.getBot).toHaveBeenCalledWith({ id: "test-bot-id" });
    });

    it("should return error when service is not configured", async () => {
      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("authentication");
      expect(result.error?.message).toContain("not configured");
    });

    it("should handle authentication errors", async () => {
      service.configure(mockConfig);
      const authError = new Error("Unauthorized");
      (authError as any).status = 401;
      mockClient.getBot.mockRejectedValue(authError);

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("authentication");
    });

    it("should handle network errors", async () => {
      service.configure(mockConfig);
      const networkError = new Error("fetch failed");
      (networkError as any).code = "NETWORK_ERROR";
      mockClient.getBot.mockRejectedValue(networkError);

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("network");
    });
  });

  describe("createConversation", () => {
    it("should create a conversation successfully", async () => {
      service.configure(mockConfig);
      const mockConversation = { id: "conv-123" };
      mockClient.createConversation.mockResolvedValue({
        conversation: mockConversation,
      });

      const result = await service.createConversation();

      expect(result.conversationId).toBe("conv-123");
      expect(result.error).toBeUndefined();
      expect(mockClient.createConversation).toHaveBeenCalledWith({
        botId: "test-bot-id",
      });
    });

    it("should return error when service is not configured", async () => {
      const result = await service.createConversation();

      expect(result.conversationId).toBeUndefined();
      expect(result.error?.type).toBe("authentication");
    });

    it("should handle API errors", async () => {
      service.configure(mockConfig);
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
      service.configure(mockConfig);
      mockClient.createMessage.mockResolvedValue({});

      const result = await service.sendMessage(conversationId, message);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockClient.createMessage).toHaveBeenCalledWith({
        conversationId,
        userId: "user",
        payload: {
          type: "text",
          text: message,
        },
      });
    });

    it("should send a message with page context", async () => {
      service.configure(mockConfig);
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
        userId: "user",
        payload: {
          type: "text",
          text: expect.stringContaining("Page Context:"),
        },
      });
    });

    it("should return error when service is not configured", async () => {
      const result = await service.sendMessage(conversationId, message);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("authentication");
    });

    it("should handle rate limiting errors", async () => {
      service.configure(mockConfig);
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
      service.configure(mockConfig);
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
      service.configure(mockConfig);
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
      const result = await service.getMessages(conversationId);

      expect(result.messages).toBeUndefined();
      expect(result.error?.type).toBe("authentication");
    });
  });

  describe("listConversations", () => {
    it("should list conversations successfully", async () => {
      service.configure(mockConfig);
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
      const result = await service.listConversations();

      expect(result.conversations).toBeUndefined();
      expect(result.error?.type).toBe("authentication");
    });
  });

  describe("deleteConversation", () => {
    const conversationId = "conv-123";

    it("should delete conversation successfully", async () => {
      service.configure(mockConfig);
      mockClient.deleteConversation.mockResolvedValue({});

      const result = await service.deleteConversation(conversationId);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockClient.deleteConversation).toHaveBeenCalledWith({
        id: conversationId,
      });
    });

    it("should return error when service is not configured", async () => {
      const result = await service.deleteConversation(conversationId);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("authentication");
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      service.configure(mockConfig);
    });

    it("should categorize network errors correctly", async () => {
      const networkError = new Error("fetch failed");
      mockClient.getBot.mockRejectedValue(networkError);

      const result = await service.testConnection();

      expect(result.error?.type).toBe("network");
      expect(result.error?.message).toContain("Network error");
    });

    it("should categorize authentication errors correctly", async () => {
      const authError = new Error("Forbidden");
      (authError as any).status = 403;
      mockClient.getBot.mockRejectedValue(authError);

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
      const validationError = new Error("Invalid bot ID");
      (validationError as any).status = 400;
      mockClient.createConversation.mockRejectedValue(validationError);

      const result = await service.createConversation();

      expect(result.error?.type).toBe("validation");
      expect(result.error?.message).toBe("Invalid bot ID");
    });

    it("should categorize unknown errors correctly", async () => {
      const unknownError = new Error("Internal server error");
      (unknownError as any).status = 500;
      mockClient.getBot.mockRejectedValue(unknownError);

      const result = await service.testConnection();

      expect(result.error?.type).toBe("unknown");
      expect(result.error?.message).toBe("Internal server error");
    });
  });

  describe("utility methods", () => {
    it("should check configuration status correctly", () => {
      expect(service.isConfigured()).toBe(false);

      service.configure(mockConfig);
      expect(service.isConfigured()).toBe(true);

      service.configure({ token: "", botId: "", isConfigured: false });
      expect(service.isConfigured()).toBe(false);
    });

    it("should return current configuration", () => {
      expect(service.getConfig()).toBeNull();

      service.configure(mockConfig);
      expect(service.getConfig()).toEqual(mockConfig);
    });
  });
});
