import { useState, useEffect, useCallback } from "react";
import { ContentExtractor } from "../services/ContentExtractor";
import { ContentWebhookService } from "../services/ContentWebhookService";
import { StorageService } from "../services/StorageService";
import { useErrorHandler } from "./useErrorHandler";
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

  const { error, setError, clearError, withErrorHandling } = useErrorHandler();

  const storageService = StorageService.getInstance();
  const contentExtractor = ContentExtractor.getInstance();
  const webhookService = ContentWebhookService.getInstance();

  // Load configuration on mount
  useEffect(() => {
    withErrorHandling(async () => {
      const savedConfig = await storageService.loadContentScrapingConfig();
      if (savedConfig) {
        setConfig(savedConfig);
        if (savedConfig.enabled && savedConfig.webhookUrl) {
          webhookService.configure({
            webhookUrl: savedConfig.webhookUrl,
            enabled: savedConfig.enabled,
            apiKey: savedConfig.apiKey,
          });
        }
      }
    }, { loadingState: false, errorMessage: "Failed to load configuration" });
  }, [storageService, webhookService, withErrorHandling]);

  const configure = useCallback(
    async (newConfig: ContentScrapingConfig): Promise<boolean> => {
      const result = await withErrorHandling(async () => {
        if (newConfig.enabled && !newConfig.webhookUrl) {
          throw new Error("Webhook URL is required when content scraping is enabled");
        }

        if (newConfig.enabled && newConfig.webhookUrl) {
          webhookService.configure({
            webhookUrl: newConfig.webhookUrl,
            enabled: newConfig.enabled,
            apiKey: newConfig.apiKey,
          });

          const testResult = await webhookService.testConnection();
          if (!testResult.success) {
            throw new Error(`Webhook test failed: ${testResult.error}`);
          }
        }

        await storageService.saveContentScrapingConfig(newConfig);
        setConfig(newConfig);
        return true;
      }, { loadingState: false });

      return result ?? false;
    },
    [storageService, webhookService, withErrorHandling]
  );

  const testWebhook = useCallback(async (): Promise<boolean> => {
    const result = await withErrorHandling(async () => {
      if (!config?.webhookUrl) throw new Error("No webhook URL configured");

      const testResult = await webhookService.testConnection();
      if (!testResult.success) throw new Error(`Webhook test failed: ${testResult.error}`);

      return true;
    }, { loadingState: false });

    return result ?? false;
  }, [config?.webhookUrl, webhookService, withErrorHandling]);

  const extractContent = useCallback(async (conversationId?: string): Promise<PageContent | null> => {
    setIsExtracting(true);

    const result = await withErrorHandling(async () => {
      const isAvailable = await contentExtractor.isAvailable();
      if (!isAvailable) throw new Error("Content extraction not available in this environment");

      const extractResult = await contentExtractor.extractCurrentPageContent();
      if (!extractResult.success || !extractResult.content) {
        throw new Error(extractResult.error || "Content extraction failed");
      }

      setLastExtractedContent(extractResult.content);

      // Send to webhook if configured and enabled
      if (config?.enabled && webhookService.isEnabled()) {
        try {
          await webhookService.sendPageContent(extractResult.content, conversationId);
        } catch (webhookError) {
          console.error("Failed to send content to webhook:", webhookError);
          setError("Content extracted but failed to send to webhook");
        }
      }

      return extractResult.content;
    }, { loadingState: false });

    setIsExtracting(false);
    return result;
  }, [config?.enabled, contentExtractor, webhookService, withErrorHandling, setError]);

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
  }, [config?.enabled, config?.autoScrape, extractContent, getCurrentConversationId]);

  const enableAutoScraping = useCallback(
    async (enabled: boolean): Promise<void> => {
      await withErrorHandling(async () => {
        if (!config) throw new Error("No configuration found");

        const updatedConfig = { ...config, autoScrape: enabled };
        const success = await configure(updatedConfig);
        if (!success) throw new Error("Failed to update auto-scraping configuration");
      }, { loadingState: false });
    },
    [config, configure, withErrorHandling]
  );

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
