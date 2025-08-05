import type { DomElement, PageContent, PageMetadata } from '../types'

export interface ContentExtractionResult {
  success: boolean;
  content?: PageContent;
  error?: string;
}

/**
 * Standalone function that gets injected into the page to extract content
 * This runs in the page context, not the extension context
 * Must be completely self-contained with no external dependencies
 */
function extractContentFromPage(): ContentExtractionResult {
  try {
    // Content extraction utilities (duplicated here since this runs in page context)
    const extractTextContent = (): string => {
      const contentSelectors = [
        "main",
        "article",
        '[role="main"]',
        ".content",
        ".post-content",
        ".article-body",
        ".entry-content",
        "#content",
        ".main-content",
      ];

      let mainContent: Element | null = null;

      // Try to find main content area
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          mainContent = element;
          break;
        }
      }

      // Fallback to body if no main content found
      if (!mainContent) {
        mainContent = document.body;
      }

      // Extract text while filtering out unwanted elements
      const unwantedSelectors = [
        "nav",
        "header",
        "footer",
        "aside",
        ".navigation",
        ".nav",
        ".menu",
        ".sidebar",
        ".widget",
        ".ad",
        ".advertisement",
        ".social-share",
        ".comments",
        ".comment",
        "script",
        "style",
        "noscript",
      ];

      // Clone the content to avoid modifying the original
      const contentClone = mainContent.cloneNode(true) as Element;

      // Remove unwanted elements
      unwantedSelectors.forEach((selector) => {
        const elements = contentClone.querySelectorAll(selector);
        elements.forEach((el) => el.remove());
      });

      // Extract text content
      let textContent =
        contentClone.textContent || (contentClone as DomElement).innerText || "";

      // Clean up whitespace
      textContent = textContent
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      return textContent;
    };

    const extractMetadata = () => {
      const metadata: PageMetadata = {};

      // Basic page info
      metadata.title = document.title || "";
      metadata.url = window.location.href;
      metadata.domain = window.location.hostname;

      // Meta tags
      const metaTags = document.querySelectorAll("meta");
      metaTags.forEach((tag) => {
        const name = tag.getAttribute("name") || tag.getAttribute("property");
        const content = tag.getAttribute("content");

        if (name && content) {
          switch (name.toLowerCase()) {
            case "description":
            case "og:description":
              metadata.description = content;
              break;
            case "keywords":
              metadata.keywords = content
                .split(",")
                .map((k: string) => k.trim());
              break;
            case "author":
            case "article:author":
              metadata.author = content;
              break;
            case "article:published_time":
            case "article:published":
              metadata.publishDate = content;
              break;
            case "og:image":
              if (!metadata.images) metadata.images = [];
              metadata.images.push(content);
              break;
          }
        }
      });

      // Extract headings
      const headings: Array<{ level: number; text: string }> = [];
      const headingElements = document.querySelectorAll(
        "h1, h2, h3, h4, h5, h6"
      );
      headingElements.forEach((heading) => {
        const text = heading.textContent?.trim();
        if (text) {
          headings.push({
            level: parseInt(heading.tagName.charAt(1)),
            text: text,
          });
        }
      });
      metadata.headings = headings;

      // Extract links
      const links: Array<{ url: string; text: string }> = [];
      const linkElements = document.querySelectorAll("a[href]");
      linkElements.forEach((link) => {
        const href = link.getAttribute("href");
        const text = link.textContent?.trim();
        if (href && text && !href.startsWith("#")) {
          try {
            links.push({
              url: new URL(href, window.location.href).href,
              text: text,
            });
          } catch {
            // Skip invalid URLs
          }
        }
      });
      metadata.links = links.slice(0, 20); // Limit to first 20 links

      return metadata;
    };

    const detectContentType = (metadata: PageMetadata): 'article' | 'product' | 'documentation' | 'blog' | 'generic' => {
      const url = window.location.href.toLowerCase();
      const title = (metadata.title || "").toLowerCase();
      const description = (metadata.description || "").toLowerCase();

      // Check for article indicators
      if (
        document.querySelector("article") ||
        document.querySelector('[role="article"]') ||
        metadata.author ||
        metadata.publishDate ||
        url.includes("/article/") ||
        url.includes("/post/") ||
        url.includes("/blog/")
      ) {
        return "article";
      }

      // Check for product page indicators
      if (
        document.querySelector("[data-product]") ||
        document.querySelector(".product") ||
        document.querySelector(".price") ||
        url.includes("/product/") ||
        url.includes("/item/") ||
        title.includes("buy") ||
        description.includes("price")
      ) {
        return "product";
      }

      // Check for documentation indicators
      if (
        document.querySelector(".docs") ||
        document.querySelector(".documentation") ||
        document.querySelector("pre code") ||
        url.includes("/docs/") ||
        url.includes("/documentation/") ||
        title.includes("documentation") ||
        title.includes("api")
      ) {
        return "documentation";
      }

      // Check for blog indicators
      if (
        url.includes("/blog/") ||
        title.includes("blog") ||
        document.querySelector(".blog-post")
      ) {
        return "blog";
      }

      return "generic";
    };

    // Extract content
    const textContent = extractTextContent();
    const metadata = extractMetadata();
    const contentType = detectContentType(metadata);

    // Debug logging
    console.log('[extractContentFromPage] Current URL:', window.location.href);
    console.log('[extractContentFromPage] Extracted metadata URL:', metadata.url);

    // Limit content size (conservative 3000 characters to stay under 4KB total)
    const maxLength = 5000;
    const truncatedContent =
      textContent.length > maxLength
        ? textContent.substring(0, maxLength) + "..."
        : textContent;

    const pageContent: PageContent = {
      url: metadata.url || "",
      title: metadata.title || "",
      domain: metadata.domain || "",
      contentType: contentType,
      extractedText: truncatedContent,
      // metadata: metadata,
      extractedAt: new Date().toISOString(),
    };

    // Validate payload size (4KB = 4096 bytes)
    const payloadSize = new TextEncoder().encode(JSON.stringify(pageContent)).length;
    const maxPayloadSize = 4096; // 4KB

    if (payloadSize > maxPayloadSize) {
      // If still too large, further truncate the extracted text
      const overhead = payloadSize - maxPayloadSize;
      const newTextLength = Math.max(0, truncatedContent.length - overhead - 100); // Extra buffer

      pageContent.extractedText = truncatedContent.substring(0, newTextLength) + "...";

      console.warn(`[extractContentFromPage] Payload too large (${payloadSize} bytes), truncated to fit under 4KB`);
    }

    return {
      success: true,
      content: pageContent,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Content extraction failed",
    };
  }
}

