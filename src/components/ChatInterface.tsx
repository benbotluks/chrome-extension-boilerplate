import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SuggestedQuestions from './SuggestedQuestions';
import { useContentScraping } from '../hooks/useContentScraping';
import type { PageContent, ChatMessage } from '../types';
import { formatTimestamp } from '../utils/formattingUtils';

interface ChatInterfaceProps {
  pageContent?: PageContent;
  onConfigurationNeeded?: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  conversationId: string | null;
  isConfigured: boolean;
  sendMessage: (content: string, pageContext?: PageContent) => Promise<void>;
  startNewConversation: (pageContext?: PageContent) => Promise<void>;
  clearError: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  pageContent,
  onConfigurationNeeded,
  messages,
  isLoading,
  isTyping,
  error,
  conversationId,
  isConfigured,
  sendMessage,
  startNewConversation,
  clearError,
}) => {
  const [showContentPreview, setShowContentPreview] = useState(false);
  const contentScraping = useContentScraping();

  // Redirect to configuration if not configured
  useEffect(() => {
    if (!isConfigured && onConfigurationNeeded) {
      onConfigurationNeeded();
    }
  }, [isConfigured, onConfigurationNeeded]);

  const handleSendMessage = async (content: string) => {
    clearError();
    await sendMessage(content, pageContent);
  };

  const handleQuestionClick = async (question: string) => {
    clearError();
    await sendMessage(question, pageContent);
  };

  const handleNewConversation = async () => {
    clearError();
    await startNewConversation(pageContent);
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isConfigured) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 text-bootstrap-gray-700">
          <div className="text-5xl mb-4 opacity-70">⚙️</div>
          <h3 className="m-0 mb-2 text-lg font-semibold">Configuration Required</h3>
          <p className="m-0 mb-6 text-sm opacity-80 leading-relaxed">Please configure your Botpress credentials to start chatting.</p>
          {onConfigurationNeeded && (
            <button onClick={onConfigurationNeeded} className="bg-bootstrap-primary text-white border-none rounded-lg px-6 py-3 text-sm font-medium cursor-pointer hover:bg-bootstrap-primary-dark transition-colors duration-200">
              Configure Now
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with page info and controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-bootstrap-gray-100 max-sm:px-3 max-sm:py-2.5">
        <div className="flex-1 min-w-0">
          {pageContent ? (
            <>
              <div className="text-sm font-semibold text-bootstrap-gray-900 whitespace-nowrap overflow-hidden text-ellipsis max-sm:text-xs">
                {truncateText(pageContent.title, 40)}
              </div>
              <div className="text-xs text-bootstrap-gray-600 whitespace-nowrap overflow-hidden text-ellipsis mt-0.5 max-sm:text-[10px]">
                {formatUrl(pageContent.url)}
              </div>
            </>
          ) : (
            <div className="text-sm font-semibold text-bootstrap-gray-900 whitespace-nowrap overflow-hidden text-ellipsis max-sm:text-xs">Chat</div>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-3 max-sm:gap-1.5 max-sm:ml-2">
          {pageContent && (
            <button
              onClick={() => setShowContentPreview(!showContentPreview)}
              className="flex items-center justify-center w-8 h-8 border-none rounded-md bg-transparent text-bootstrap-gray-600 cursor-pointer hover:bg-bootstrap-gray-200 hover:text-bootstrap-gray-700 transition-all duration-200 max-sm:w-7 max-sm:h-7"
              title="Toggle content preview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          )}

          {/* Content scraping button */}
          {contentScraping.isConfigured && (
            <button
              onClick={contentScraping.extractContent}
              className="flex items-center justify-center w-8 h-8 border-none rounded-md bg-transparent text-bootstrap-gray-600 cursor-pointer hover:bg-bootstrap-gray-200 hover:text-bootstrap-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed max-sm:w-7 max-sm:h-7"
              title="Extract page content"
              disabled={contentScraping.isExtracting || isLoading}
            >
              {contentScraping.isExtracting ? (
                <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              )}
            </button>
          )}
          
          {conversationId && (
            <button
              onClick={handleNewConversation}
              className="flex items-center justify-center w-8 h-8 border-none rounded-md bg-transparent text-bootstrap-gray-600 cursor-pointer hover:bg-bootstrap-gray-200 hover:text-bootstrap-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed max-sm:w-7 max-sm:h-7"
              title="Start new conversation"
              disabled={isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
            </button>
          )}

          {/* Settings/Configuration button */}
          {onConfigurationNeeded && (
            <button
              onClick={onConfigurationNeeded}
              className="flex items-center justify-center w-8 h-8 border-none rounded-md bg-transparent text-bootstrap-gray-600 cursor-pointer hover:bg-bootstrap-gray-200 hover:text-bootstrap-gray-700 transition-all duration-200 max-sm:w-7 max-sm:h-7"
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content preview panel */}
      {showContentPreview && pageContent && (
        <div className="bg-warning-bg border-b border-warning-border px-4 py-3 max-sm:px-3 max-sm:py-2.5">
          <div className="flex items-center justify-between mb-2 text-xs font-semibold text-warning-text">
            <span>Page Content Preview</span>
            <button
              onClick={() => setShowContentPreview(false)}
              className="bg-none border-none text-lg text-warning-text cursor-pointer p-0 w-5 h-5 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <div className="text-xs text-warning-text">
            <div className="leading-relaxed mb-2">
              {truncateText(pageContent.extractedText, 300)}
            </div>
            <div className="flex justify-between items-center opacity-80">
              <span className="bg-warning-text text-warning-bg px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold">{pageContent.contentType}</span>
              <span className="text-[10px]">
                Extracted {new Date(pageContent.extractedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-danger-bg text-danger-text px-4 py-3 flex items-center justify-between border-b border-danger-border text-sm max-sm:px-3 max-sm:py-2.5 max-sm:text-xs">
          <span>{error}</span>
          <button onClick={clearError} className="bg-none border-none text-lg text-danger-text cursor-pointer p-0 w-5 h-5 flex items-center justify-center">
            ×
          </button>
        </div>
      )}

      {/* Content scraping error display */}
      {contentScraping.error && (
        <div className="bg-danger-bg text-danger-text px-4 py-3 flex items-center justify-between border-b border-danger-border text-sm max-sm:px-3 max-sm:py-2.5 max-sm:text-xs">
          <span>Content Scraping: {contentScraping.error}</span>
          <button onClick={contentScraping.clearError} className="bg-none border-none text-lg text-danger-text cursor-pointer p-0 w-5 h-5 flex items-center justify-center">
            ×
          </button>
        </div>
      )}

      {/* Content scraping status */}
      {contentScraping.isEnabled && contentScraping.lastExtractedContent && (
        <div className="bg-success-bg text-success-text px-4 py-3 border-b border-success-border text-sm max-sm:px-3 max-sm:py-2.5 max-sm:text-xs">
          <div className="flex items-center justify-between">
            <span>✓ Content extracted and sent to webhook</span>
            <span className="text-xs opacity-75">
              {formatTimestamp(new Date(contentScraping.lastExtractedContent.extractedAt))}
            </span>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading} isTyping={isTyping} />
        
        {/* Show suggested questions when no messages */}
        {messages.length === 0 && !isLoading && (
          <SuggestedQuestions
            pageContent={pageContent}
            onQuestionClick={handleQuestionClick}
            disabled={isLoading}
          />
        )}
        
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={!isConfigured}
          placeholder={
            pageContent 
              ? `Ask about "${truncateText(pageContent.title, 30)}"...`
              : "Ask a question..."
          }
        />
      </div>
    </div>
  );
};

export default ChatInterface;