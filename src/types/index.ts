// Core type definitions for the website content chat extension

export type ContentType =
  | "article"
  | "product"
  | "documentation"
  | "blog"
  | "generic";

export interface BotpressConfig {
  token: string; // Personal Access Token
  botId: string;
  isConfigured: boolean;
}

export interface PageMetadata {
  author?: string;
  publishDate?: string;
  description?: string;
  keywords?: string[];
  images?: string[];
  headings?: string[];
  links?: string[];
}

export interface PageContent {
  url: string;
  title: string;
  domain: string;
  contentType: ContentType;
  extractedText: string;
  metadata: PageMetadata;
  extractedAt: Date;
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
  content: string;
  timestamp: Date;
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
  createdAt: Date;
  lastActivity: Date;
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
