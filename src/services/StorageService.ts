import {
  BotpressConfig,
  ConversationSession,
  StorageQuota,
  StorageConfig,
  EncryptedData,
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
  } as const;

  private readonly DEFAULT_CONFIG: StorageConfig = {
    maxConversations: 100,
    maxMessageHistory: 1000,
    cleanupThresholdDays: 30,
  };

  private constructor() {}

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
      encryptedData.data.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const iv = new Uint8Array(
      encryptedData.iv.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const salt = new Uint8Array(
      encryptedData.salt.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
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
   * Save Botpress configuration with encryption
   */
  async saveBotpressConfig(config: BotpressConfig): Promise<void> {
    try {
      const encryptedToken = await this.encryptData(config.token);
      const configToStore = {
        ...config,
        token: encryptedToken,
      };

      await chrome.storage.sync.set({
        [this.STORAGE_KEYS.BOTPRESS_CONFIG]: configToStore,
      });
    } catch (error) {
      throw new Error(`Failed to save Botpress config: ${error}`);
    }
  }

  /**
   * Load Botpress configuration with decryption
   */
  async loadBotpressConfig(): Promise<BotpressConfig | null> {
    try {
      const result = await chrome.storage.sync.get([
        this.STORAGE_KEYS.BOTPRESS_CONFIG,
      ]);
      const storedConfig = result[this.STORAGE_KEYS.BOTPRESS_CONFIG];

      if (!storedConfig) {
        return null;
      }

      const decryptedToken = await this.decryptData(storedConfig.token);

      return {
        ...storedConfig,
        token: decryptedToken,
      };
    } catch (error) {
      throw new Error(`Failed to load Botpress config: ${error}`);
    }
  }

  /**
   * Save conversation session to local storage
   */
  async saveConversation(conversation: ConversationSession): Promise<void> {
    try {
      const conversations = await this.loadAllConversations();
      conversations[conversation.id] = conversation;

      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CONVERSATIONS]: conversations,
      });
    } catch (error) {
      throw new Error(`Failed to save conversation: ${error}`);
    }
  }

  /**
   * Load a specific conversation by ID
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
   * Load all conversations
   */
  async loadAllConversations(): Promise<Record<string, ConversationSession>> {
    try {
      const result = await chrome.storage.local.get([
        this.STORAGE_KEYS.CONVERSATIONS,
      ]);
      return result[this.STORAGE_KEYS.CONVERSATIONS] || {};
    } catch (error) {
      throw new Error(`Failed to load conversations: ${error}`);
    }
  }

  /**
   * Delete a specific conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const conversations = await this.loadAllConversations();
      delete conversations[conversationId];

      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CONVERSATIONS]: conversations,
      });
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
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CURRENT_SESSION]: sessionId,
      });
    } catch (error) {
      throw new Error(`Failed to set current session: ${error}`);
    }
  }

  /**
   * Get current active session
   */
  async getCurrentSession(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get([
        this.STORAGE_KEYS.CURRENT_SESSION,
      ]);
      return result[this.STORAGE_KEYS.CURRENT_SESSION] || null;
    } catch (error) {
      throw new Error(`Failed to get current session: ${error}`);
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<StorageQuota> {
    try {
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
      const result = await chrome.storage.sync.get([
        this.STORAGE_KEYS.STORAGE_CONFIG,
      ]);
      return result[this.STORAGE_KEYS.STORAGE_CONFIG] || this.DEFAULT_CONFIG;
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

      await chrome.storage.sync.set({
        [this.STORAGE_KEYS.STORAGE_CONFIG]: updatedConfig,
      });
    } catch (error) {
      throw new Error(`Failed to update storage config: ${error}`);
    }
  }

  /**
   * Clear all stored data (for testing or reset)
   */
  async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear();
      await chrome.storage.sync.clear();
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
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CONVERSATIONS]: conversations,
      });
    } catch (error) {
      throw new Error(`Failed to import conversations: ${error}`);
    }
  }
}

export default StorageService;
