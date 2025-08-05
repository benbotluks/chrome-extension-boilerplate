// Core type definitions for the website content chat extension

export type ContentType =
  | "article"
  | "product"
  | "documentation"
  | "blog"
  | "generic";

export interface BotpressConfig {
  webhookId: string;
  isConfigured: boolean;
}

export interface ContentScrapingConfig {
  enabled: boolean;
  webhookUrl: string;
  apiKey?: string;
  autoScrape: boolean; // Whether to automatically scrape when tab changes
}

export interface BotpressUserSession {
  userKey: string | EncryptedData; // Support both legacy plain text and encrypted keys
  userId?: string;
  createdAt: Date;
  lastUsed: Date;
}


export interface Heading {
  level?: number,
  text: string
}

export interface Link {
  url: string,
  text: string
}

export interface DomElement {
  innerText?: string
}

export interface PageMetadata {
  title?: string
  author?: string;
  url?: string;
  domain?: string;
  publishDate?: string;
  description?: string;
  keywords?: string[];
  images?: string[];
  headings?: Heading[];
  links?: Link[];
}

export interface PageContent {
  url: string;
  title: string;
  domain: string;
  contentType: ContentType;
  extractedText: string;
  extractedAt: string;
  metadata?: PageMetadata;
}

export interface ContentExtractionResult {
  success: boolean;
  content?: PageContent;
  error?: string;
  suggestions?: string[];
}

export interface ChatMessage {
  id: string;
  type: "user" | "bot" | "system";
  content: string | undefined;
  timestamp: string;
  pageContext?: {
    url: string;
    title: string;
  };
}

export interface ConversationSession {
  id: string;
  url: string;
  title: string;
  messages: ChatMessage[];
  conversationId?: string; // Botpress conversation ID
  createdAt: string;
  lastActivity: string;
}
export interface StorageQuota {
  used: number;
  available: number;
  percentage: number;
}

export interface StorageConfig {
  maxConversations: number;
  maxMessageHistory: number;
  cleanupThresholdDays: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}


export interface EventPayload {
  type: string | undefined,
  text?: string | undefined,
}

export interface IncomingMessageEvent {
  id: string,
  isBot: boolean,
  payload: EventPayload,
  createdAt: string
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  isConfigured: boolean;
  isListening: boolean;
  isTyping: boolean;
}


// Error handling types
export interface ApiError {
  status?: number;
  statusText?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

export interface NetworkError extends Error {
  code?: string;
  cause?: unknown;
}

export interface BotpressApiError {
  status?: number;
  message?: string;
  error?: string;
  details?: unknown;
}

// Union type for all possible error types we might encounter
export type ServiceError = Error | ApiError | NetworkError | BotpressApiError | unknown;