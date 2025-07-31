# Design Document

## Overview

This design outlines the migration from the current CSS-based styling system to Tailwind CSS for the Chrome extension. The project currently uses three main CSS files (`App.css`, `index.css`, and `ChatInterface.css`) with custom styles, and we'll replace these with Tailwind's utility-first approach while maintaining identical visual appearance and functionality.

The migration will integrate Tailwind CSS with the existing Vite + React + TypeScript setup, ensuring compatibility with Chrome Extension Manifest V3 requirements and maintaining the current build process.

## Architecture

### Current CSS Architecture
- **Global Styles**: `src/index.css` contains Vite default styles and global resets
- **App-Level Styles**: `src/App.css` contains Chrome extension specific styles (400x600px popup, loading states)
- **Component Styles**: `src/components/ChatInterface.css` contains chat interface specific styles
- **CSS-in-JS Styles**: Multiple components use `<style>` tags with CSS-in-JS:
  - `ConfigurationPanel.tsx` - Complete component styling in `<style>` tag
  - `MessageInput.tsx` - Input form and interaction styling in `<style>` tag
  - `MessageList.tsx` - Message display and scrolling styling in `<style>` tag
  - `SuggestedQuestions.tsx` - Question grid and responsive styling in `<style>` tag
- **Build Process**: CSS is processed by Vite and bundled into the final build

### Target Tailwind Architecture
- **Tailwind Base**: Replace global styles with Tailwind's base layer
- **Utility Classes**: Convert all custom CSS and CSS-in-JS to Tailwind utility classes
- **Component Refactoring**: Remove all `<style>` tags and replace with className-based styling
- **Custom Styles**: Use Tailwind's `@apply` directive for complex component styles if needed
- **Configuration**: Tailwind config optimized for Chrome extension constraints
- **Build Integration**: Tailwind processed through PostCSS in Vite pipeline

## Components and Interfaces

### Tailwind Configuration
```typescript
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      width: {
        'extension': '400px',
      },
      height: {
        'extension': '600px',
        '30': '120px', // For textarea max-height
      },
      minHeight: {
        '5': '20px', // For textarea min-height
      },
      maxHeight: {
        '30': '120px', // For textarea max-height
      },
      fontFamily: {
        'system': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        'bootstrap-primary': '#007bff',
        'bootstrap-primary-dark': '#0056b3',
        'bootstrap-gray-100': '#f8f9fa',
        'bootstrap-gray-200': '#e9ecef',
        'bootstrap-gray-300': '#dee2e6',
        'bootstrap-gray-400': '#ced4da',
        'bootstrap-gray-500': '#adb5bd',
        'bootstrap-gray-600': '#6c757d',
        'bootstrap-gray-700': '#495057',
        'bootstrap-gray-800': '#343a40',
        'bootstrap-gray-900': '#212529',
        'warning-bg': '#fff3cd',
        'warning-border': '#ffeaa7',
        'warning-text': '#856404',
        'danger-bg': '#f8d7da',
        'danger-border': '#f5c6cb',
        'danger-text': '#721c24',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'typing': 'typing 1.4s infinite ease-in-out',
      },
      keyframes: {
        typing: {
          '0%, 80%, 100%': {
            transform: 'scale(0.8)',
            opacity: '0.5',
          },
          '40%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
```

### PostCSS Configuration
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Updated Vite Configuration
The existing Vite configuration will be extended to include PostCSS processing for Tailwind:
```typescript
// vite.config.ts (updated)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.',
        }
      ],
    }),
  ],
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
})
```

## Data Models

### CSS Class Mapping Strategy
The migration will follow a systematic mapping approach:

#### App.css Mappings
- `.app` → `w-extension h-extension flex flex-col font-system antialiased bg-white overflow-hidden`
- `.loading-screen` → `h-full flex flex-col items-center justify-center gap-4 text-bootstrap-gray-700`
- `.loading-spinner` → `w-8 h-8 border-3 border-bootstrap-gray-200 border-t-bootstrap-primary rounded-full animate-spin`
- `.loading-screen p` → `m-0 text-sm font-medium`

#### ChatInterface.css Mappings
- `.chat-interface` → `h-full flex flex-col bg-white`
- `.configuration-needed` → `flex-1 flex flex-col items-center justify-center text-center px-4 py-8 text-bootstrap-gray-700`
- `.config-icon` → `text-5xl mb-4 opacity-70`
- `.config-button` → `bg-bootstrap-primary text-white border-none rounded-lg px-6 py-3 text-sm font-medium cursor-pointer hover:bg-bootstrap-primary-dark transition-colors duration-200`
- `.chat-header` → `flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-bootstrap-gray-100`

#### CSS-in-JS Component Mappings
**ConfigurationPanel.tsx:**
- `.configuration-panel` → `h-full flex flex-col p-6 bg-white overflow-y-auto`
- `.config-header` → `text-center mb-8`
- `.form-input` → `w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-bootstrap-primary focus:shadow-lg`
- `.submit-button` → `bg-bootstrap-primary text-white border-none rounded-lg px-6 py-3 text-sm font-medium cursor-pointer hover:bg-bootstrap-primary-dark transition-all duration-200`

