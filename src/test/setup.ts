// Mock Chrome extension APIs for testing
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    getBytesInUse: vi.fn(),
    QUOTA_BYTES: 5242880, // 5MB
  },
  sync: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    getBytesInUse: vi.fn(),
    QUOTA_BYTES: 102400, // 100KB
  },
};

// Set up global mocks
global.chrome = {
  storage: mockChromeStorage,
} as any;

// Mock Web Crypto API
Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    subtle: {
      importKey: vi.fn(),
      deriveKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  },
  writable: true,
});

// Mock TextEncoder/TextDecoder
global.TextEncoder = class TextEncoder {
  encode(input: string): Uint8Array {
    return new Uint8Array(Buffer.from(input, "utf8"));
  }
};

global.TextDecoder = class TextDecoder {
  decode(input: Uint8Array): string {
    return Buffer.from(input).toString("utf8");
  }
};
