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
  
  const { isConfigured, configure } = useBotpressChat(pageContent);

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isConfigured) {
        setCurrentView('chat');
      } else {
        setCurrentView('configuration');
      }
    };

    initializeApp();
  }, [isConfigured]);

  const handleConfigurationComplete = async (config: BotpressConfig) => {
    const success = await configure(config);
    if (success) {
      setCurrentView('chat');
    } else {
      // Error handling is done in the configure function
      throw new Error('Configuration failed');
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

  if (currentView === 'loading') {
    return (
      <div className="flex flex-col antialiased bg-white overflow-hidden" style={{ width: '400px', height: '600px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
        <div className="h-full flex flex-col items-center justify-center gap-4" style={{ color: '#495057' }}>
          <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#e9ecef', borderTopColor: '#007bff' }} />
          <p className="m-0 text-sm font-medium">Loading Website Content Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col antialiased bg-white overflow-hidden" style={{ width: '400px', height: '600px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
      {currentView === 'configuration' ? (
        <ConfigurationPanel
          onConfigurationComplete={handleConfigurationComplete}
          onCancel={isConfigured ? handleBackToChat : undefined}
        />
      ) : (
        <ChatInterface
          pageContent={pageContent}
          onConfigurationNeeded={handleConfigurationNeeded}
        />
      )}
    </div>
  );
}

export default App;
