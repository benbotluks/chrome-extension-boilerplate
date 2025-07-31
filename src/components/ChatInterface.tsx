import React, { useState, useEffect } from 'react';
import { useBotpressChat } from '../hooks/useBotpressChat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SuggestedQuestions from './SuggestedQuestions';
import type { PageContent } from '../types';
import './ChatInterface.css';

interface ChatInterfaceProps {
  pageContent?: PageContent;
  onConfigurationNeeded?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  pageContent,
  onConfigurationNeeded,
}) => {
  const [showContentPreview, setShowContentPreview] = useState(false);
  
  const {
    messages,
    isLoading,
    error,
    conversationId,
    isConfigured,
    sendMessage,
    startNewConversation,
    clearError,
  } = useBotpressChat(pageContent);

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
      <div className="chat-interface">
        <div className="configuration-needed">
          <div className="config-icon">⚙️</div>
          <h3>Configuration Required</h3>
          <p>Please configure your Botpress credentials to start chatting.</p>
          {onConfigurationNeeded && (
            <button onClick={onConfigurationNeeded} className="config-button">
              Configure Now
            </button>
          )}
        </div>


      </div>
    );
  }

  return (
    <div className="chat-interface">
      {/* Header with page info and controls */}
      <div className="chat-header">
        <div className="page-info">
          {pageContent ? (
            <>
              <div className="page-title">
                {truncateText(pageContent.title, 40)}
              </div>
              <div className="page-url">
                {formatUrl(pageContent.url)}
              </div>
            </>
          ) : (
            <div className="page-title">Chat</div>
          )}
        </div>
        
        <div className="header-controls">
          {pageContent && (
            <button
              onClick={() => setShowContentPreview(!showContentPreview)}
              className="preview-button"
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
              className="new-chat-button"
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
        <div className="content-preview">
          <div className="preview-header">
            <span>Page Content Preview</span>
            <button
              onClick={() => setShowContentPreview(false)}
              className="close-preview"
            >
              ×
            </button>
          </div>
          <div className="preview-content">
            <div className="preview-text">
              {truncateText(pageContent.extractedText, 300)}
            </div>
            <div className="preview-meta">
              <span className="content-type">{pageContent.contentType}</span>
              <span className="extract-time">
                Extracted {new Date(pageContent.extractedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="error-banner">
          <span className="error-text">{error}</span>
          <button onClick={clearError} className="error-close">
            ×
          </button>
        </div>
      )}

      {/* Main chat area */}
      <div className="chat-content">
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