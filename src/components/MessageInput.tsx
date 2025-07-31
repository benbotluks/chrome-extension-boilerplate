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
    <div className="message-input">
      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            className="message-textarea"
            rows={1}
            maxLength={maxLength}
          />
          
          <button
            type="submit"
            disabled={!canSend}
            className={`send-button ${canSend ? 'send-button-active' : ''}`}
            title="Send message (Enter)"
          >
            {isLoading ? (
              <div className="loading-spinner" />
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
        
        <div className="input-footer">
          <span className="character-count">
            {message.length}/{maxLength}
          </span>
          <span className="input-hint">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>
      </form>

      <style>{`
        .message-input {
          border-top: 1px solid #e1e5e9;
          background: white;
          padding: 16px;
        }

        .input-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-container {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: #f8f9fa;
          border: 1px solid #e1e5e9;
          border-radius: 20px;
          padding: 8px 12px;
          transition: border-color 0.2s ease;
        }

        .input-container:focus-within {
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
        }

        .message-textarea {
          flex: 1;
          border: none;
          background: transparent;
          resize: none;
          outline: none;
          font-size: 14px;
          line-height: 1.4;
          font-family: inherit;
          min-height: 20px;
          max-height: 120px;
          padding: 6px 0;
        }

        .message-textarea::placeholder {
          color: #6c757d;
        }

        .message-textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .send-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: #e9ecef;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .send-button:hover:not(:disabled) {
          background: #dee2e6;
          transform: scale(1.05);
        }

        .send-button-active {
          background: #007bff !important;
          color: white !important;
        }

        .send-button-active:hover {
          background: #0056b3 !important;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #6c757d;
          padding: 0 4px;
        }

        .character-count {
          font-weight: 500;
        }

        .input-hint {
          opacity: 0.7;
        }

        /* Mobile responsiveness */
        @media (max-width: 480px) {
          .message-input {
            padding: 12px;
          }

          .input-hint {
            display: none;
          }

          .input-footer {
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default MessageInput;