export class ContentExtractor {
  private static instance: ContentExtractor;

  private constructor() { }

  public static getInstance(): ContentExtractor {
    if (!ContentExtractor.instance) {
      ContentExtractor.instance = new ContentExtractor();
    }
    return ContentExtractor.instance;
  }

  /**
   * Extract content from the current active tab
   */
  public async extractCurrentPageContent(): Promise<ContentExtractionResult> {
    try {
      // Check if we're in a Chrome extension environment
      if (!chrome?.tabs) {
        // Development mode fallback - cannot extract from actual webpage
        console.warn('Chrome extension APIs not available, content extraction not possible in development mode');
        return {
          success: false,
          error: 'Content extraction requires Chrome extension APIs. Please build and load the extension to test this feature.'
        };
      }

      // Get the current active tab
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!activeTab?.id) {
        throw new Error("No active tab found");
      }

      // Check if we can access the tab
      if (
        activeTab.url?.startsWith("chrome://") ||
        activeTab.url?.startsWith("chrome-extension://") ||
        activeTab.url?.startsWith("moz-extension://")
      ) {
        throw new Error("Cannot access browser internal pages");
      }

      // Inject and execute content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: extractContentFromPage, // Use standalone function instead of class method
      });
      console.log('[ContentExtractor] Script execution results:', results);
      console.log('[ContentExtractor] Active tab URL:', activeTab.url);
      if (!results || results.length === 0) {
        throw new Error("Failed to execute content extraction script");
      }

      const result = results[0].result as ContentExtractionResult;

      if (!result.success) {
        throw new Error(result.error || "Content extraction failed");
      }

      return result;
    } catch (error) {
      console.error("Content extraction error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  public async isAvailable(): Promise<boolean> {
    try {
      // Content extraction requires Chrome extension APIs
      return !!(chrome?.tabs && chrome?.scripting);
    } catch {
      return false;
    }
  }
}


// async const serviceWrapper<T>(fn: , ) => {

// }