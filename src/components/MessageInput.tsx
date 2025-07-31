import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = "Ask a question about this page...",
  maxLength = 1000,
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading, disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  };

  const isDisabled = disabled || isLoading;
  const canSend = message.trim().length > 0 && !isDisabled;

  return (
    <div className="border-t border-bootstrap-gray-300 bg-white p-4 max-sm:p-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex items-end gap-2 bg-bootstrap-gray-100 border border-bootstrap-gray-300 rounded-2xl px-3 py-2 transition-all duration-200 focus-within:border-bootstrap-primary focus-within:shadow-lg focus-within:shadow-blue-100">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            className="flex-1 border-none bg-transparent resize-none outline-none text-sm leading-snug font-inherit min-h-5 max-h-30 py-1.5 placeholder:text-bootstrap-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
            rows={1}
            maxLength={maxLength}
          />
          
          <button
            type="submit"
            disabled={!canSend}
            className={`flex items-center justify-center w-9 h-9 border-none rounded-full cursor-pointer transition-all duration-200 flex-shrink-0 ${
              canSend 
                ? 'bg-bootstrap-primary text-white hover:bg-bootstrap-primary-dark hover:scale-105' 
                : 'bg-bootstrap-gray-400 text-bootstrap-gray-600 hover:bg-bootstrap-gray-500'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            title="Send message (Enter)"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
            )}
          </button>
        </div>
        
        <div className="flex justify-between items-center text-xs text-bootstrap-gray-600 px-1 max-sm:justify-end">
          <span className="font-medium">
            {message.length}/{maxLength}
          </span>
          <span className="opacity-70 max-sm:hidden">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>
      </form>


    </div>
  );
};

export default MessageInput;