**MessageInput.tsx:**
- `.message-input` → `border-t border-gray-200 bg-white p-4`
- `.input-container` → `flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-bootstrap-primary focus-within:shadow-sm`
- `.message-textarea` → `flex-1 border-none bg-transparent resize-none outline-none text-sm leading-relaxed min-h-5 max-h-30 py-1.5`
- `.send-button` → `flex items-center justify-center w-9 h-9 border-none rounded-full bg-gray-200 text-gray-500 cursor-pointer transition-all duration-200 hover:bg-gray-300 hover:scale-105`

**MessageList.tsx:**
- `.message-list` → `flex-1 flex flex-col overflow-hidden`
- `.messages-container` → `flex-1 overflow-y-auto p-4 flex flex-col gap-3`
- `.message-user` → `flex justify-end mb-2`
- `.message-bot` → `flex justify-start mb-2`
- `.message-text` → `px-4 py-3 rounded-2xl text-sm leading-relaxed break-words`

**SuggestedQuestions.tsx:**
- `.suggested-questions` → `bg-gray-50 border-t border-gray-200 p-4`
- `.questions-grid` → `grid grid-cols-2 gap-2 mb-3`
- `.question-button` → `bg-white border border-gray-300 rounded-lg p-2.5 text-xs leading-tight text-left cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:border-gray-400 hover:-translate-y-0.5 hover:shadow-sm`

#### Responsive Design
- Mobile breakpoints will use Tailwind's responsive prefixes (`sm:`, `md:`, etc.)
- Current `@media (max-width: 480px)` rules will be converted to `max-sm:` prefix classes

## Error Handling

### Build Process Error Handling
- **Tailwind Purging**: Ensure all used classes are included in the content configuration
- **PostCSS Errors**: Handle PostCSS compilation errors gracefully
- **Chrome Extension Compatibility**: Verify CSS-in-JS doesn't conflict with Content Security Policy

### Runtime Error Handling
- **Missing Classes**: Use Tailwind's safelist feature for dynamically generated classes
- **Style Conflicts**: Ensure Tailwind's reset doesn't conflict with Chrome extension styles
- **Performance**: Monitor CSS bundle size to ensure it doesn't exceed Chrome extension limits

### Fallback Strategies
- **Critical Styles**: Inline critical styles if Tailwind fails to load
- **Progressive Enhancement**: Ensure basic functionality works without styles
- **Development vs Production**: Different error handling for development and production builds

## Testing Strategy

### Visual Regression Testing
- **Before/After Screenshots**: Capture screenshots of all components before and after migration
- **Cross-Browser Testing**: Test in different Chrome versions and operating systems
- **Responsive Testing**: Verify responsive behavior is maintained

### Functional Testing
- **Component Testing**: Ensure all interactive elements continue to work
- **Extension Testing**: Load extension in Chrome and verify popup functionality
- **Build Testing**: Verify production build works correctly

### Performance Testing
- **Bundle Size**: Compare CSS bundle size before and after migration
- **Load Time**: Measure popup load time with new CSS
- **Memory Usage**: Monitor memory usage in Chrome extension context

### Automated Testing
- **Unit Tests**: Update existing tests to work with new class names
- **Integration Tests**: Test component rendering with Tailwind classes
- **E2E Tests**: Verify end-to-end functionality in Chrome extension environment

## Implementation Phases

### Phase 1: Setup and Configuration
- Install Tailwind CSS and dependencies
- Configure PostCSS and Tailwind config
- Update Vite configuration
- Create base CSS file with Tailwind imports

### Phase 2: Global Styles Migration
- Replace `src/index.css` with Tailwind base styles
- Migrate global resets and typography
- Update scrollbar styling using Tailwind utilities

### Phase 3: App Component Migration
- Convert `src/App.css` to Tailwind utilities
- Migrate loading states and animations
- Update Chrome extension specific styles

### Phase 4: ChatInterface Migration
- Convert `src/components/ChatInterface.css` to Tailwind utilities
- Migrate complex layouts and responsive styles
- Handle state-based styling (hover, disabled, etc.)

### Phase 5: CSS-in-JS Component Migration
- Convert `ConfigurationPanel.tsx` CSS-in-JS to Tailwind utilities
- Convert `MessageInput.tsx` CSS-in-JS to Tailwind utilities  
- Convert `MessageList.tsx` CSS-in-JS to Tailwind utilities
- Convert `SuggestedQuestions.tsx` CSS-in-JS to Tailwind utilities
- Remove all `<style>` tags from components
- Ensure all animations and complex interactions work with Tailwind

### Phase 6: Cleanup and Optimization
- Remove old CSS files
- Optimize Tailwind configuration
- Verify build output and bundle size
- Update any remaining references

## Chrome Extension Considerations

### Content Security Policy
- Tailwind generates utility classes that are CSP-compliant
- No inline styles or eval() usage
- All styles are in external CSS files

### Bundle Size Optimization
- Configure Tailwind to purge unused styles
- Use only necessary Tailwind features
- Optimize for Chrome extension size limits

### Manifest V3 Compatibility
- Ensure CSS loading works with Manifest V3 restrictions
- Verify popup styling loads correctly
- Test with Chrome extension security policies