// Content extraction constants and configuration

export const CONTENT_TYPE_RULES = {
  article: {
    indicators: [
      "article",
      "main",
      ".post-content",
      ".article-body",
      ".entry-content",
    ],
    metadata: [
      "author",
      "published",
      "article:author",
      "article:published_time",
    ],
    structure: "headline + body paragraphs",
  },
  product: {
    indicators: [
      ".product",
      ".item",
      "[data-product]",
      ".product-details",
      ".product-info",
    ],
    metadata: [
      "price",
      "rating",
      "availability",
      "product:price",
      "product:availability",
    ],
    structure: "title + price + description + reviews",
  },
  documentation: {
    indicators: [
      ".docs",
      ".documentation",
      "main.content",
      ".doc-content",
      ".api-docs",
    ],
    metadata: ["section", "version", "api", "docs:section", "docs:version"],
    structure: "headings + code blocks + explanations",
  },
  blog: {
    indicators: [
      ".blog-post",
      ".post",
      ".entry",
      ".blog-content",
      ".post-body",
    ],
    metadata: ["author", "published", "tags", "category", "blog:author"],
    structure: "title + author + content + tags",
  },
  generic: {
    indicators: [
      "main",
      ".content",
      ".main-content",
      "article",
      ".page-content",
    ],
    metadata: ["title", "description", "keywords"],
    structure: "title + main content",
  },
} as const;

export const EXTRACTION_CONFIG = {
  MAX_CONTENT_LENGTH: 5000,
  EXTRACTION_TIMEOUT: 5000,
  MIN_CONTENT_LENGTH: 100,
  INCLUDE_IMAGES: false,
  INCLUDE_LINKS: true,
  WAIT_FOR_DYNAMIC_CONTENT: 2000,
} as const;

export const SUGGESTED_QUESTIONS = {
  article: [
    "Summarize the main points of this article",
    "What are the key takeaways?",
    "Who are the main people or organizations mentioned?",
    "What is the author's main argument?",
  ],
  product: [
    "What are the key features of this product?",
    "How does this compare to alternatives?",
    "What do customers say about this product?",
    "What is the price and value proposition?",
  ],
  documentation: [
    "Explain the main concepts covered here",
    "Show me the key code examples",
    "What are the important configuration options?",
    "How do I get started with this?",
  ],
  blog: [
    "What's the main topic of this blog post?",
    "What are the author's key insights?",
    "Are there any actionable tips mentioned?",
    "What examples or case studies are discussed?",
  ],
  generic: [
    "Summarize this page for me",
    "What are the main points?",
    "What should I know about this content?",
    "Are there any important details I should focus on?",
  ],
} as const;
