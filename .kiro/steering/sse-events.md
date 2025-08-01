# Server-Sent Events (SSE) Guide for Node.js

## Overview

The Botpress Chat API Client provides real-time event streaming through Server-Sent Events (SSE) using the `SignalListener` class. This enables applications to receive live updates about conversations, messages, participants, and custom events.

## Architecture

### Event Flow
1. **Connection**: Establishes SSE connection to `{apiUrl}/conversations/{conversationId}/listen`
2. **Authentication**: Uses `x-user-key` header for authenticated access
3. **Event Parsing**: Automatically parses incoming events using Zod schemas
4. **Event Emission**: Emits typed events through EventEmitter pattern
5. **Connection Management**: Includes watchdog timer and automatic reconnection handling

### Core Components
- **SignalListener**: Main class for managing SSE connections
- **EventSourceEmitter**: Cross-platform EventSource wrapper (Node.js/Browser)
- **WatchDog**: Connection timeout monitoring (60s default)
- **Event Schemas**: Auto-generated Zod validators for type safety

## Basic Usage

### Establishing Connection
```typescript
import * as chat from '@botpress/chat'

const client = await chat.Client.connect({ 
  webhookId: 'your-webhook-id' 
})

const { conversation } = await client.createConversation({})

// Start listening for events
const listener = await client.listenConversation({
  id: conversation.id
})
```

### Listening for Events
```typescript
// Listen for new messages
listener.on('message_created', (message) => {
  console.log('New message:', message.payload)
  console.log('From user:', message.userId)
  console.log('Is bot message:', message.isBot)
})

// Listen for participants joining
listener.on('participant_added', (event) => {
  console.log('Participant added:', event.participantId)
})

// Listen for custom events
listener.on('event_created', (event) => {
  console.log('Custom event:', event.payload)
})

// Handle connection errors
listener.on('error', (error) => {
  console.error('Connection error:', error)
  // Implement reconnection logic here
})
```

## Available Event Types

### 1. Message Events

#### `message_created`
Fired when a new message is sent in the conversation.

```typescript
listener.on('message_created', (event) => {
  const {
    id,           // Message ID
    createdAt,    // ISO 8601 timestamp
    payload,      // Message content (text, image, card, etc.)
    userId,       // Sender's user ID
    conversationId, // Conversation ID
    metadata,     // Optional message metadata
    isBot         // true if sent by bot
  } = event
})
```

**Payload Types:**
- `text`: Plain text messages
- `image`: Image messages with `imageUrl`
- `audio`: Audio messages with `audioUrl`
- `video`: Video messages with `videoUrl`
- `file`: File attachments with `fileUrl`
- `card`: Rich cards with title, subtitle, actions
- `carousel`: Multiple cards in carousel format
- `choice`: Multiple choice questions
- `dropdown`: Dropdown selection
- `location`: Geographic location data
- `markdown`: Markdown-formatted text

#### `message_deleted`
Fired when a message is deleted from the conversation.

```typescript
listener.on('message_deleted', (event) => {
  // Handle message deletion
})
```

### 2. Participant Events

#### `participant_added`
Fired when a user joins the conversation.

```typescript
listener.on('participant_added', (event) => {
  const {
    conversationId,  // Conversation ID
    participantId    // User ID of new participant
  } = event
})
```

#### `participant_removed`
Fired when a user leaves the conversation.

```typescript
listener.on('participant_removed', (event) => {
  const {
    conversationId,  // Conversation ID
    participantId    // User ID of removed participant
  } = event
})
```

### 3. Custom Events

#### `event_created`
Fired when custom events are created (e.g., typing indicators, custom bot events).

```typescript
listener.on('event_created', (event) => {
  const {
    id,             // Event ID (nullable)
    createdAt,      // ISO 8601 timestamp
    payload,        // Custom event data
    conversationId, // Conversation ID
    userId,         // User who created the event
    isBot          // true if created by bot
  } = event
})
```

### 4. Unknown Events

#### `unknown`
Fired when an event doesn't match any known schema (fallback).

```typescript
listener.on('unknown', (data) => {
  console.log('Unknown event received:', data)
})
```

## Connection Management

### Connection States
```typescript
// Check current connection status
console.log(listener.status) // 'disconnected' | 'connecting' | 'connected'
```

### Manual Connection Control
```typescript
// Manually connect (usually not needed)
await listener.connect()

// Disconnect
await listener.disconnect()
```

### Connection Timeout
The client includes a 60-second watchdog timer that automatically disconnects if no events are received. This helps detect stale connections.

## Error Handling and Reconnection

### Basic Error Handling
```typescript
listener.on('error', (error) => {
  console.error('SSE connection error:', error)
  
  if (error.message.includes('timeout')) {
    console.log('Connection timed out')
  } else if (error.message.includes('network')) {
    console.log('Network error occurred')
  }
})
```

