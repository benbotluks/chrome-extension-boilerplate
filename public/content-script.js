// Content script for extracting webpage content
// This script runs in the context of web pages and extracts content when requested

(function() {
  'use strict';

  // Content extraction utilities
  const ContentExtractor = {
    // Extract main text content from the page
    extractTextContent() {
      const contentSelectors = [
        'main',
        'article', 
        '[role="main"]',
        '.content',
        '.post-content',
        '.article-body',
        '.entry-content',
        '#content',
        '.main-content'
      ];

      let mainContent = null;
      
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
        'nav', 'header', 'footer', 'aside',
        '.navigation', '.nav', '.menu',
        '.sidebar', '.widget', '.ad', '.advertisement',
        '.social-share', '.comments', '.comment',
        'script', 'style', 'noscript'
      ];

      // Clone the content to avoid modifying the original
      const contentClone = mainContent.cloneNode(true);
      
      // Remove unwanted elements
      unwantedSelectors.forEach(selector => {
        const elements = contentClone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });

      // Extract text content
      let textContent = contentClone.textContent || contentClone.innerText || '';
      
      // Clean up whitespace
      textContent = textContent
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      return textContent;
    },

    // Extract page metadata
    extractMetadata() {
      const metadata = {};

      // Basic page info
      metadata.title = document.title || '';
      metadata.url = window.location.href;
      metadata.domain = window.location.hostname;

      // Meta tags
      const metaTags = document.querySelectorAll('meta');
      metaTags.forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property');
        const content = tag.getAttribute('content');
        
        if (name && content) {
          switch (name.toLowerCase()) {
            case 'description':
            case 'og:description':
              metadata.description = content;
              break;
            case 'keywords':
              metadata.keywords = content.split(',').map(k => k.trim());
              break;
            case 'author':
            case 'article:author':
              metadata.author = content;
              break;
            case 'article:published_time':
            case 'article:published':
              metadata.publishDate = content;
              break;
            case 'og:image':
              if (!metadata.images) metadata.images = [];
              metadata.images.push(content);
              break;
          }
        }
      });

      // Extract headings
      const headings = [];
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headingElements.forEach(heading => {
        const text = heading.textContent?.trim();
        if (text) {
          headings.push({
            level: parseInt(heading.tagName.charAt(1)),
            text: text
          });
        }
      });
      metadata.headings = headings;

      // Extract links
      const links = [];
      const linkElements = document.querySelectorAll('a[href]');
      linkElements.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent?.trim();
        if (href && text && !href.startsWith('#')) {
          links.push({
            url: new URL(href, window.location.href).href,
            text: text
          });
        }
      });
      metadata.links = links.slice(0, 20); // Limit to first 20 links

      return metadata;
    },

    // Detect content type based on page structure and metadata
    detectContentType(metadata) {
      const url = window.location.href.toLowerCase();
      const title = (metadata.title || '').toLowerCase();
      const description = (metadata.description || '').toLowerCase();

      // Check for article indicators
      if (
        document.querySelector('article') ||
        document.querySelector('[role="article"]') ||
        metadata.author ||
        metadata.publishDate ||
        url.includes('/article/') ||
        url.includes('/post/') ||
        url.includes('/blog/')
      ) {
        return 'article';
      }

      // Check for product page indicators
      if (
        document.querySelector('[data-product]') ||
        document.querySelector('.product') ||
        document.querySelector('.price') ||
        url.includes('/product/') ||
        url.includes('/item/') ||
        title.includes('buy') ||
        description.includes('price')
      ) {
        return 'product';
      }

      // Check for documentation indicators
      if (
        document.querySelector('.docs') ||
        document.querySelector('.documentation') ||
        document.querySelector('pre code') ||
        url.includes('/docs/') ||
        url.includes('/documentation/') ||
        title.includes('documentation') ||
        title.includes('api')
      ) {
        return 'documentation';
      }

      // Check for blog indicators
      if (
        url.includes('/blog/') ||
        title.includes('blog') ||
        document.querySelector('.blog-post')
      ) {
        return 'blog';
      }

      return 'generic';
    },

    // Main extraction function
    extractPageContent() {
      try {
        const textContent = this.extractTextContent();
        const metadata = this.extractMetadata();
        const contentType = this.detectContentType(metadata);

        // Limit content size (approximate 5000 characters)
        const maxLength = 5000;
        const truncatedContent = textContent.length > maxLength 
          ? textContent.substring(0, maxLength) + '...'
          : textContent;

        return {
          success: true,
          content: {
            url: metadata.url,
            title: metadata.title,
            domain: metadata.domain,
            contentType: contentType,
            extractedText: truncatedContent,
            metadata: metadata,
            extractedAt: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error('Content extraction failed:', error);
        return {
          success: false,
          error: error.message || 'Content extraction failed'
        };
      }
    }
  };

  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      const result = ContentExtractor.extractPageContent();
      sendResponse(result);
    }
    return true; // Keep message channel open for async response
  });

  // Auto-extract content when page loads (if enabled)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait a bit for dynamic content to load
      setTimeout(() => {
        const result = ContentExtractor.extractPageContent();
        if (result.success) {
          // Send extracted content to background script
          chrome.runtime.sendMessage({
            action: 'contentExtracted',
            data: result.content
          });
        }
      }, 1000);
    });
  } else {
    // Page already loaded
    setTimeout(() => {
      const result = ContentExtractor.extractPageContent();
      if (result.success) {
        chrome.runtime.sendMessage({
          action: 'contentExtracted',
          data: result.content
        });
      }
    }, 1000);
  }

})();