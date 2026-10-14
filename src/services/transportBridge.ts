import {
  TransportMode,
  TransportStatus,
  TelemetryPoint,
  ContainerNode,
  McpRpcRequest,
  McpRpcResponse,
  Snapshot,
} from '../types';
import { engineInstance } from './virtualEngine';

export interface ArchGuardTransport {
  getStatus(): TransportStatus;
  setTargetMode(mode: TransportMode): void;
  probeDaemon(): Promise<boolean>;
  executeCommand(cmd: string): Promise<string[]>;
  sendMcp(req: McpRpcRequest): Promise<McpRpcResponse>;
  performLifecycle(action: string, mfaToken?: string): Promise<{ success: boolean; message: string }>;
  reconfigureCgroups(params: { cpuCores?: number; memoryLimitMb?: number; cpuWeight?: number }, mfaToken?: string): Promise<{ success: boolean; message: string }>;
  createSnapshot(name: string, description: string): Promise<Snapshot>;
  rollbackSnapshot(id: string, mfaToken?: string): Promise<{ success: boolean; message: string }>;
  toggleAirplaneMode(sealed?: boolean): Promise<{ success: boolean; sealed: boolean }>;
}

class HybridTransportBridge implements ArchGuardTransport {
  private status: TransportStatus = {
    mode: 'emulator',
    connected: true,
    endpoint: 'Browser Sandbox Fallback (systemd-nspawn v256)',
    latencyMs: 0,
    lastChecked: Date.now(),
  };

  private daemonEndpoint = 'http://127.0.0.1:8420';
  private daemonWsEndpoint = 'ws://127.0.0.1:8420/ws';
  private ws: WebSocket | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Attempt background probe for local daemon on startup
    this.probeDaemon();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getStatus(): TransportStatus {
    return { ...this.status };
  }

  public setTargetMode(mode: TransportMode): void {
    if (mode === 'daemon') {
      this.probeDaemon().then((online) => {
        if (online) {
          this.status.mode = 'daemon';
          this.status.connected = true;
          this.status.endpoint = 'Local Daemon (127.0.0.1:8420)';
        } else {
          // If daemon is not running on user machine, remain in sandbox with clear notification
          this.status.mode = 'emulator';
          this.status.connected = true;
          this.status.endpoint = 'Browser Sandbox Fallback (Daemon Unreachable)';
        }
        this.notify();
      });
    } else {
      this.status.mode = 'emulator';
      this.status.connected = true;
      this.status.endpoint = 'Browser Sandbox Fallback (systemd-nspawn v256)';
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.notify();
    }
  }

  public async probeDaemon(): Promise<boolean> {
    const start = performance.now();
    try {
      // Short timeout abort controller to test if daemon port 8420 is listening
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const resp = await fetch(`${this.daemonEndpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      const latency = Math.round(performance.now() - start);
      if (resp && resp.ok) {
        this.status.latencyMs = latency;
        this.status.lastChecked = Date.now();
        return true;
      }
    } catch {
      // Daemon offline
    }

    this.status.lastChecked = Date.now();
    return false;
  }

  public async executeCommand(cmd: string): Promise<string[]> {
    if (this.status.mode === 'daemon' && this.status.connected) {
      try {
        const resp = await fetch(`${this.daemonEndpoint}/api/exec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });
        if (resp.ok) {
          const data = await resp.json();
          return data.output || [];
        }
      } catch {
        // Fall back to emulator
      }
    }
    return engineInstance.executeCommand(cmd);
  }

  public async sendMcp(req: McpRpcRequest): Promise<McpRpcResponse> {
    if (this.status.mode === 'daemon' && this.status.connected) {
      try {
        const resp = await fetch(`${this.daemonEndpoint}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        });
        if (resp.ok) {
          return await resp.json();
        }
      } catch {
        // Fall back to emulator
      }
    }
    return engineInstance.handleMcpRequest(req);
  }

  public async performLifecycle(action: string, mfaToken?: string): Promise<{ success: boolean; message: string }> {
    return engineInstance.performLifecycle(action, mfaToken);
  }

  public async reconfigureCgroups(
    params: { cpuCores?: number; memoryLimitMb?: number; cpuWeight?: number },
    mfaToken?: string
  ): Promise<{ success: boolean; message: string }> {
    return engineInstance.reconfigureCgroups(params, mfaToken);
  }

  public async createSnapshot(name: string, description: string): Promise<Snapshot> {
    return engineInstance.createSnapshot(name, description);
  }

  public async rollbackSnapshot(id: string, mfaToken?: string): Promise<{ success: boolean; message: string }> {
    return engineInstance.rollbackSnapshot(id, mfaToken);
  }

  public async toggleAirplaneMode(sealed?: boolean): Promise<{ success: boolean; sealed: boolean }> {
    return engineInstance.toggleSealedMode(sealed);
  }
}

export const transportBridge = new HybridTransportBridge();
