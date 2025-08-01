# Botpress Chat API Authentication Reference

This document contains the official authentication documentation for the Botpress Chat API Client, which is critical for implementing proper user authentication and session persistence.

## Authentication Guide

### Overview
The Botpress Chat API Client uses a multi-layered authentication system that combines webhook-based API access with user-specific authentication keys. All authenticated operations require both a valid webhook connection and a user key.

### Authentication Architecture

#### 1. Webhook-Based Connection
- **Purpose**: Establishes connection to your specific Botpress bot
- **Required**: `webhookId` from your Botpress Dashboard
- **URL Format**: `https://chat.botpress.cloud/{webhookId}` (or custom `apiUrl`)
- **Connection Test**: Automatically validates connection with `/hello` endpoint

#### 2. User Authentication
- **Purpose**: Identifies and authenticates individual users within conversations
- **Method**: `x-user-key` header sent with all API requests
- **Types**: Three authentication methods supported

### Authentication Methods

#### Method 1: Automatic User Creation (Simplest)
```typescript
const client = await chat.Client.connect({ webhookId: 'your-webhook-id' })
```

**How it works:**
1. Creates a new user automatically via `createUser()` API call
2. Returns an `AuthenticatedClient` with embedded user key
3. User key is automatically included in all subsequent requests

**Best for:** Quick prototyping, temporary users, testing

#### Method 2: Pre-existing User Key
```typescript
const client = await chat.Client.connect({ 
  webhookId: 'your-webhook-id',
  userKey: 'existing-user-key'
})
```

**How it works:**
1. Uses provided user key to call `getOrCreateUser()` 
2. If user exists, retrieves user data; if not, creates new user
3. Returns `AuthenticatedClient` with the provided key

**Best for:** Returning users, persistent user sessions, when you manage user keys externally

#### Method 3: Encryption Key + User ID (Most Secure)
```typescript
const client = await chat.Client.connect({ 
  webhookId: 'your-webhook-id',
  encryptionKey: 'your-secret-key',
  userId: 'unique-user-identifier'
})
```

**How it works:**
1. Creates JWT token: `jwt.sign({ id: userId }, encryptionKey, { algorithm: 'HS256' })`
2. Uses JWT as user key to call `getOrCreateUser()`
3. Returns `AuthenticatedClient` with the generated JWT key

**Best for:** Production applications, when you need cryptographic user verification

**⚠️ Browser Limitation:** Encryption key method only works in Node.js environments due to JWT dependency

### Client Types

#### Unauthenticated Client
```typescript
const client = new chat.Client({ webhookId: 'your-webhook-id' })
```

**Available Operations:**
- `createUser()` - Create new users
- `getOrCreateUser()` - Get/create users with provided key
- Basic connection testing

**Cannot Access:**
- Conversations, messages, events, participants
- Real-time event listening

#### Authenticated Client
```typescript
const client = await chat.Client.connect({ webhookId: 'your-webhook-id' })
```

**Available Operations:**
- All conversation operations (create, get, list, delete)
- All message operations (create, get, list, delete)
- All participant operations (add, remove, get, list)
- All event operations (create, get)
- User operations (get, update, delete - but not create)
- Real-time event listening

**User Context:**
- `client.user` - Contains user information and authentication key
- `client.user.key` - The authentication key used for API calls

### Authentication Flow Details

#### Connection Process
1. **Webhook Validation**: Tests connection to `{apiUrl}/hello`
2. **User Resolution**: Based on provided authentication method
3. **Client Creation**: Returns `AuthenticatedClient` with embedded user context

#### Request Authentication
Every authenticated API call includes:
```typescript
{
  'x-user-key': client.user.key,
  ...otherRequestData
}
```

### Error Handling
- `ChatConfigError`: Invalid configuration (missing userId with encryptionKey, browser JWT usage)
- `ChatClientError`: General client errors (connection failures, invalid responses)
- `ChatHTTPError`: HTTP-specific errors with status codes

### Security Considerations

#### User Key Management
- **Store Securely**: User keys should be treated as sensitive credentials
- **Don't Log**: Avoid logging user keys in application logs
- **Rotation**: Consider implementing key rotation for long-lived applications

#### Encryption Keys
- **Server-Side Only**: Use encryption key method only in secure server environments
- **Strong Keys**: Use cryptographically strong encryption keys
- **Key Storage**: Store encryption keys in secure configuration (environment variables, key vaults)

#### Browser vs Node.js
- **Browser**: Limited to automatic creation or pre-existing user keys
- **Node.js**: Full authentication method support including encryption keys

### Real-time Authentication
WebSocket/EventSource connections for real-time events also require authentication:
```typescript
const listener = await client.listenConversation({id: conversationId})
```
The user key is automatically passed to the SignalListener for authenticated real-time connections.

### Common Patterns

#### Persistent User Sessions
```typescript
// Store user key for future sessions
const client = await chat.Client.connect({ webhookId })
const userKey = client.user.key
localStorage.setItem('chatUserKey', userKey)

// Restore session
const storedKey = localStorage.getItem('chatUserKey')
const client = await chat.Client.connect({ webhookId, userKey: storedKey })
```

#### Server-Side User Management
```typescript
// Generate secure user keys server-side
const client = await chat.Client.connect({
  webhookId: process.env.WEBHOOK_ID,
  encryptionKey: process.env.CHAT_ENCRYPTION_KEY,
  userId: user.id
})
```

#### Error Recovery
```typescript
try {
  const client = await chat.Client.connect({ webhookId, userKey })
} catch (error) {
  if (error instanceof chat.ChatConfigError) {
    // Configuration issue - check webhook ID, user key format
  } else if (error instanceof chat.ChatHTTPError) {
    // Network/API issue - check connection, retry logic
  }
}
```

## Key Implementation Notes

**Critical Understanding:** The client has to be initialized with the appropriate user key, which can only be read (and stored) when the user is created (i.e. when a chat client is connected without specifying a user key).

This means that, in order to load an existing conversation (which is what we want to do on startup), we have to have access to the user key from storage. Without the correct user key, attempts to load conversations or messages will result in 403 errors because the client is not initialized with the user key pertaining to the user who participated in the conversation.

**Implementation Strategy:**
1. On first connection, create user automatically and store the returned user key
2. On subsequent connections, retrieve stored user key and use it to reconnect
3. If stored user key is invalid, create new user and update stored key
4. Always ensure the client is authenticated with the correct user key before attempting to load conversations