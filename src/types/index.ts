export type NodeStatus = 'running' | 'paused' | 'stopped' | 'rebuilding';

export interface CgroupsV2Config {
  cgroupScopePath: string; // /sys/fs/cgroup/machine.slice/machine-arch\x2dnspawn\x2d01.scope/
  cpuCores: number;
  cpuMaxQuotaUs: number; // e.g. 200000
  cpuMaxPeriodUs: number; // e.g. 100000 -> cpu.max = "200000 100000"
  cpusetCpus: string; // e.g. "0-3" physical core pinning
  cpuWeight: number; // 1 - 10000
  memoryMaxBytes: number; // in bytes
  memoryHighBytes: number; // in bytes
  memoryUsageBytes: number; // in bytes
  cgroupFreeze: 0 | 1; // 0 = running, 1 = frozen
  ioReadMbps: number;
  ioWriteMbps: number;
  ioWeight: number;
  pidsCurrent: number;
  pidsMax: number;
}

export interface NetworkConfig {
  vethHost: string; // ve-arch01
  vethContainer: string; // host0
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  rxMbps: number;
  txMbps: number;
  packetsPerSec: number;
  droppedPackets: number;
  socketQueueDepth: number;
  maxSocketQueue: number;
  activeConnections: number;
  sealedMode: boolean; // nftables drop rule active
  nftablesRule: string; // nft add rule inet archguard forward iifname "ve-arch01" drop
}

export interface ContainerNode {
  id: string;
  name: string;
  os: string;
  kernel: string;
  systemdVersion: string;
  status: NodeStatus;
  uptimeSeconds: number;
  rootFsPath: string;
  cgroups: CgroupsV2Config;
  network: NetworkConfig;
  sealedMode: boolean;
  isolationEngine: 'systemd-nspawn';
  uidMapping: string; // e.g. "PrivateUsers=655360:65536"
  securityState: {
    mfaEnforced: boolean;
    appArmorProfile: string;
    seccompFilter: string;
    capabilitiesDropped: string[];
    readOnlyRootFs: boolean;
  };
}

export interface TelemetryPoint {
  timestamp: number;
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  ioIops: number;
  rxMbps: number;
  txMbps: number;
  queueDepth: number;
  ringBufferUsagePercent: number;
  predictedCpu: number; // Holt-Winters 3-minute lookahead
  predictedMemory: number; // Holt-Winters 3-minute lookahead
  predictedQueueDepth: number;
  bottleneckRisk: 'nominal' | 'elevated' | 'critical';
  timeToBottleneckSeconds?: number;
}

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  sizeMb: number;
  sha256MetadataHash: string; // computed against btrfs send --no-data metadata stream
  parentSnapshotId: string | null;
  btrfsGeneration: number;
  description: string;
  tags: string[];
  mountPath: string; // /var/lib/machines/arch-nspawn-01/.snapshots/@snap-id
  uidMapping: string; // PrivateUsers=655360:65536
  locked: boolean;
}

export interface StorageVolume {
  id: string;
  name: string;
  mountPoint: string;
  filesystem: 'btrfs';
  totalGb: number;
  usedGb: number;
  compression: string;
  subvolumesCount: number;
  status: 'healthy' | 'scrubbing' | 'degraded';
}

export interface DaemonProcess {
  id: string;
  name: string;
  unitFile: string;
  pid: number;
  status: 'active' | 'degraded' | 'stopped';
  threads: number;
  cpuPercent: number;
  memoryMb: number;
  epollEventsPerSec: number;
  ringBufferPressure: number;
  description: string;
}

export interface AutoScalingPolicy {
  id: string;
  name: string;
  enabled: boolean;
  metric: 'cpu' | 'memory' | 'queue_depth' | 'ring_buffer';
  operator: '>' | '>=';
  threshold: number;
  durationSeconds: number;
  actionType: 'scale_cpu' | 'scale_memory' | 'tune_cgroup_weight' | 'throttle_stream';
  actionValue: number;
  mode: 'interactive' | 'strict'; // Interactive asks; strict is fully autonomous
  cooldownSeconds: number;
  lastTriggeredTimestamp?: number;
  triggerCount: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  prevHash: string; // Merkle chain pointer
  hash: string; // WebCrypto SHA-256 digest
  actor: string;
  category: 'scaling' | 'lifecycle' | 'security' | 'storage' | 'mfa' | 'build' | 'network';
  action: string;
  details: string;
  status: 'verified' | 'override' | 'blocked' | 'autonomous';
}

export interface MfaSessionToken {
  token: string;
  expiresAt: number;
  action: string;
  signature: string;
}

export interface BuildJob {
  id: string;
  name: string;
  description: string;
  script: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  startedAt?: number;
  durationMs?: number;
  exitCode?: number;
  logs: string[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
}

export interface McpRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type TransportMode = 'emulator' | 'daemon';

export interface TransportStatus {
  mode: TransportMode;
  connected: boolean;
  endpoint: string;
  latencyMs: number;
  lastChecked: number;
}
