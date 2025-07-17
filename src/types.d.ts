// Type declarations for Cloudflare Workers modules
declare module 'cloudflare:sockets' {
  export function connect(
    address: { hostname: string; port: number },
    options?: {
      secureTransport?: 'off' | 'on' | 'starttls';
      allowHalfOpen?: boolean;
    }
  ): Socket;

  export interface Socket {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    opened: Promise<void>;
    closed: Promise<void>;
    close(): Promise<void>;
    startTls(): Socket;
  }
}
