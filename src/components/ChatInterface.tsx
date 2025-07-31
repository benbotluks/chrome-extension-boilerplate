import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SuggestedQuestions from './SuggestedQuestions';
import type { PageContent, ChatMessage } from '../types';

interface ChatInterfaceProps {
  pageContent?: PageContent;
  onConfigurationNeeded?: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
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
  error,
  conversationId,
  isConfigured,
  sendMessage,
  startNewConversation,
  clearError,
}) => {
  const [showContentPreview, setShowContentPreview] = useState(false);

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

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading} />
        
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