import { useState, useEffect, useCallback } from "react";
import { ContentExtractor } from "../services/ContentExtractor";
import { ContentWebhookService } from "../services/ContentWebhookService";
import { StorageService } from "../services/StorageService";
import type { ContentScrapingConfig, PageContent } from "../types";

export interface UseContentScrapingReturn {
  // Configuration
  config: ContentScrapingConfig | null;
  isConfigured: boolean;
  isEnabled: boolean;

  // State
  isExtracting: boolean;
  lastExtractedContent: PageContent | null;
  error: string | null;

  // Actions
  configure: (config: ContentScrapingConfig) => Promise<boolean>;
  testWebhook: () => Promise<boolean>;
  extractContent: (conversationId?: string) => Promise<PageContent | null>;
  clearError: () => void;

  // Auto-scraping
  enableAutoScraping: (enabled: boolean) => Promise<void>;
}

export function useContentScraping(getCurrentConversationId?: () => string | null): UseContentScrapingReturn {
  const [config, setConfig] = useState<ContentScrapingConfig | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastExtractedContent, setLastExtractedContent] =
    useState<PageContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storageService = StorageService.getInstance();
  const contentExtractor = ContentExtractor.getInstance();
  const webhookService = ContentWebhookService.getInstance();

  // Load configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await storageService.loadContentScrapingConfig();
        if (savedConfig) {
          setConfig(savedConfig);

          // Configure webhook service if enabled
          if (savedConfig.enabled && savedConfig.webhookUrl) {
            webhookService.configure({
              webhookUrl: savedConfig.webhookUrl,
              enabled: savedConfig.enabled,
              apiKey: savedConfig.apiKey,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load content scraping config:", error);
        setError("Failed to load configuration");
      }
    };

    loadConfig();
  }, [storageService, webhookService]);

  const configure = useCallback(
    async (newConfig: ContentScrapingConfig): Promise<boolean> => {
      try {
        setError(null);

        // Validate configuration
        if (newConfig.enabled && !newConfig.webhookUrl) {
          setError("Webhook URL is required when content scraping is enabled");
          return false;
        }

        // Test webhook connection if enabled
        if (newConfig.enabled && newConfig.webhookUrl) {
          webhookService.configure({
            webhookUrl: newConfig.webhookUrl,
            enabled: newConfig.enabled,
            apiKey: newConfig.apiKey,
          });

          const testResult = await webhookService.testConnection();
          if (!testResult.success) {
            setError(`Webhook test failed: ${testResult.error}`);
            return false;
          }
        }

        // Save configuration
        await storageService.saveContentScrapingConfig(newConfig);
        setConfig(newConfig);

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Configuration failed";
        setError(errorMessage);
        return false;
      }
    },
    [storageService, webhookService]
  );

  const testWebhook = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      if (!config?.webhookUrl) {
        setError("No webhook URL configured");
        return false;
      }

      const testResult = await webhookService.testConnection();
      if (!testResult.success) {
        setError(`Webhook test failed: ${testResult.error}`);
        return false;
      }

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Webhook test failed";
      setError(errorMessage);
      return false;
    }
  }, [config?.webhookUrl, webhookService]);

  const extractContent = useCallback(async (conversationId?: string): Promise<PageContent | null> => {
    try {
      setError(null);
      setIsExtracting(true);

      // Check if content extraction is available
      const isAvailable = await contentExtractor.isAvailable();
      if (!isAvailable) {
        throw new Error("Content extraction not available in this environment");
      }

      // Extract content from current page
      const result = await contentExtractor.extractCurrentPageContent();
      console.log("the result is", result)

      if (!result.success || !result.content) {
        throw new Error(result.error || "Content extraction failed");
      }

      setLastExtractedContent(result.content);

      // Send to webhook if configured and enabled
      if (config?.enabled && webhookService.isEnabled()) {
        try {
          await webhookService.sendPageContent(result.content, conversationId);
          console.log("Content sent to webhook successfully");
        } catch (webhookError) {
          console.error("Failed to send content to webhook:", webhookError);
          // Don't throw here - extraction was successful, webhook is optional
          setError("Content extracted but failed to send to webhook");
        }
      }

      return result.content;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Content extraction failed";
      setError(errorMessage);
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, [config?.enabled, contentExtractor, webhookService]);

  // Set up auto-scraping when tab changes (if enabled)
  useEffect(() => {
    if (!config?.enabled || !config?.autoScrape) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const handleTabChange = () => {
      // Debounce tab changes to avoid excessive scraping
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const currentConversationId = getCurrentConversationId?.() || undefined;
        extractContent(currentConversationId);
      }, 2000); // Wait 2 seconds after tab change
    };

    // Listen for tab activation changes (Chrome extension only)
    if (chrome?.tabs) {
      chrome.tabs.onActivated.addListener(handleTabChange);
      chrome.tabs.onUpdated.addListener((_, changeInfo) => {
        if (changeInfo.status === "complete") {
          handleTabChange();
        }
      });

      return () => {
        clearTimeout(timeoutId);
        chrome.tabs.onActivated.removeListener(handleTabChange);
        chrome.tabs.onUpdated.removeListener(handleTabChange);
      };
    } else {
      // Development mode - auto-scraping not available without Chrome APIs
      console.warn('Chrome extension APIs not available, auto-scraping disabled in development mode');
    }
  }, [config?.enabled, config?.autoScrape, extractContent]);

  const enableAutoScraping = useCallback(
    async (enabled: boolean): Promise<void> => {
      if (!config) {
        throw new Error("No configuration found");
      }

      const updatedConfig = { ...config, autoScrape: enabled };
      await configure(updatedConfig);
    },
    [config, configure]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Configuration
    config,
    isConfigured: !!config?.webhookUrl,
    isEnabled: !!config?.enabled,

    // State
    isExtracting,
    lastExtractedContent,
    error,

    // Actions
    configure,
    testWebhook,
    extractContent,
    clearError,

    // Auto-scraping
    enableAutoScraping,
  };
}
