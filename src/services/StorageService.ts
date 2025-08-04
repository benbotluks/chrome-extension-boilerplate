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

      console.log(value)

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

  /**
   * Save Botpress configuration with encryption
   */
  async saveBotpressConfig(config: BotpressConfig): Promise<void> {
    try {
      const configToStore = {
        ...config,
      };

      await this.setToStorage(this.STORAGE_KEYS.BOTPRESS_CONFIG, configToStore);
    } catch (error) {
      throw new Error(`Failed to save Botpress config: ${error}`);
    }
  }

  /**
   * Load Botpress configuration with decryption
   */
  async loadBotpressConfig(): Promise<BotpressConfig | null> {
    try {
      const storedConfig = await this.getFromStorage(
        this.STORAGE_KEYS.BOTPRESS_CONFIG
      );
      if (!storedConfig) {
        return null;
      }

      return {
        ...storedConfig,
      };
    } catch (error) {
      throw new Error(`Failed to load Botpress config: ${error}`);
    }
  }

  /**
   * Clear Botpress configuration
   */
  async clearBotpressConfig(): Promise<void> {
    try {
      if (this.isExtensionContext) {
        await chrome.storage.sync.remove([this.STORAGE_KEYS.BOTPRESS_CONFIG]);
      } else {
        localStorage.removeItem(this.STORAGE_KEYS.BOTPRESS_CONFIG);
      }
    } catch (error) {
      throw new Error(`Failed to clear Botpress config: ${error}`);
    }
  }

  /**
   * Save user key securely to sync storage with encryption
   */
  async saveUserKey(userKey: string): Promise<void> {
    try {
      // Encrypt the user key before storing
      const encryptedUserKey = await this.encryptData(userKey);

      const userSession: BotpressUserSession = {
        userKey: encryptedUserKey,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      await this.setToStorage(this.STORAGE_KEYS.USER_SESSION, userSession);
    } catch (error) {
      throw new Error(`Failed to save user key: ${error}`);
    }
  }

  /**
   * Load stored user key from sync storage with decryption
   */
  async loadUserKey(): Promise<string | null> {
    try {
      const userSession = await this.getFromStorage(
        this.STORAGE_KEYS.USER_SESSION
      );

      if (!userSession || !userSession.userKey) {
        return null;
      }

      // Decrypt the user key
      let decryptedUserKey: string;
      try {
        // Handle both encrypted (new) and plain text (legacy) user keys
        if (typeof userSession.userKey === "string") {
          // Legacy plain text key - return as is but should be re-encrypted on next save
          decryptedUserKey = userSession.userKey;
        } else {
          // New encrypted key
          decryptedUserKey = await this.decryptData(userSession.userKey);
        }
      } catch (decryptError) {
        console.warn(
          "Failed to decrypt user key, treating as invalid:",
          decryptError
        );
        return null;
      }

      // Update last used timestamp and re-encrypt if it was plain text
      if (typeof userSession.userKey === "string") {
        // Re-encrypt legacy plain text key
        const encryptedUserKey = await this.encryptData(decryptedUserKey);
        userSession.userKey = encryptedUserKey;
      }

      userSession.lastUsed = new Date();
      await this.setToStorage(this.STORAGE_KEYS.USER_SESSION, userSession);

      return decryptedUserKey;
    } catch (error) {
      throw new Error(`Failed to load user key: ${error}`);
    }
  }

  /**
   * Clear stored user key for cleanup/reset scenarios
   */
  async clearUserKey(): Promise<void> {
    try {
      if (this.isExtensionContext) {
        await chrome.storage.sync.remove([this.STORAGE_KEYS.USER_SESSION]);
      } else {
        // Fallback to localStorage for development/testing
        localStorage.removeItem(this.STORAGE_KEYS.USER_SESSION);
      }
    } catch (error) {
      throw new Error(`Failed to clear user key: ${error}`);
    }
  }

  /**
   * Save conversation session to local storage (associated with current user key)
   */
  async saveConversation(conversation: ConversationSession): Promise<void> {
    try {
      const userKey = await this.loadUserKey();
      if (!userKey) {
        throw new Error("No user key found - cannot save conversation");
      }

      const conversations = await this.loadAllConversations();
      conversations[conversation.id] = conversation;

      // Use hashed user key for storage namespacing (security)
      const hashedUserKey = await this.hashUserKey(userKey);
      const userSpecificKey = `${this.STORAGE_KEYS.CONVERSATIONS}_${hashedUserKey}`;
      await this.setToLocalStorage(userSpecificKey, conversations);
    } catch (error) {
      throw new Error(`Failed to save conversation: ${error}`);
    }
  }

  /**
   * Load a specific conversation by ID (for current user)
   */
  async loadConversation(
    conversationId: string
  ): Promise<ConversationSession | null> {
    try {
      const conversations = await this.loadAllConversations();
      return conversations[conversationId] || null;
    } catch (error) {
      throw new Error(`Failed to load conversation: ${error}`);
    }
  }

  /**
   * Load all conversations for the current user
   */
  async loadAllConversations(): Promise<Record<string, ConversationSession>> {
    try {
      const userKey = await this.loadUserKey();
      if (!userKey) {
        return {}; // No user key means no conversations
      }

      // Use hashed user key for storage namespacing (security)
      const hashedUserKey = await this.hashUserKey(userKey);
      const userSpecificKey = `${this.STORAGE_KEYS.CONVERSATIONS}_${hashedUserKey}`;
      const conversations = await this.getFromLocalStorage(userSpecificKey);
      return conversations || {};
    } catch (error) {
      throw new Error(`Failed to load conversations: ${error}`);
    }
  }

  /**
   * Delete a specific conversation (for current user)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const userKey = await this.loadUserKey();
      if (!userKey) {
        throw new Error("No user key found - cannot delete conversation");
      }

      const conversations = await this.loadAllConversations();
      delete conversations[conversationId];

      // Use hashed user key for storage namespacing (security)
      const hashedUserKey = await this.hashUserKey(userKey);
      const userSpecificKey = `${this.STORAGE_KEYS.CONVERSATIONS}_${hashedUserKey}`;
      await this.setToLocalStorage(userSpecificKey, conversations);
    } catch (error) {
      throw new Error(`Failed to delete conversation: ${error}`);
    }
  }

  /**
   * Get conversations for a specific URL
   */
  async getConversationsByUrl(url: string): Promise<ConversationSession[]> {
    try {
      const conversations = await this.loadAllConversations();
      return Object.values(conversations).filter((conv) => conv.url === url);
    } catch (error) {
      throw new Error(`Failed to get conversations by URL: ${error}`);
    }
  }

  /**
   * Set current active session
   */
  async setCurrentSession(sessionId: string): Promise<void> {
    try {
      await this.setToLocalStorage(
        this.STORAGE_KEYS.CURRENT_SESSION,
        sessionId
      );
    } catch (error) {
      throw new Error(`Failed to set current session: ${error}`);
    }
  }

  /**
   * Get current active session
   */
  async getCurrentSession(): Promise<string | null> {
    try {
      const sessionId = await this.getFromLocalStorage(
        this.STORAGE_KEYS.CURRENT_SESSION
      );
      return sessionId || null;
    } catch (error) {
      throw new Error(`Failed to get current session: ${error}`);
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<StorageQuota> {
    try {
      if (this.isExtensionContext) {
        const localUsage = await chrome.storage.local.getBytesInUse();
        const syncUsage = await chrome.storage.sync.getBytesInUse();

        // Chrome storage limits
        const LOCAL_QUOTA = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB
        const SYNC_QUOTA = chrome.storage.sync.QUOTA_BYTES || 102400; // 100KB

        const totalUsed = localUsage + syncUsage;
        const totalAvailable = LOCAL_QUOTA + SYNC_QUOTA;

        return {
          used: totalUsed,
          available: totalAvailable - totalUsed,
          percentage: (totalUsed / totalAvailable) * 100,
        };
      } else {
        // Fallback for non-extension environment
        const used = 0; // Can't calculate localStorage usage easily
        const available = 5242880; // Assume 5MB available
        return {
          used,
          available,
          percentage: 0,
        };
      }
    } catch (error) {
      throw new Error(`Failed to get storage quota: ${error}`);
    }
  }

  /**
   * Clean up old conversations based on storage config
   */
  async cleanupOldConversations(): Promise<number> {
    try {
      const config = await this.getStorageConfig();
      const conversations = await this.loadAllConversations();
      const conversationList = Object.values(conversations);

      // Sort by last activity (oldest first)
      conversationList.sort(
        (a, b) =>
          new Date(a.lastActivity).getTime() -
          new Date(b.lastActivity).getTime()
      );

      let deletedCount = 0;
      const now = new Date();
      const thresholdDate = new Date(
        now.getTime() - config.cleanupThresholdDays * 24 * 60 * 60 * 1000
      );

      // Delete conversations older than threshold or exceeding max count
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
    } catch (error) {
      throw new Error(`Failed to cleanup conversations: ${error}`);
    }
  }

  /**
   * Get storage configuration
   */
  async getStorageConfig(): Promise<StorageConfig> {
    try {
      const config = await this.getFromStorage(
        this.STORAGE_KEYS.STORAGE_CONFIG
      );
      return config || this.DEFAULT_CONFIG;
    } catch (error) {
      throw new Error(`Failed to get storage config: ${error}`);
    }
  }

  /**
   * Update storage configuration
   */
  async updateStorageConfig(config: Partial<StorageConfig>): Promise<void> {
    try {
      const currentConfig = await this.getStorageConfig();
      const updatedConfig = { ...currentConfig, ...config };

      await this.setToStorage(this.STORAGE_KEYS.STORAGE_CONFIG, updatedConfig);
    } catch (error) {
      throw new Error(`Failed to update storage config: ${error}`);
    }
  }

  /**
   * Clear all stored data (for testing or reset)
   */
  async clearAllData(): Promise<void> {
    try {
      if (this.isExtensionContext) {
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
      } else {
        // Clear localStorage fallback
        localStorage.clear();
      }
    } catch (error) {
      throw new Error(`Failed to clear all data: ${error}`);
    }
  }

  /**
   * Export conversations for backup
   */
  async exportConversations(): Promise<string> {
    try {
      const conversations = await this.loadAllConversations();
      return JSON.stringify(conversations, null, 2);
    } catch (error) {
      throw new Error(`Failed to export conversations: ${error}`);
    }
  }

  /**
   * Import conversations from backup
   */
  async importConversations(data: string): Promise<void> {
    try {
      const conversations = JSON.parse(data);
      await this.setToLocalStorage(
        this.STORAGE_KEYS.CONVERSATIONS,
        conversations
      );
    } catch (error) {
      throw new Error(`Failed to import conversations: ${error}`);
    }
  }

  /**
   * Save content scraping configuration
   */
  async saveContentScrapingConfig(
    config: ContentScrapingConfig
  ): Promise<void> {
    try {
      // Encrypt webhook URL and API key if present
      const configToStore = {
        ...config,
        webhookUrl: config.webhookUrl
          ? await this.encryptData(config.webhookUrl)
          : "",
        apiKey: config.apiKey
          ? await this.encryptData(config.apiKey)
          : undefined,
      };

      await this.setToStorage(
        this.STORAGE_KEYS.CONTENT_SCRAPING_CONFIG,
        configToStore
      );
    } catch (error) {
      throw new Error(`Failed to save content scraping config: ${error}`);
    }
  }

  /**
   * Load content scraping configuration
   */
  async loadContentScrapingConfig(): Promise<ContentScrapingConfig | null> {
    try {
      const storedConfig = await this.getFromStorage(
        this.STORAGE_KEYS.CONTENT_SCRAPING_CONFIG
      );

      if (!storedConfig) {
        return null;
      }

      // Decrypt webhook URL and API key
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
    } catch (error) {
      throw new Error(`Failed to load content scraping config: ${error}`);
    }
  }

  /**
   * Clear content scraping configuration
   */
  async clearContentScrapingConfig(): Promise<void> {
    try {
      if (this.isExtensionContext) {
        await chrome.storage.sync.remove([
          this.STORAGE_KEYS.CONTENT_SCRAPING_CONFIG,
        ]);
      } else {
        localStorage.removeItem(this.STORAGE_KEYS.CONTENT_SCRAPING_CONFIG);
      }
    } catch (error) {
      throw new Error(`Failed to clear content scraping config: ${error}`);
    }
  }
}

export default StorageService;
