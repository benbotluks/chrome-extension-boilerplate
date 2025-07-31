import React from 'react';
import type { ContentType, PageContent } from '../types';

interface SuggestedQuestionsProps {
  pageContent?: PageContent;
  onQuestionClick: (question: string) => void;
  disabled?: boolean;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  pageContent,
  onQuestionClick,
  disabled = false,
}) => {
  const getQuestionsForContentType = (contentType: ContentType): string[] => {
    switch (contentType) {
      case 'article':
        return [
          "What's the main point of this article?",
          "Can you summarize the key findings?",
          "What are the implications discussed?",
          "Who is the target audience?",
        ];
      
      case 'product':
        return [
          "What are the key features of this product?",
          "How much does this cost?",
          "What are the pros and cons?",
          "Is this suitable for my needs?",
        ];
      
      case 'documentation':
        return [
          "How do I get started?",
          "What are the main concepts?",
          "Can you explain the examples?",
          "What are common troubleshooting steps?",
        ];
      
      case 'blog':
        return [
          "What's the author's main argument?",
          "Can you summarize this post?",
          "What examples are provided?",
          "What's the conclusion?",
        ];
      
      case 'generic':
      default:
        return [
          "What is this page about?",
          "Can you summarize the content?",
          "What are the key points?",
          "Is there anything important I should know?",
        ];
    }
  };

  const getGenericQuestions = (): string[] => [
    "What is this page about?",
    "Can you summarize the content?",
    "What are the key points?",
    "Is there anything important I should know?",
  ];

  const questions = pageContent 
    ? getQuestionsForContentType(pageContent.contentType)
    : getGenericQuestions();

  const handleQuestionClick = (question: string) => {
    if (!disabled) {
      onQuestionClick(question);
    }
  };

  if (!questions.length) {
    return null;
  }

  return (
    <div className="suggested-questions">
      <div className="questions-header">
        <span className="questions-icon">💡</span>
        <span className="questions-title">Suggested questions</span>
      </div>
      
      <div className="questions-grid">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuestionClick(question)}
            disabled={disabled}
            className={`question-button ${disabled ? 'question-button-disabled' : ''}`}
            title={question}
          >
            {question}
          </button>
        ))}
      </div>

      {pageContent && (
        <div className="content-info">
          <span className="content-type-badge">
            {pageContent.contentType}
          </span>
          <span className="content-domain">
            {pageContent.domain}
          </span>
        </div>
      )}

      <style>{`
        .suggested-questions {
          background: #f8f9fa;
          border-top: 1px solid #e1e5e9;
          padding: 16px;
        }

        .questions-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .questions-icon {
          font-size: 16px;
        }

        .questions-title {
          font-size: 14px;
          font-weight: 600;
          color: #495057;
        }

        .questions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 12px;
        }

        .question-button {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.3;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #495057;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 44px;
        }

        .question-button:hover:not(:disabled) {
          background: #e9ecef;
          border-color: #adb5bd;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .question-button:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .question-button-disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .content-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: #6c757d;
        }

        .content-type-badge {
          background: #007bff;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .content-domain {
          opacity: 0.8;
          font-weight: 500;
        }

        /* Mobile responsiveness */
        @media (max-width: 480px) {
          .suggested-questions {
            padding: 12px;
          }

          .questions-grid {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .question-button {
            padding: 8px 10px;
            font-size: 12px;
            min-height: 40px;
          }

          .questions-header {
            margin-bottom: 10px;
          }

          .questions-title {
            font-size: 13px;
          }
        }

        /* Single column layout for very narrow screens */
        @media (max-width: 320px) {
          .content-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default SuggestedQuestions;