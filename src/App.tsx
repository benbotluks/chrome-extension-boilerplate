import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import ConfigurationPanel from './components/ConfigurationPanel';
import { useBotpressChat } from './hooks/useBotpressChat';
import type { PageContent, BotpressConfig } from './types';

// Mock page content for demo purposes
// In a real Chrome extension, this would come from content extraction
const mockPageContent: PageContent = {
  url: window.location.href,
  title: document.title || 'Demo Page',
  domain: window.location.hostname,
  contentType: 'generic',
  extractedText: 'This is a demo of the Website Content Chat extension. In a real Chrome extension, this would contain the actual page content extracted from the current tab.',
  metadata: {
    description: 'Demo page for testing the chat interface',
    keywords: ['demo', 'chat', 'botpress'],
  },
  extractedAt: new Date(),
};

type AppView = 'loading' | 'configuration' | 'chat';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('loading');
  const [pageContent] = useState<PageContent>(mockPageContent);

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
  } = useBotpressChat(pageContent);

  // Initialize the app
  useEffect(() => {
    // Handle initial loading
    if (currentView === 'loading') {
      const initializeApp = async () => {
        // await new Promise(resolve => setTimeout(resolve, 500));

        if (isConfigured) {
          setCurrentView('chat');
        } else {
          setCurrentView('configuration');
        }
      };

      initializeApp();
      return;
    }

    // Handle configuration state changes (no delay needed)
    if (isConfigured && currentView !== 'chat') {
      setCurrentView('chat');
    } else if (!isConfigured && currentView !== 'configuration') {
      setCurrentView('configuration');
    }
  }, [isConfigured]);


  const handleConfigurationComplete = async (config: BotpressConfig): Promise<boolean> => {
    const success = await configure(config);
    if (success) {
      setCurrentView('chat');
      return true;
    } else {
      // Error handling is done in the configure function
      return false;
    }
  };

  const handleConfigurationNeeded = () => {
    setCurrentView('configuration');
  };

  const handleBackToChat = () => {
    if (isConfigured) {
      setCurrentView('chat');
    }
  };

  // const handleReconfigure = () => {
  //   setCurrentView('configuration');
  // };

  if (currentView === 'loading') {
    return (
      <div className="w-extension h-extension flex flex-col font-system antialiased bg-white overflow-hidden">
        <div className="h-full flex flex-col items-center justify-center gap-4 text-bootstrap-gray-700">
          <div className="w-8 h-8 border-3 border-bootstrap-gray-200 border-t-bootstrap-primary rounded-full animate-spin" />
          <p className="m-0 text-sm font-medium">Loading Website Content Chat...</p>
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
        />
      ) : (
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
      )}
    </div>
  );
}

export default App;
