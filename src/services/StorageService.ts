/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BotpressConfig,
  BotpressUserSession,
  ConversationSession,
  StorageQuota,
  StorageConfig,
  EncryptedData,
  ContentScrapingConfig,
} from "../types";

/**
 * Chrome Extension Storage Service
 * Handles local and sync storage operations with encryption for sensitive data
 */
export class StorageService {
  private static instance: StorageService;
  private readonly STORAGE_KEYS = {
    BOTPRESS_CONFIG: "botpress_config",
    CONVERSATIONS: "conversations",
    STORAGE_CONFIG: "storage_config",
    CURRENT_SESSION: "current_session",
    USER_SESSION: "user_session",
    CONTENT_SCRAPING_CONFIG: "content_scraping_config",
  } as const;

  // Check if Chrome extension APIs are available
  private get isExtensionContext(): boolean {
    return Boolean(
      typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync
    );
  }

  // Fallback storage for non-extension environments
  private async getFromStorage(key: string): Promise<any> {
    if (this.isExtensionContext) {
      const result = await chrome.storage.sync.get([key]);
      return result[key];
    } else {
      // Fallback to localStorage for development/testing
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    }
  }

  private async setToStorage(key: string, value: any): Promise<void> {
    if (this.isExtensionContext) {
      await chrome.storage.sync.set({ [key]: value });
    } else {
      // Fallback to localStorage for development/testing
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  private async getFromLocalStorage(key: string): Promise<any> {
    if (this.isExtensionContext) {
      const result = await chrome.storage.local.get([key]);
      return result[key];
    } else {
      // Fallback to localStorage for development/testing
      const stored = localStorage.getItem(`local_${key}`);
      return stored ? JSON.parse(stored) : null;
    }
  }

  private async setToLocalStorage(key: string, value: any): Promise<void> {
    if (this.isExtensionContext) {

      await chrome.storage.local.set({ [key]: value });
    } else {
      // Fallback to localStorage for development/testing
      localStorage.setItem(`local_${key}`, JSON.stringify(value));
    }
  }

  private readonly DEFAULT_CONFIG: StorageConfig = {
    maxConversations: 100,
    maxMessageHistory: 1000,
    cleanupThresholdDays: 30,
  };

  private constructor() { }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Encrypt sensitive data using Web Crypto API
   */
  private async encryptData(data: string): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate a random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive key from a base key (in production, this should be more secure)
    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("botpress-extension-key"),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      dataBuffer
    );

    return {
      data: Array.from(new Uint8Array(encryptedBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      iv: Array.from(iv)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      salt: Array.from(salt)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    };
  }

  /**
   * Decrypt sensitive data using Web Crypto API
   */
  private async decryptData(encryptedData: EncryptedData): Promise<string> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Convert hex strings back to Uint8Arrays
    const data = new Uint8Array(
      encryptedData.data
        .match(/.{2}/g)!
        .map((byte: string) => parseInt(byte, 16))
    );
    const iv = new Uint8Array(
      encryptedData.iv.match(/.{2}/g)!.map((byte: string) => parseInt(byte, 16))
    );
    const salt = new Uint8Array(
      encryptedData.salt
        .match(/.{2}/g)!
        .map((byte: string) => parseInt(byte, 16))
    );

    // Derive the same key
    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("botpress-extension-key"),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    return decoder.decode(decryptedBuffer);
  }

  /**
   * Create a secure hash of the user key for storage namespacing
   * This avoids exposing the actual user key in storage keys
   */
  private async hashUserKey(userKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(userKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async saveBotpressConfig(config: BotpressConfig): Promise<void> {
    return withErrorHandling("save Botpress config", async () => {
      const configToStore = {
        ...config,
      };
      await this.setToStorage(this.STORAGE_KEYS.BOTPRESS_CONFIG, configToStore);
    })

  }

  /**
   * Load Botpress configuration with decryption
   */
  async loadBotpressConfig(): Promise<BotpressConfig | null> {
    return withErrorHandling("load Botpress config", async () => {
      const storedConfig = await this.getFromStorage(
        this.STORAGE_KEYS.BOTPRESS_CONFIG
      );
      if (!storedConfig) return null;
      return { ...storedConfig, };
    })
  }

  /**
   * Clear Botpress configuration
   */
  async clearBotpressConfig(): Promise<void> {
    return withErrorHandling("clear Botpress config", async () => {
      if (this.isExtensionContext) {
        await chrome.storage.sync.remove([this.STORAGE_KEYS.BOTPRESS_CONFIG]);
      } else {
        localStorage.removeItem(this.STORAGE_KEYS.BOTPRESS_CONFIG);
      }
    })
  }

  /**
   * Save user key securely to sync storage with encryption
   */
  async saveUserKey(userKey: string): Promise<void> {
    return withErrorHandling("save user key", async () => {
      const encryptedUserKey = await this.encryptData(userKey);

      const userSession: BotpressUserSession = {
        userKey: encryptedUserKey,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      await this.setToStorage(this.STORAGE_KEYS.USER_SESSION, userSession);
    });
  }

  async loadUserKey(): Promise<string | null> {
    return withErrorHandling("load user key", async () => {
      const userSession = await this.getFromStorage(this.STORAGE_KEYS.USER_SESSION);

      if (!userSession || !userSession.userKey) return null;

      let decryptedUserKey: string;
      try {
        if (typeof userSession.userKey === "string") {
          decryptedUserKey = userSession.userKey;
        } else {
          decryptedUserKey = await this.decryptData(userSession.userKey);
        }
      } catch (decryptError) {
        console.warn("Failed to decrypt user key, treating as invalid:", decryptError);
        return null;
      }

      if (typeof userSession.userKey === "string") {
        const encryptedUserKey = await this.encryptData(decryptedUserKey);
        userSession.userKey = encryptedUserKey;
      }

      userSession.lastUsed = new Date();
      await this.setToStorage(this.STORAGE_KEYS.USER_SESSION, userSession);

      return decryptedUserKey;
    });
  }

  async clearUserKey(): Promise<void> {
    return withErrorHandling("clear user key", async () => {
      if (this.isExtensionContext) {
        await chrome.storage.sync.remove([this.STORAGE_KEYS.USER_SESSION]);
      } else {
        localStorage.removeItem(this.STORAGE_KEYS.USER_SESSION);
      }
    });
  }

  async saveConversation(conversation: ConversationSession): Promise<void> {
    return withErrorHandling("save conversation", async () => {
      const userKey = await this.loadUserKey();
      if (!userKey) throw new Error("No user key found - cannot save conversation");

      const conversations = await this.loadAllConversations();
      conversations[conversation.id] = conversation;

      const hashedUserKey = await this.hashUserKey(userKey);
      const userSpecificKey = `${this.STORAGE_KEYS.CONVERSATIONS}_${hashedUserKey}`;
      await this.setToLocalStorage(userSpecificKey, conversations);
    });
  }

  async loadConversation(conversationId: string): Promise<ConversationSession | null> {
    return withErrorHandling("load conversation", async () => {
      const conversations = await this.loadAllConversations();
      return conversations[conversationId] || null;
    });
  }

  async loadAllConversations(): Promise<Record<string, ConversationSession>> {
    return withErrorHandling("load conversations", async () => {
      const userKey = await this.loadUserKey();
      if (!userKey) return {};

      const hashedUserKey = await this.hashUserKey(userKey);
      const userSpecificKey = `${this.STORAGE_KEYS.CONVERSATIONS}_${hashedUserKey}`;
      const conversations = await this.getFromLocalStorage(userSpecificKey);
      return conversations || {};
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    return withErrorHandling("delete conversation", async () => {
      const userKey = await this.loadUserKey();
      if (!userKey) throw new Error("No user key found - cannot delete conversation");

      const conversations = await this.loadAllConversations();
      delete conversations[conversationId];

      const hashedUserKey = await this.hashUserKey(userKey);
      const userSpecificKey = `${this.STORAGE_KEYS.CONVERSATIONS}_${hashedUserKey}`;
      await this.setToLocalStorage(userSpecificKey, conversations);
    });
  }

  async getConversationsByUrl(url: string): Promise<ConversationSession[]> {
    return withErrorHandling("get conversations by URL", async () => {
      const conversations = await this.loadAllConversations();
      return Object.values(conversations).filter((conv) => conv.url === url);
    });
  }

  async setCurrentSession(sessionId: string): Promise<void> {
    return withErrorHandling("set current session", async () => {
      await this.setToLocalStorage(this.STORAGE_KEYS.CURRENT_SESSION, sessionId);
    });
  }

  async getCurrentSession(): Promise<string | null> {
    return withErrorHandling("get current session", async () => {
      const sessionId = await this.getFromLocalStorage(this.STORAGE_KEYS.CURRENT_SESSION);
      return sessionId || null;
    });
  }

  async getStorageQuota(): Promise<StorageQuota> {
    return withErrorHandling("get storage quota", async () => {
      if (this.isExtensionContext) {
        const localUsage = await chrome.storage.local.getBytesInUse();
        const syncUsage = await chrome.storage.sync.getBytesInUse();

        const LOCAL_QUOTA = chrome.storage.local.QUOTA_BYTES || 5242880;
        const SYNC_QUOTA = chrome.storage.sync.QUOTA_BYTES || 102400;

        const totalUsed = localUsage + syncUsage;
        const totalAvailable = LOCAL_QUOTA + SYNC_QUOTA;

        return {
          used: totalUsed,
          available: totalAvailable - totalUsed,
          percentage: (totalUsed / totalAvailable) * 100,
        };
      } else {
        return { used: 0, available: 5242880, percentage: 0 };
      }
    });
  }

  async cleanupOldConversations(): Promise<number> {
    return withErrorHandling("cleanup conversations", async () => {
      const config = await this.getStorageConfig();
      const conversations = await this.loadAllConversations();
      const conversationList = Object.values(conversations);

      conversationList.sort((a, b) =>
        new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
      );

      let deletedCount = 0;
      const now = new Date();
      const thresholdDate = new Date(
        now.getTime() - config.cleanupThresholdDays * 24 * 60 * 60 * 1000
      );

      for (let i = 0; i < conversationList.length; i++) {
        const conversation = conversationList[i];
        const shouldDelete =
          new Date(conversation.lastActivity) < thresholdDate ||
          i < conversationList.length - config.maxConversations;

        if (shouldDelete) {
          await this.deleteConversation(conversation.id);
          deletedCount++;
        }
      }

      return deletedCount;
    });
  }

  async getStorageConfig(): Promise<StorageConfig> {
    return withErrorHandling("get storage config", async () => {
      const config = await this.getFromStorage(this.STORAGE_KEYS.STORAGE_CONFIG);
      return config || this.DEFAULT_CONFIG;
    });
  }

  async updateStorageConfig(config: Partial<StorageConfig>): Promise<void> {
    return withErrorHandling("update storage config", async () => {
      const currentConfig = await this.getStorageConfig();
      const updatedConfig = { ...currentConfig, ...config };
      await this.setToStorage(this.STORAGE_KEYS.STORAGE_CONFIG, updatedConfig);
    });
  }

  async clearAllData(): Promise<void> {
    return withErrorHandling("clear all data", async () => {
      if (this.isExtensionContext) {
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
      } else {
        localStorage.clear();
      }
    });
  }

  async exportConversations(): Promise<string> {
    return withErrorHandling("export conversations", async () => {
      const conversations = await this.loadAllConversations();
      return JSON.stringify(conversations, null, 2);
    });
  }

  async importConversations(data: string): Promise<void> {
    return withErrorHandling("import conversations", async () => {
      const conversations = JSON.parse(data);
      await this.setToLocalStorage(this.STORAGE_KEYS.CONVERSATIONS, conversations);
    });
  }

  async saveContentScrapingConfig(config: ContentScrapingConfig): Promise<void> {
    return withErrorHandling("save content scraping config", async () => {
      const configToStore = {
        ...config,
        webhookUrl: config.webhookUrl
          ? await this.encryptData(config.webhookUrl)
          : "",
        apiKey: config.apiKey
          ? await this.encryptData(config.apiKey)
          : undefined,
      };

      await this.setToStorage(this.STORAGE_KEYS.CONTENT_SCRAPING_CONFIG, configToStore);
    });
  }

  async loadContentScrapingConfig(): Promise<ContentScrapingConfig | null> {
    return withErrorHandling("load content scraping config", async () => {
      const storedConfig = await this.getFromStorage(this.STORAGE_KEYS.CONTENT_SCRAPING_CONFIG);
      if (!storedConfig) return null;

      const config: ContentScrapingConfig = {
        enabled: storedConfig.enabled || false,
        autoScrape: storedConfig.autoScrape || false,
        webhookUrl: "",
        apiKey: undefined,
      };

      if (storedConfig.webhookUrl) {
        try {
          config.webhookUrl = await this.decryptData(storedConfig.webhookUrl);
        } catch (error) {
          console.warn("Failed to decrypt webhook URL:", error);
          config.webhookUrl = "";
        }
      }

      if (storedConfig.apiKey) {
        try {
          config.apiKey = await this.decryptData(storedConfig.apiKey);
        } catch (error) {
          console.warn("Failed to decrypt API key:", error);
          config.apiKey = undefined;
        }
      }

      return config;
    });
  }

  async clearContentScrapingConfig(): Promise<void> {
    return withErrorHandling("clear content scraping config", async () => {
      if (this.isExtensionContext) {
        await chrome.storage.sync.remove([
          this.STORAGE_KEYS.CONTENT_SCRAPING_CONFIG,
        ]);
      } else {
        localStorage.removeItem(this.STORAGE_KEYS.CONTENT_SCRAPING_CONFIG);
      }
    });
  }
}

export default StorageService;


async function withErrorHandling<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    console.error(`[${label}]`, error);
    throw new Error(`Failed to ${label}: ${error.message || error}`);
  });
}
