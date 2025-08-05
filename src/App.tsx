import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import ConfigurationPanel from './components/ConfigurationPanel';
import { useBotpressChat } from './hooks/useBotpressChat';
import { ContentExtractor } from './services/ContentExtractor';
import { StorageService } from './services/StorageService';
import type { PageContent, BotpressConfig } from './types';

type AppView = 'loading' | 'configuration' | 'chat';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('loading');
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [contentExtractionError, setContentExtractionError] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<BotpressConfig | null>(null);
  const [isManualNavigation, setIsManualNavigation] = useState(false);

  const {
    isConfigured,
    configure,
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
    startNewConversation,
    clearError,
    isTyping
  } = useBotpressChat(pageContent || undefined);

  // Initialize the app and extract page content
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load current configuration first
        const storageService = StorageService.getInstance();
        const config = await storageService.loadBotpressConfig();
        setCurrentConfig(config);

        // Try to extract page content
        const contentExtractor = ContentExtractor.getInstance();
        const isAvailable = await contentExtractor.isAvailable();

        if (isAvailable) {
          const result = await contentExtractor.extractCurrentPageContent();
          if (result.success && result.content) {
            setPageContent(result.content);
            console.log('Page content extracted successfully:', result.content);
          } else {
            setContentExtractionError(result.error || 'Failed to extract page content');
            console.warn('Content extraction failed:', result.error);
          }
        } else {
          setContentExtractionError('Content extraction not available. Please build and load the extension to use this feature.');
          console.warn('Content extraction not available in current environment');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during content extraction';
        setContentExtractionError(errorMessage);
        console.error('Error during content extraction:', error);
      }
    };

    if (currentView === 'loading') {
      initializeApp();
    }
  }, [currentView]);

  // Handle initial view determination after loading
  useEffect(() => {
    if (currentView === 'loading' && currentConfig !== null) {
      // Configuration has been loaded, determine initial view
      console.log('App: Determining initial view - isConfigured:', isConfigured, 'currentConfig:', currentConfig);
      if (isConfigured) {
        console.log('App: Navigating to chat (configured)');
        setCurrentView('chat');
      } else {
        console.log('App: Navigating to configuration (not configured)');
        setCurrentView('configuration');
      }
    }
  }, [currentView, currentConfig, isConfigured]);

  // Handle automatic navigation when configuration status changes (but not during manual navigation)
  useEffect(() => {
    if (currentView !== 'loading' && !isManualNavigation) {
      // Only auto-navigate if this isn't a manual navigation
      if (!isConfigured && currentView !== 'configuration') {
        console.log('App: Auto-navigating to configuration (configuration lost)');
        setCurrentView('configuration');
      }
    }
    // Reset manual navigation flag after effect runs
    if (isManualNavigation) {
      setIsManualNavigation(false);
    }
  }, [isConfigured, currentView, isManualNavigation]);




  const handleConfigurationComplete = async (config: BotpressConfig): Promise<boolean> => {
    const success = await configure(config);
    if (success) {
      // Update the current config state
      setCurrentConfig(config);
      console.log('App: Configuration completed, navigating to chat');
      setIsManualNavigation(true);
      setCurrentView('chat');
      return true;
    } else {
      // Error handling is done in the configure function
      return false;
    }
  };

  const handleConfigurationNeeded = () => {
    // Explicitly navigate to configuration page
    console.log('App: Manual navigation to configuration requested');
    setIsManualNavigation(true);
    setCurrentView('configuration');
  };

  const handleBackToChat = () => {
    // Only navigate to chat if bot is configured
    if (isConfigured) {
      console.log('App: Manual navigation back to chat');
      setIsManualNavigation(true);
      setCurrentView('chat');
    }
  };

  const handleRetryContentExtraction = async () => {
    setContentExtractionError(null);
    try {
      const contentExtractor = ContentExtractor.getInstance();
      const result = await contentExtractor.extractCurrentPageContent();
      if (result.success && result.content) {
        setPageContent(result.content);
        console.log('Page content extracted successfully on retry:', result.content);
      } else {
        setContentExtractionError(result.error || 'Failed to extract page content');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during content extraction';
      setContentExtractionError(errorMessage);
    }
  };

  if (currentView === 'loading') {
    return (
      <div className="w-extension h-extension flex flex-col font-system antialiased bg-white overflow-hidden">
        <div className="h-full flex flex-col items-center justify-center gap-4 text-bootstrap-gray-700">
          <div className="w-8 h-8 border-3 border-bootstrap-gray-200 border-t-bootstrap-primary rounded-full animate-spin" />
          <p className="m-0 text-sm font-medium">Loading Website Content Chat...</p>
          <p className="m-0 text-xs text-bootstrap-gray-500">Extracting page content...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="w-extension h-extension flex flex-col font-system antialiased bg-white overflow-hidden">
      {currentView === 'configuration' ? (
        <ConfigurationPanel
          onConfigurationComplete={handleConfigurationComplete}
          onCancel={isConfigured ? handleBackToChat : undefined}
          initialConfig={currentConfig || undefined}
        />
      ) : (
        <>
          {/* Content extraction error banner */}
          {contentExtractionError && (
            <div className="bg-warning-bg text-warning-text px-4 py-3 border-b border-warning-border text-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold mb-1">Content Extraction Issue</div>
                  <div className="text-xs opacity-90">{contentExtractionError}</div>
                </div>
                <button
                  onClick={handleRetryContentExtraction}
                  className="ml-3 px-3 py-1 bg-warning-text text-warning-bg rounded text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <ChatInterface
            pageContent={pageContent}
            onConfigurationNeeded={handleConfigurationNeeded}
            messages={messages}
            isLoading={isLoading}
            isTyping={isTyping}
            error={error}
            conversationId={conversationId}
            isConfigured={isConfigured}
            sendMessage={sendMessage}
            startNewConversation={startNewConversation}
            clearError={clearError}
          />
        </>
      )}
    </div>
  );
}

export default App;
