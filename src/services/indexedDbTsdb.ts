import { TelemetryPoint } from '../types';

const DB_NAME = 'archguard_tsdb_v1';
const STORE_NAME = 'telemetry_points';
const MAX_RING_BUFFER_SIZE = 300;

export class CircularTelemetryBuffer {
  private buffer: (TelemetryPoint | null)[];
  private capacity: number;
  private head = 0; // insertion pointer
  private count = 0; // total valid items currently in buffer
  private lastFlushTimestamp = Date.now();
  private db: IDBDatabase | null = null;
  private pendingFlushQueue: TelemetryPoint[] = [];

  constructor(capacity = MAX_RING_BUFFER_SIZE) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
    this.initDb();
  }

  private initDb() {
    if (typeof window === 'undefined' || !window.indexedDB) return;

    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
          store.createIndex('timestamp_idx', 'timestamp', { unique: true });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result as IDBDatabase;
      };

      request.onerror = () => {
        // Fallback silently if IndexedDB is blocked
        this.db = null;
      };
    } catch {
      this.db = null;
    }
  }

  // O(1) push into fixed circular buffer
  public push(point: TelemetryPoint): void {
    this.buffer[this.head] = point;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }

    this.pendingFlushQueue.push(point);

    // Asynchronously flush to IndexedDB every 10 seconds (batch insert)
    const now = Date.now();
    if (now - this.lastFlushTimestamp >= 10000) {
      this.lastFlushTimestamp = now;
      this.flushToIndexedDb();
    }
  }

  // Retrieve linear chronological array of latest N points
  public getLatest(n = 60): TelemetryPoint[] {
    const total = Math.min(n, this.count);
    const result: TelemetryPoint[] = new Array(total);

    // Compute starting read index
    let startIdx = (this.head - total + this.capacity) % this.capacity;
    for (let i = 0; i < total; i++) {
      result[i] = this.buffer[(startIdx + i) % this.capacity]!;
    }
    return result;
  }

  public getCount(): number {
    return this.count;
  }

  private flushToIndexedDb() {
    if (!this.db || this.pendingFlushQueue.length === 0) return;

    const pointsToFlush = [...this.pendingFlushQueue];
    this.pendingFlushQueue = [];

    // Use requestIdleCallback or setTimeout to avoid UI thread GC pressure
    const doFlush = () => {
      try {
        if (!this.db) return;
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const pt of pointsToFlush) {
          store.put(pt);
        }
      } catch {
        // Ignore write failures in private/isolated iframe
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(doFlush, { timeout: 1000 });
    } else {
      setTimeout(doFlush, 100);
    }
  }
}
