import React from 'react';
import type { ContentType, PageContent } from '../types';

interface SuggestedQuestionsProps {
  pageContent?: PageContent | null;
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
    <div className="bg-bootstrap-gray-100 border-t border-bootstrap-gray-300 p-4 max-sm:p-3">
      <div className="flex items-center gap-2 mb-3 max-sm:mb-2.5">
        <span className="text-base">💡</span>
        <span className="text-sm font-semibold text-bootstrap-gray-700 max-sm:text-[13px]">Suggested questions</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-3 max-sm:grid-cols-1 max-sm:gap-1.5">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuestionClick(question)}
            disabled={disabled}
            className={`bg-white border border-bootstrap-gray-300 rounded-lg px-3 py-2.5 text-[13px] leading-tight text-left cursor-pointer transition-all duration-200 text-bootstrap-gray-700 overflow-hidden min-h-11 max-sm:px-2.5 max-sm:py-2 max-sm:text-xs max-sm:min-h-10 hover:bg-bootstrap-gray-200 hover:border-bootstrap-gray-500 hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none ${
              disabled ? '' : ''
            }`}
            title={question}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {question}
          </button>
        ))}
      </div>

      {pageContent && (
        <div className="flex items-center justify-between text-xs text-bootstrap-gray-600 max-[320px]:flex-col max-[320px]:items-start max-[320px]:gap-1">
          <span className="bg-bootstrap-primary text-white px-1.5 py-0.5 rounded font-medium capitalize">
            {pageContent.contentType}
          </span>
          <span className="opacity-80 font-medium">
            {pageContent.domain}
          </span>
        </div>
      )}


    </div>
  );
};

export default SuggestedQuestions;