import type { PageContent } from "../types";

export interface ContentWebhookConfig {
  webhookUrl: string;
  enabled: boolean;
  apiKey?: string; // Optional API key for authentication
}

export interface WebhookPayload {
  type: "page_content_extracted";
  timestamp: string;
  data: {
    pageContent: PageContent;
    userAgent: string;
    extensionVersion: string;
  };
  conversationId: string | null;
}

export class ContentWebhookService {
  private static instance: ContentWebhookService;
  private config: ContentWebhookConfig | null = null;

  private constructor() { }

  public static getInstance(): ContentWebhookService {
    if (!ContentWebhookService.instance) {
      ContentWebhookService.instance = new ContentWebhookService();
    }
    return ContentWebhookService.instance;
  }

  /**
   * Configure the webhook service
   */
  public configure(config: ContentWebhookConfig): void {
    this.config = config;
  }

  /**
   * Get current configuration
   */
  public getConfig(): ContentWebhookConfig | null {
    return this.config;
  }

  /**
   * Check if the service is configured and enabled
   */
  public isEnabled(): boolean {
    return !!(this.config?.enabled && this.config?.webhookUrl);
  }

  /**
   * Send page content to the configured webhook
   */
  public async sendPageContent(pageContent: PageContent, conversationId?: string): Promise<void> {
    if (!this.isEnabled() || !this.config) {
      console.log("Content webhook service is not enabled or configured");
      return;
    }

    try {
      // Get extension version with fallback for development mode
      let extensionVersion = "1.0.0-dev";
      try {
        if (chrome?.runtime?.getManifest) {
          extensionVersion = chrome.runtime.getManifest().version;
        }
      } catch (_) {
        console.warn('Could not get extension version, using fallback:', extensionVersion);
      }

      const payload: WebhookPayload = {
        type: "page_content_extracted",
        timestamp: new Date().toISOString(),
        data: {
          pageContent,
          userAgent: navigator.userAgent,
          extensionVersion,
        },
        conversationId: conversationId || null,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add API key if configured
      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      // Use background script to send webhook request (bypasses CORS)
      const response = await this.sendWebhookViaBackground({
        url: this.config.webhookUrl,
        payload,
        headers,
      });

      if (!response.success) {
        throw new Error(`Webhook request failed: ${response.error}`);
      }

      console.log("Page content sent to webhook successfully", {
        url: pageContent.url,
        title: pageContent.title,
        contentType: pageContent.contentType,
      });
    } catch (error) {
      console.error("Failed to send page content to webhook:", error);
      throw error;
    }
  }

  /**
   * Test the webhook connection
   */
  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.webhookUrl) {
      return { success: false, error: "No webhook URL configured" };
    }

    try {
      const testPayload = {
        type: "connection_test",
        timestamp: new Date().toISOString(),
        data: {
          message:
            "This is a test message from the Website Content Scraper extension",
        },
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      console.log("[WebhookService] sending message...");
      // Use background script to test webhook connection (bypasses CORS)
      const response = await this.sendWebhookViaBackground({
        url: this.config.webhookUrl,
        payload: testPayload,
        headers,
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Unknown error",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send webhook request via background script to bypass CORS
   * Falls back to direct fetch in development mode
   */
  private async sendWebhookViaBackground(data: {
    url: string;
    payload: unknown;
    headers: Record<string, string>;
  }): Promise<{ success: boolean; error?: string; result?: unknown }> {
    // Check if we're in Chrome extension context
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "sendWebhook",
            data,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message,
              });
            } else {
              resolve(response);
            }
          }
        );
      });
    } else {
      // Fallback for development mode
      console.warn('Chrome extension APIs not available, development mode fallback');

      // Check if we're in development mode (localhost)
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (isDevelopment) {
        // Development mode: Log the webhook data instead of sending (avoids CORS)
        console.group('🔧 Development Mode - Webhook Data (would be sent to:', data.url, ')');
        console.log('📤 Headers:', data.headers);
        console.log('📦 Payload:', JSON.stringify(data.payload, null, 2));
        console.groupEnd();

        // Show a notification in the UI that it's development mode
        console.info('✅ Development mode: Webhook data logged above. In production, this would be sent to your webhook.');

        // Simulate successful response
        return {
          success: true,
          result: {
            status: 200,
            statusText: 'OK (Development Mode - Data Logged)',
            body: 'Development mode: Webhook data logged to console'
          },
        };
      }

      // Production fallback - try direct fetch (may have CORS issues)
      try {
        const response = await fetch(data.url, {
          method: "POST",
          headers: data.headers,
          body: JSON.stringify(data.payload),
          mode: "cors",
          credentials: "omit",
        });

        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        const responseText = await response.text();
        return {
          success: true,
          result: {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  }

  /**
   * Validate webhook URL format
   */
  public static isValidWebhookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "https:" || urlObj.protocol === "http:";
    } catch {
      return false;
    }
  }
}
