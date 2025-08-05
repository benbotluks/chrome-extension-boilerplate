import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/StorageService';
import { useContentScraping } from '../hooks/useContentScraping';
import type { BotpressConfig, ContentScrapingConfig } from '../types';


let storageService: StorageService;

interface ConfigurationPanelProps {
  onConfigurationComplete: (config: BotpressConfig) => Promise<boolean>;
  onCancel?: () => void;
  initialConfig?: BotpressConfig;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  onConfigurationComplete,
  onCancel,
  initialConfig,
}) => {
  const [webhookId, setWebhookId] = useState(initialConfig?.webhookId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  // Content scraping configuration
  const [showContentScraping, setShowContentScraping] = useState(false);
  const [contentScrapingEnabled, setContentScrapingEnabled] = useState(false);
  const [contentWebhookUrl, setContentWebhookUrl] = useState('');
  const [contentApiKey, setContentApiKey] = useState('');
  const [autoScrape, setAutoScrape] = useState(false);
  
  const contentScraping = useContentScraping();

  useEffect(() => {
    // Load existing configuration on mount
    const loadConfig = async () => {
      try {
        storageService = StorageService.getInstance();
        const config = await storageService.loadBotpressConfig();
        if (config && config.webhookId) {
          setWebhookId(config.webhookId);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };

    if (!initialConfig) {
      loadConfig();
    }
  }, [initialConfig]);

  // Load content scraping configuration
  useEffect(() => {
    if (contentScraping.config) {
      setContentScrapingEnabled(contentScraping.config.enabled);
      setContentWebhookUrl(contentScraping.config.webhookUrl);
      setContentApiKey(contentScraping.config.apiKey || '');
      setAutoScrape(contentScraping.config.autoScrape);
    }
  }, [contentScraping.config]);

  const validateWebhookId = (id: string): boolean => {
    // Basic validation for webhook ID format
    return id.length > 10 && id.includes('-');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!webhookId.trim()) {
      setError('Webhook ID is required');
      return;
    }

    if (!validateWebhookId(webhookId.trim())) {
      setError('Please enter a valid webhook ID');
      return;
    }

    setIsLoading(true);
    setIsTestingConnection(true);

    try {
      // Configure Botpress first
      const config: BotpressConfig = {
        webhookId: webhookId.trim(),
        isConfigured: true,
      };

      const botpressSuccess = await onConfigurationComplete(config);
      if (!botpressSuccess) {
        setError('Botpress configuration test failed. Please check your webhook ID.');
        return;
      }

      // Configure content scraping if enabled
      if (contentScrapingEnabled) {
        if (!contentWebhookUrl.trim()) {
          setError('Content webhook URL is required when content scraping is enabled');
          return;
        }

        const contentConfig: ContentScrapingConfig = {
          enabled: contentScrapingEnabled,
          webhookUrl: contentWebhookUrl.trim(),
          apiKey: contentApiKey.trim() || undefined,
          autoScrape: autoScrape,
        };

        const contentSuccess = await contentScraping.configure(contentConfig);
        if (!contentSuccess) {
          setError(contentScraping.error || 'Content scraping configuration failed');
          return;
        }
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Configuration failed');
    } finally {
      setIsLoading(false);
      setIsTestingConnection(false);
    }
  };

  const handleTestContentWebhook = async () => {
    if (!contentWebhookUrl.trim()) {
      setError('Please enter a webhook URL first');
      return;
    }

    // Temporarily configure for testing
    const tempConfig: ContentScrapingConfig = {
      enabled: true,
      webhookUrl: contentWebhookUrl.trim(),
      apiKey: contentApiKey.trim() || undefined,
      autoScrape: false,
    };

    await contentScraping.configure(tempConfig);
    const success = await contentScraping.testWebhook();
    
    if (success) {
      setError(null);
      // Show success message briefly
      const originalError = error;
      setError('✓ Webhook connection successful!');
      console.log("[ConfigurationPanel] content test successful")
      setTimeout(() => setError(originalError), 3000);
    }
  };

  const handleWebhookIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWebhookId(e.target.value);
    if (error) setError(null);
  };

  const isFormValid = webhookId.trim().length > 0 && validateWebhookId(webhookId.trim());

  return (
    <div className="h-full flex flex-col p-6 bg-white overflow-y-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="m-0 mb-2 text-2xl font-semibold text-bootstrap-gray-900">Configure Botpress</h2>
        <p className="m-0 text-sm text-bootstrap-gray-600 leading-snug">Enter your Botpress webhook ID to start chatting with your bot.</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-6">
          <label htmlFor="webhookId" className="block mb-2 text-sm font-semibold text-bootstrap-gray-700">
            Webhook ID
          </label>
          <input
            id="webhookId"
            type="text"
            value={webhookId}
            onChange={handleWebhookIdChange}
            placeholder="Enter your Botpress webhook ID"
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all duration-200 box-border focus:outline-none ${
              error 
                ? 'border-red-500 focus:border-red-500 focus:shadow-red-100 focus:shadow-lg' 
                : 'border-bootstrap-gray-300 focus:border-bootstrap-primary focus:shadow-blue-100 focus:shadow-lg'
            } disabled:bg-bootstrap-gray-100 disabled:opacity-70 disabled:cursor-not-allowed`}
            disabled={isLoading}
            autoFocus
          />
          <div className="mt-1.5 text-xs text-bootstrap-gray-600 leading-tight">
            You can find your webhook ID in your Botpress bot's integration settings.
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-danger-bg text-danger-text border border-danger-border rounded-md text-sm mb-6">
            <span className="text-base flex-shrink-0">⚠️</span>
            {error}
          </div>
        )}

        {/* Content Scraping Configuration */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowContentScraping(!showContentScraping)}
            className="flex items-center gap-2 text-sm font-semibold text-bootstrap-gray-700 hover:text-bootstrap-primary transition-colors duration-200"
          >
            <span className={`transform transition-transform duration-200 ${showContentScraping ? 'rotate-90' : ''}`}>▶</span>
            Optional: Content Scraping
          </button>
          
          {showContentScraping && (
            <div className="mt-4 p-4 border border-bootstrap-gray-300 rounded-lg bg-bootstrap-gray-50">
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={contentScrapingEnabled}
                    onChange={(e) => setContentScrapingEnabled(e.target.checked)}
                    className="w-4 h-4"
                    disabled={isLoading}
                  />
                  <span className="font-medium text-bootstrap-gray-700">Enable content scraping</span>
                </label>
                <p className="mt-1 text-xs text-bootstrap-gray-600">
                  Automatically extract webpage content and send it to a separate webhook
                </p>
              </div>

              {contentScrapingEnabled && (
                <>
                  <div className="mb-4">
                    <label htmlFor="contentWebhookUrl" className="block mb-2 text-sm font-medium text-bootstrap-gray-700">
                      Content Webhook URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="contentWebhookUrl"
                        type="url"
                        value={contentWebhookUrl}
                        onChange={(e) => setContentWebhookUrl(e.target.value)}
                        placeholder="https://your-webhook-endpoint.com/content"
                        className="flex-1 px-3 py-2 border border-bootstrap-gray-300 rounded-md text-sm focus:outline-none focus:border-bootstrap-primary focus:shadow-sm disabled:bg-bootstrap-gray-100 disabled:opacity-70"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={handleTestContentWebhook}
                        className="px-3 py-2 border border-bootstrap-gray-300 rounded-md text-sm font-medium text-bootstrap-gray-700 hover:bg-bootstrap-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isLoading || !contentWebhookUrl.trim()}
                      >
                        Test
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-bootstrap-gray-600">
                      This webhook will receive extracted page content (separate from chat webhook)
                    </p>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="contentApiKey" className="block mb-2 text-sm font-medium text-bootstrap-gray-700">
                      API Key (Optional)
                    </label>
                    <input
                      id="contentApiKey"
                      type="password"
                      value={contentApiKey}
                      onChange={(e) => setContentApiKey(e.target.value)}
                      placeholder="Optional API key for webhook authentication"
                      className="w-full px-3 py-2 border border-bootstrap-gray-300 rounded-md text-sm focus:outline-none focus:border-bootstrap-primary focus:shadow-sm disabled:bg-bootstrap-gray-100 disabled:opacity-70"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={autoScrape}
                        onChange={(e) => setAutoScrape(e.target.checked)}
                        className="w-4 h-4"
                        disabled={isLoading}
                      />
                      <span className="font-medium text-bootstrap-gray-700">Auto-scrape on tab change</span>
                    </label>
                    <p className="mt-1 text-xs text-bootstrap-gray-600">
                      Automatically extract content when you switch to a new tab
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end max-sm:flex-col">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border-none rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 flex items-center gap-2 bg-bootstrap-gray-600 text-white hover:bg-bootstrap-gray-700 disabled:opacity-60 disabled:cursor-not-allowed max-sm:w-full max-sm:justify-center"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="px-6 py-3 border-none rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 flex items-center gap-2 bg-bootstrap-primary text-white hover:bg-bootstrap-primary-dark disabled:opacity-60 disabled:cursor-not-allowed max-sm:w-full max-sm:justify-center"
            disabled={!isFormValid || isLoading}
          >
            {isTestingConnection ? (
              <>
                <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
                Testing Connection...
              </>
            ) : isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Test Connection'
            )}
          </button>
        </div>
      </form>

      <div className="bg-bootstrap-gray-100 border border-bootstrap-gray-300 rounded-lg p-5 mt-auto">
        <h3 className="m-0 mb-3 text-base font-semibold text-bootstrap-gray-700">How to get your Webhook ID:</h3>
        <ol className="m-0 pl-5 text-bootstrap-gray-600">
          <li className="mb-1 text-sm leading-snug">Go to your Botpress Cloud dashboard</li>
          <li className="mb-1 text-sm leading-snug">Select your bot</li>
          <li className="mb-1 text-sm leading-snug">Navigate to "Integrations" → "Chat"</li>
          <li className="mb-1 text-sm leading-snug">Copy the webhook ID from the URL</li>
        </ol>
        
        {/* Reset configuration for testing */}
        <div className="mt-4 pt-3 border-t border-bootstrap-gray-300">
          <button
            type="button"
            onClick={async () => {
              if (confirm('Are you sure you want to reset all configuration? This will clear both Botpress and content scraping settings.')) {
                try {
                  await storageService.clearBotpressConfig();
                  await storageService.clearContentScrapingConfig();
                  window.location.reload();
                } catch (error) {
                  console.error('Failed to reset configuration:', error);
                }
              }
            }}
            className="text-xs text-bootstrap-gray-500 hover:text-red-600 transition-colors duration-200 underline"
          >
            Reset All Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;