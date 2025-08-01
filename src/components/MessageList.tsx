import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { TypingWidget } from './widgets';
import { Message } from './messages';


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
          <Message
            message={message}
            url={message.pageContext?.url || ''}
            key={message.id}
          />
        ))}

        {isLoading && <TypingWidget />}

        <div ref={messagesEndRef} />
      </div>


    </div>
  );
};

export default MessageList;