### Automatic Reconnection Pattern
```typescript
const setupListener = async () => {
  const listener = await client.listenConversation({
    id: conversation.id
  })
  
  // Set up event handlers
  listener.on('message_created', handleMessage)
  listener.on('participant_added', handleParticipantAdded)
  
  // Handle disconnections with exponential backoff
  listener.on('error', async (error) => {
    console.error('Connection lost:', error)
    
    let retryDelay = 1000 // Start with 1 second
    const maxRetries = 5
    let retryCount = 0
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Reconnecting in ${retryDelay}ms... (attempt ${retryCount + 1})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        
        await listener.connect()
        console.log('Reconnected successfully')
        break
        
      } catch (reconnectError) {
        retryCount++
        retryDelay *= 2 // Exponential backoff
        console.error(`Reconnection attempt ${retryCount} failed:`, reconnectError)
      }
    }
    
    if (retryCount >= maxRetries) {
      console.error('Max reconnection attempts reached')
      // Handle permanent failure (e.g., create new listener)
    }
  })
  
  return listener
}
```

### State Synchronization After Reconnection
```typescript
listener.on('error', async (error) => {
  console.log('Connection lost, synchronizing state...')
  
  try {
    // Reconnect
    await listener.connect()
    
    // Sync missed messages
    const { messages } = await client.listMessages({
      conversationId: conversation.id
    })
    // Update local state with any missed messages
    syncLocalState(messages)
    
  } catch (syncError) {
    console.error('Failed to sync state:', syncError)
  }
})
```

## Advanced Patterns

### Event Filtering
```typescript
listener.on('message_created', (message) => {
  // Ignore own messages
  if (message.userId === client.user.id) {
    return
  }
  
  // Only process bot messages
  if (!message.isBot) {
    return
  }
  
  // Handle specific message types
  if (message.payload.type === 'text') {
    handleTextMessage(message.payload.text)
  }
})
```

### Event Aggregation
```typescript
const messageBuffer: any[] = []
let bufferTimeout: NodeJS.Timeout

listener.on('message_created', (message) => {
  messageBuffer.push(message)
  
  // Clear existing timeout
  if (bufferTimeout) {
    clearTimeout(bufferTimeout)
  }
  
  // Process buffer after 500ms of inactivity
  bufferTimeout = setTimeout(() => {
    processBatchedMessages(messageBuffer)
    messageBuffer.length = 0
  }, 500)
})
```

### Conversation State Management
```typescript
class ConversationState {
  private participants = new Set<string>()
  private messageCount = 0
  
  constructor(private listener: SignalListener) {
    this.setupEventHandlers()
  }
  
  private setupEventHandlers() {
    this.listener.on('participant_added', (event) => {
      this.participants.add(event.participantId)
      console.log(`Participants: ${this.participants.size}`)
    })
    
    this.listener.on('participant_removed', (event) => {
      this.participants.delete(event.participantId)
      console.log(`Participants: ${this.participants.size}`)
    })
    
    this.listener.on('message_created', (message) => {
      this.messageCount++
      console.log(`Total messages: ${this.messageCount}`)
    })
  }
}
```

## Debugging

### Enable Debug Mode
```typescript
const listener = await client.listenConversation({
  id: conversation.id
})

// Debug mode shows parsing attempts and successful parses
// Set debug: true in client connection
const client = await chat.Client.connect({ 
  webhookId: 'your-webhook-id',
  debug: true 
})
```

### Event Logging
```typescript
// Log all events for debugging
const eventTypes = [
  'message_created', 'message_deleted',
  'participant_added', 'participant_removed', 
  'event_created', 'unknown', 'error'
]

eventTypes.forEach(eventType => {
  listener.on(eventType as any, (data) => {
    console.log(`[${new Date().toISOString()}] ${eventType}:`, data)
  })
})
```

## Performance Considerations

### Memory Management
```typescript
// Clean up listeners when done
const cleanup = () => {
  listener.disconnect()
  // Remove all event listeners to prevent memory leaks
  listener.cleanup?.() // If available
}

// Handle process termination
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
```

### Event Rate Limiting
```typescript
let lastEventTime = 0
const MIN_EVENT_INTERVAL = 100 // ms

listener.on('message_created', (message) => {
  const now = Date.now()
  if (now - lastEventTime < MIN_EVENT_INTERVAL) {
    return // Skip rapid events
  }
  lastEventTime = now
  
  handleMessage(message)
})
```

## Node.js Specific Considerations

### EventSource Implementation
The client automatically uses the Node.js `eventsource` package when running in Node.js environments, providing:
- Native HTTP/HTTPS support
- Custom header support for authentication
- Proper connection lifecycle management
- Error handling and reconnection capabilities

### Environment Variables
```typescript
// Use environment variables for configuration
const client = await chat.Client.connect({
  webhookId: process.env.BOTPRESS_WEBHOOK_ID!,
  debug: process.env.NODE_ENV === 'development'
})
```

### Process Management
```typescript
// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')
  await listener.disconnect()
  process.exit(0)
})
```