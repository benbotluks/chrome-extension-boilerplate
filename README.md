# Website Content Chat Extension

A Chrome extension that allows users to chat with their Botpress bot about the content of any website. The extension automatically extracts webpage content and provides an interactive chat interface for discussing, summarizing, and analyzing web pages.

## Features

- **Automatic Content Extraction**: Extracts text content, metadata, and structure from any webpage
- **Botpress Integration**: Connect to your Botpress bot using webhook ID for real-time conversations
- **Real-time Chat**: Server-sent events (SSE) for live message streaming and typing indicators
- **Conversation Persistence**: Saves chat history and associates conversations with specific URLs
- **Smart Content Processing**: Intelligently filters out navigation, ads, and irrelevant content
- **Content Type Detection**: Recognizes articles, products, documentation, blogs, and generic pages
- **Error Handling**: Comprehensive error handling with user-friendly messages and retry options

## Prerequisites

- [Node.js](https://nodejs.org/) (version 18+ or 20+)
- [pnpm](https://pnpm.io/) package manager
- A Botpress bot with webhook configured

## Setup

1. Install dependencies:
   ```sh
   pnpm install
   ```

2. Build the extension:
   ```sh
   pnpm build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build` directory

## Configuration

1. Click the extension icon to open the popup
2. Enter your Botpress webhook ID in the configuration panel
3. The extension will test the connection and save your settings
4. Start chatting about any webpage content

## Development

### Available Scripts

```sh
pnpm dev      # Start development server (content extraction disabled)
pnpm build    # Build for production
pnpm lint     # Run ESLint
pnpm test     # Run tests with Vitest
pnpm preview  # Preview production build
```

### Development vs Production

- **Development mode** (`pnpm dev`): Content extraction shows placeholder messages since Chrome extension APIs aren't available
- **Production mode** (built extension): Full content extraction and chat functionality

## Architecture

### Core Services

- **BotpressService**: Handles Botpress Chat API integration with SSE support
- **ContentExtractor**: Extracts and processes webpage content using Chrome scripting API
- **StorageService**: Manages Chrome extension storage for configuration and conversations
- **ServiceErrorWrapper**: Provides consistent error handling across all services

### Key Components

- **App**: Main application with loading, configuration, and chat views
- **ChatInterface**: Real-time chat interface with message history
- **ConfigurationPanel**: Botpress webhook configuration and testing
- **Message Components**: Typed message rendering for user and bot messages

### Technology Stack

- **React 18.3.1** with TypeScript
- **Vite 5.3.1** for build tooling
- **Botpress Chat SDK** for bot integration
- **Tailwind CSS** for styling
- **Chrome Extension Manifest V3**

## Permissions

The extension requires these Chrome permissions:
- `storage` - Save configuration and conversation history
- `activeTab` - Access current tab content
- `scripting` - Inject content extraction scripts
- `host_permissions` - Access all websites for content extraction

## Troubleshooting

### Content Extraction Issues

1. **Build and load the extension**: Content extraction only works in production mode
2. **Check permissions**: Ensure the extension has necessary permissions in Chrome
3. **Test on regular websites**: Won't work on `chrome://` or extension internal pages
4. **Check console**: Look for error messages in browser developer tools

### Botpress Connection Issues

1. **Verify webhook ID**: Ensure your Botpress webhook ID is correct
2. **Check bot status**: Make sure your Botpress bot is published and accessible
3. **Network connectivity**: Verify internet connection and firewall settings

## Project Structure

```
├── public/
│   ├── manifest.json          # Chrome extension manifest
│   └── background.js          # Service worker
├── src/
│   ├── components/            # React components
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Core business logic
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Utility functions
│   └── App.tsx               # Main application component
└── .kiro/specs/              # Feature specifications
```