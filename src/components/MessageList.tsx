import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp: Date) => {
    try {
      // Ensure timestamp is a valid Date object
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch (error) {
      console.error('Error formatting timestamp:', error, timestamp);
      return 'Invalid date';
    }
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ddd transparent' }}>
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 px-4 py-8">
            <div className="text-5xl mb-4 opacity-50">💬</div>
            <p className="m-0 mb-2 text-base font-medium">Start a conversation about this page!</p>
            <p className="m-0 text-sm font-normal opacity-70">Ask questions about the content, get summaries, or explore topics.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex mb-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[80%] min-w-[120px]">
              <div className={`px-4 py-3 rounded-2xl text-sm leading-snug break-words ${message.type === 'user'
                ? 'bg-bootstrap-primary text-white rounded-br-sm'
                : 'bg-bootstrap-gray-200 text-gray-800 rounded-bl-sm'
                }`}>
                {message.content}
              </div>

              <div className={`flex items-center gap-2 mt-1 text-xs text-gray-600 px-1 ${message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                <span>
                  {formatTimestamp(message.timestamp)}
                </span>

                {message.pageContext && (
                  <span className="flex items-center gap-1 max-w-[150px]">
                    <span className="text-[10px] opacity-70">🔗</span>
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis opacity-80" title={message.pageContext.url}>
                      {formatUrl(message.pageContext.url)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-2">
            <div className="max-w-[80%] min-w-[120px]">
              <div className="px-4 py-3 rounded-2xl text-sm leading-snug break-words bg-bootstrap-gray-200 text-gray-800 rounded-bl-sm">
                <div className="flex items-center gap-1 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '-0.32s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '-0.16s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>


    </div>
  );
};

export default MessageList;