import { describe, it, expect, beforeEach, vi } from "vitest";
import { StorageService } from "./StorageService";
import { BotpressConfig, ConversationSession } from "../types";

describe("StorageService", () => {
  let storageService: StorageService;
  let mockLocalStorage: any;
  let mockSyncStorage: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Get fresh instance
    storageService = StorageService.getInstance();

    // Setup storage mocks
    mockLocalStorage = {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getBytesInUse: vi.fn().mockResolvedValue(1000),
    };

    mockSyncStorage = {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getBytesInUse: vi.fn().mockResolvedValue(500),
    };

    global.chrome = {
      storage: {
        local: mockLocalStorage,
        sync: mockSyncStorage,
      },
    } as any;

    // Mock crypto operations
    const mockEncryptedData = new Uint8Array([1, 2, 3, 4]);
    global.crypto.subtle.encrypt = vi
      .fn()
      .mockResolvedValue(mockEncryptedData.buffer);
    global.crypto.subtle.decrypt = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode("decrypted-token"));
    global.crypto.subtle.importKey = vi.fn().mockResolvedValue({});
    global.crypto.subtle.deriveKey = vi.fn().mockResolvedValue({});
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = StorageService.getInstance();
      const instance2 = StorageService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("Botpress Configuration", () => {
    const mockConfig: BotpressConfig = {
      token: "test-token",
      botId: "test-bot-id",
      isConfigured: true,
    };

    it("should save Botpress config with encryption", async () => {
      await storageService.saveBotpressConfig(mockConfig);

      expect(mockSyncStorage.set).toHaveBeenCalledWith({
        botpress_config: expect.objectContaining({
          botId: "test-bot-id",
          isConfigured: true,
          token: expect.objectContaining({
            data: expect.any(String),
            iv: expect.any(String),
            salt: expect.any(String),
          }),
        }),
      });
    });

    it("should load and decrypt Botpress config", async () => {
      const encryptedConfig = {
        botId: "test-bot-id",
        isConfigured: true,
        token: {
          data: "01020304",
          iv: "01020304050607080910111213141516",
          salt: "01020304050607080910111213141516",
        },
      };

      mockSyncStorage.get.mockResolvedValue({
        botpress_config: encryptedConfig,
      });

      const result = await storageService.loadBotpressConfig();

      expect(result).toEqual({
        botId: "test-bot-id",
        isConfigured: true,
        token: "decrypted-token",
      });
    });

    it("should return null when no config exists", async () => {
      mockSyncStorage.get.mockResolvedValue({});

      const result = await storageService.loadBotpressConfig();

      expect(result).toBeNull();
    });

    it("should handle encryption errors", async () => {
      global.crypto.subtle.encrypt = vi
        .fn()
        .mockRejectedValue(new Error("Encryption failed"));

      await expect(
        storageService.saveBotpressConfig(mockConfig)
      ).rejects.toThrow("Failed to save Botpress config");
    });
  });

  describe("Conversation Management", () => {
    const mockConversation: ConversationSession = {
      id: "conv-123",
      url: "https://example.com",
      title: "Test Page",
      messages: [],
      createdAt: new Date("2024-01-01"),
      lastActivity: new Date("2024-01-01"),
    };

    it("should save conversation to local storage", async () => {
      mockLocalStorage.get.mockResolvedValue({ conversations: {} });

      await storageService.saveConversation(mockConversation);

      expect(mockLocalStorage.set).toHaveBeenCalledWith({
        conversations: {
          "conv-123": mockConversation,
        },
      });
    });

    it("should load specific conversation by ID", async () => {
      mockLocalStorage.get.mockResolvedValue({
        conversations: {
          "conv-123": mockConversation,
        },
      });

      const result = await storageService.loadConversation("conv-123");

      expect(result).toEqual(mockConversation);
    });

    it("should return null for non-existent conversation", async () => {
      mockLocalStorage.get.mockResolvedValue({ conversations: {} });

      const result = await storageService.loadConversation("non-existent");

      expect(result).toBeNull();
    });

    it("should delete conversation", async () => {
      mockLocalStorage.get.mockResolvedValue({
        conversations: {
          "conv-123": mockConversation,
          "conv-456": { ...mockConversation, id: "conv-456" },
        },
      });

      await storageService.deleteConversation("conv-123");

      expect(mockLocalStorage.set).toHaveBeenCalledWith({
        conversations: {
          "conv-456": { ...mockConversation, id: "conv-456" },
        },
      });
    });

    it("should get conversations by URL", async () => {
      const conversations = {
        "conv-123": mockConversation,
        "conv-456": {
          ...mockConversation,
          id: "conv-456",
          url: "https://other.com",
        },
        "conv-789": { ...mockConversation, id: "conv-789" },
      };

      mockLocalStorage.get.mockResolvedValue({ conversations });

      const result = await storageService.getConversationsByUrl(
        "https://example.com"
      );

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(["conv-123", "conv-789"]);
    });
  });

  describe("Session Management", () => {
    it("should set current session", async () => {
      await storageService.setCurrentSession("session-123");

      expect(mockLocalStorage.set).toHaveBeenCalledWith({
        current_session: "session-123",
      });
    });

    it("should get current session", async () => {
      mockLocalStorage.get.mockResolvedValue({
        current_session: "session-123",
      });

      const result = await storageService.getCurrentSession();

      expect(result).toBe("session-123");
    });

    it("should return null when no current session", async () => {
      mockLocalStorage.get.mockResolvedValue({});

      const result = await storageService.getCurrentSession();

      expect(result).toBeNull();
    });
  });

  describe("Storage Quota Management", () => {
    it("should calculate storage quota correctly", async () => {
      mockLocalStorage.getBytesInUse.mockResolvedValue(1000);
      mockSyncStorage.getBytesInUse.mockResolvedValue(500);

      const quota = await storageService.getStorageQuota();

      expect(quota.used).toBe(1500);
      expect(quota.available).toBe(5242880 + 102400 - 1500);
      expect(quota.percentage).toBeCloseTo((1500 / (5242880 + 102400)) * 100);
    });
  });

  describe("Conversation Cleanup", () => {
    it("should cleanup old conversations", async () => {
      const oldDate = new Date("2023-01-01");
      const recentDate = new Date("2024-01-01");

      const baseConversation: ConversationSession = {
        id: "base",
        url: "https://example.com",
        title: "Test Page",
        messages: [],
        createdAt: new Date("2024-01-01"),
        lastActivity: new Date("2024-01-01"),
      };

      const conversations = {
        "old-1": { ...baseConversation, id: "old-1", lastActivity: oldDate },
        "old-2": { ...baseConversation, id: "old-2", lastActivity: oldDate },
        "recent-1": {
          ...baseConversation,
          id: "recent-1",
          lastActivity: recentDate,
        },
      };

      mockLocalStorage.get.mockResolvedValue({ conversations });
      mockSyncStorage.get.mockResolvedValue({});

      // Mock delete operations
      mockLocalStorage.set.mockImplementation(async (_: any) => {
        // Mock implementation for delete operations
      });

      const deletedCount = await storageService.cleanupOldConversations();

      expect(deletedCount).toBeGreaterThan(0);
    });
  });

  describe("Storage Configuration", () => {
    it("should return default config when none exists", async () => {
      mockSyncStorage.get.mockResolvedValue({});

      const config = await storageService.getStorageConfig();

      expect(config).toEqual({
        maxConversations: 100,
        maxMessageHistory: 1000,
        cleanupThresholdDays: 30,
      });
    });

    it("should update storage configuration", async () => {
      const currentConfig = {
        maxConversations: 100,
        maxMessageHistory: 1000,
        cleanupThresholdDays: 30,
      };

      mockSyncStorage.get.mockResolvedValue({
        storage_config: currentConfig,
      });

      await storageService.updateStorageConfig({
        maxConversations: 50,
      });

      expect(mockSyncStorage.set).toHaveBeenCalledWith({
        storage_config: {
          ...currentConfig,
          maxConversations: 50,
        },
      });
    });
  });

  describe("Data Management", () => {
    it("should clear all data", async () => {
      await storageService.clearAllData();

      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(mockSyncStorage.clear).toHaveBeenCalled();
    });

    it("should export conversations", async () => {
      const testConversation: ConversationSession = {
        id: "conv-123",
        url: "https://example.com",
        title: "Test Page",
        messages: [],
        createdAt: new Date("2024-01-01"),
        lastActivity: new Date("2024-01-01"),
      };

      const conversations = {
        "conv-123": testConversation,
      };

      mockLocalStorage.get.mockResolvedValue({ conversations });

      const exported = await storageService.exportConversations();

      // JSON.stringify converts dates to strings, so we need to account for that
      const expectedExport = JSON.parse(JSON.stringify(conversations));
      expect(JSON.parse(exported)).toEqual(expectedExport);
    });

    it("should import conversations", async () => {
      const testConversation: ConversationSession = {
        id: "conv-123",
        url: "https://example.com",
        title: "Test Page",
        messages: [],
        createdAt: new Date("2024-01-01"),
        lastActivity: new Date("2024-01-01"),
      };

      const conversations = {
        "conv-123": testConversation,
      };

      await storageService.importConversations(JSON.stringify(conversations));

      expect(mockLocalStorage.set).toHaveBeenCalledWith({
        conversations: JSON.parse(JSON.stringify(conversations)),
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockSyncStorage.set.mockRejectedValue(
        new Error("Storage quota exceeded")
      );

      const config: BotpressConfig = {
        token: "test-token",
        botId: "test-bot-id",
        isConfigured: true,
      };

      await expect(storageService.saveBotpressConfig(config)).rejects.toThrow(
        "Failed to save Botpress config"
      );
    });

    it("should handle decryption errors", async () => {
      global.crypto.subtle.decrypt = vi
        .fn()
        .mockRejectedValue(new Error("Decryption failed"));

      mockSyncStorage.get.mockResolvedValue({
        botpress_config: {
          token: { data: "invalid", iv: "invalid", salt: "invalid" },
          botId: "test",
          isConfigured: true,
        },
      });

      await expect(storageService.loadBotpressConfig()).rejects.toThrow(
        "Failed to load Botpress config"
      );
    });

    it("should handle invalid JSON in import", async () => {
      await expect(
        storageService.importConversations("invalid json")
      ).rejects.toThrow("Failed to import conversations");
    });
  });
});
