# Implementation Plan

- [x] 1. Add SSE listener methods to BotpressService

  - Add `startListening(conversationId, onMessage)` method to establish SSE connection
  - Add `stopListening()` method to clean up SSE connection
  - Import and use the Botpress Chat API's `listenConversation` method
  - Handle `message_created` events and convert to ChatMessage format
  - _Requirements: 1.1, 1.2, 2.1_

- [-] 2. Integrate SSE with useBotpressChat hook

  - Add `isListening` state to track SSE connection status
  - Start SSE listening when a conversation becomes active
  - Update messages state when SSE events are received
  - Stop listening when conversation changes or component unmounts
  - _Requirements: 1.3, 2.2, 2.4_

- [ ] 3. Modify sendMessage to work with SSE

  - Remove manual message fetching after sending when SSE is active
  - Rely on SSE `message_created` events to update the UI
  - Keep fallback to manual fetching if SSE is not available
  - Prevent duplicate messages from appearing
  - _Requirements: 1.4, 2.3, 2.5_

- [ ] 4. Add proper cleanup and error handling
  - Ensure SSE connections are properly closed on component unmount
  - Add basic error handling for SSE connection failures
  - Test conversation switching with SSE connections
  - Add simple logging for debugging SSE issues
  - _Requirements: 1.5, 2.1, 2.5_
