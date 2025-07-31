import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import ConfigurationPanel from './components/ConfigurationPanel';
import { useBotpressChat } from './hooks/useBotpressChat';
import type { PageContent, BotpressConfig } from './types';
import './App.css';

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
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Loading Website Content Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
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
