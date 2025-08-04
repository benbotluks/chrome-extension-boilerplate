import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContentExtractor } from "./ContentExtractor";

// Mock Chrome APIs
const mockChrome = {
  tabs: {
    query: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
};

// @ts-ignore
global.chrome = mockChrome;

describe("ContentExtractor", () => {
  let contentExtractor: ContentExtractor;

  beforeEach(() => {
    contentExtractor = ContentExtractor.getInstance();
    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return a singleton instance", () => {
      const instance1 = ContentExtractor.getInstance();
      const instance2 = ContentExtractor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("isAvailable", () => {
    it("should return true when Chrome APIs are available", async () => {
      const isAvailable = await contentExtractor.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it("should return false when Chrome APIs are not available", async () => {
      // @ts-ignore
      global.chrome = undefined;
      const isAvailable = await contentExtractor.isAvailable();
      expect(isAvailable).toBe(false);

      // Restore mock
      // @ts-ignore
      global.chrome = mockChrome;
    });
  });

  describe("extractCurrentPageContent", () => {
    it("should extract content from active tab successfully", async () => {
      const mockTab = {
        id: 123,
        url: "https://example.com",
        title: "Example Page",
      };

      const mockContent = {
        success: true,
        content: {
          url: "https://example.com",
          title: "Example Page",
          domain: "example.com",
          contentType: "article",
          extractedText: "This is example content",
          metadata: {
            title: "Example Page",
            description: "An example page",
          },
          extractedAt: new Date(),
        },
      };

      mockChrome.tabs.query.mockResolvedValue([mockTab]);
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: mockContent },
      ]);

      const result = await contentExtractor.extractCurrentPageContent();

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content?.url).toBe("https://example.com");
      expect(result.content?.title).toBe("Example Page");
    });

    it("should handle no active tab error", async () => {
      mockChrome.tabs.query.mockResolvedValue([]);

      const result = await contentExtractor.extractCurrentPageContent();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No active tab found");
    });

    it("should handle browser internal pages", async () => {
      const mockTab = {
        id: 123,
        url: "chrome://settings",
        title: "Settings",
      };

      mockChrome.tabs.query.mockResolvedValue([mockTab]);

      const result = await contentExtractor.extractCurrentPageContent();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot access browser internal pages");
    });

    it("should handle script execution failure", async () => {
      const mockTab = {
        id: 123,
        url: "https://example.com",
        title: "Example Page",
      };

      mockChrome.tabs.query.mockResolvedValue([mockTab]);
      mockChrome.scripting.executeScript.mockResolvedValue([]);

      const result = await contentExtractor.extractCurrentPageContent();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to execute content extraction script");
    });

    it("should handle content extraction errors", async () => {
      const mockTab = {
        id: 123,
        url: "https://example.com",
        title: "Example Page",
      };

      const mockErrorResult = {
        success: false,
        error: "Content extraction failed",
      };

      mockChrome.tabs.query.mockResolvedValue([mockTab]);
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: mockErrorResult },
      ]);

      const result = await contentExtractor.extractCurrentPageContent();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Content extraction failed");
    });
  });
});
