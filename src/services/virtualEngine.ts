import {
  ContainerNode,
  TelemetryPoint,
  Snapshot,
  StorageVolume,
  DaemonProcess,
  AutoScalingPolicy,
  AuditLogEntry,
  BuildJob,
  McpTool,
  McpResource,
  McpRpcRequest,
  McpRpcResponse,
} from '../types';
import { CircularTelemetryBuffer } from './indexedDbTsdb';
import {
  computeAuditEntryHash,
  computeSha256,
  GENESIS_PREV_HASH,
  verifyMfaToken,
} from './merkleAudit';

export const INITIAL_CGROUP_PATH =
  '/sys/fs/cgroup/machine.slice/machine-arch\\x2dnspawn\\x2d01.scope/';

export const INITIAL_NODE: ContainerNode = {
  id: 'arch-nspawn-01',
  name: 'arch-nspawn-core',
  os: 'Arch Linux (rolling-release 2026.10)',
  kernel: 'Linux 6.12.9-arch1-1-nspawn (x86_64)',
  systemdVersion: 'systemd 256.7-1-arch',
  status: 'running',
  uptimeSeconds: 14280,
  rootFsPath: '/var/lib/machines/arch-nspawn-01',
  uidMapping: 'PrivateUsers=655360:65536',
  cgroups: {
    cgroupScopePath: INITIAL_CGROUP_PATH,
    cpuCores: 4,
    cpuMaxQuotaUs: 400000,
    cpuMaxPeriodUs: 100000,
    cpusetCpus: '0-3',
    cpuWeight: 100,
    memoryMaxBytes: 8589934592, // 8 GB
    memoryHighBytes: 7301444403, // 85% threshold
    memoryUsageBytes: 3575644160, // ~3.33 GB
    cgroupFreeze: 0,
    ioReadMbps: 18.4,
    ioWriteMbps: 12.1,
    ioWeight: 100,
    pidsCurrent: 46,
    pidsMax: 1024,
  },
  network: {
    vethHost: 've-arch01',
    vethContainer: 'host0',
    ipAddress: '10.244.0.2',
    subnetMask: '255.255.255.0',
    gateway: '10.244.0.1',
    rxMbps: 142.6,
    txMbps: 88.3,
    packetsPerSec: 24500,
    droppedPackets: 0,
    socketQueueDepth: 1840,
    maxSocketQueue: 32768,
    activeConnections: 640,
    sealedMode: false,
    nftablesRule: 'nft add rule inet archguard forward iifname "ve-arch01" drop',
  },
  sealedMode: false,
  isolationEngine: 'systemd-nspawn',
  securityState: {
    mfaEnforced: true,
    appArmorProfile: 'archguard-container-strict',
    seccompFilter: 'systemd-nspawn-default+bpf-ring',
    capabilitiesDropped: ['CAP_SYS_ADMIN', 'CAP_SYS_MODULE', 'CAP_SYS_RAWIO', 'CAP_MKNOD'],
    readOnlyRootFs: false,
  },
};

export const INITIAL_DAEMONS: DaemonProcess[] = [
  {
    id: 'daemon-epoll',
    name: 'epoll-stream-worker',
    unitFile: 'epoll-stream.service',
    pid: 1042,
    status: 'active',
    threads: 16,
    cpuPercent: 32.4,
    memoryMb: 1120,
    epollEventsPerSec: 184000,
    ringBufferPressure: 28,
    description: 'High-throughput async event loop dispatching zero-copy socket streams',
  },
  {
    id: 'daemon-wireguard',
    name: 'wireguard-tun-router',
    unitFile: 'wg-quick@wg0.service',
    pid: 1088,
    status: 'active',
    threads: 8,
    cpuPercent: 18.2,
    memoryMb: 420,
    epollEventsPerSec: 62000,
    ringBufferPressure: 15,
    description: 'Encrypted mesh tunnel daemon handling container-to-container routing',
  },
  {
    id: 'daemon-ringbuffer',
    name: 'high-load-ring-buffer',
    unitFile: 'ring-buffer-collector.service',
    pid: 1124,
    status: 'active',
    threads: 12,
    cpuPercent: 22.8,
    memoryMb: 890,
    epollEventsPerSec: 94000,
    ringBufferPressure: 38,
    description: 'Lock-free circular memory queue buffering packet payloads for persistence',
  },
  {
    id: 'daemon-tsdb-agent',
    name: 'tsdb-telemetry-probe',
    unitFile: 'tsdb-probe.service',
    pid: 1190,
    status: 'active',
    threads: 4,
    cpuPercent: 4.1,
    memoryMb: 180,
    epollEventsPerSec: 12000,
    ringBufferPressure: 8,
    description: 'In-kernel eBPF socket and cgroups v2 metrics scraper publishing to local TSDB',
  },
];

export const INITIAL_STORAGE: StorageVolume[] = [
  {
    id: 'vol-root',
    name: 'arch-rootfs-subvol',
    mountPoint: '/var/lib/machines/arch-nspawn-01',
    filesystem: 'btrfs',
    totalGb: 120,
    usedGb: 28.4,
    compression: 'zstd:3',
    subvolumesCount: 6,
    status: 'healthy',
  },
  {
    id: 'vol-data',
    name: 'arch-persistent-data',
    mountPoint: '/var/lib/machines/arch-nspawn-01/mnt/persistent',
    filesystem: 'btrfs',
    totalGb: 500,
    usedGb: 142.8,
    compression: 'zstd:3',
    subvolumesCount: 14,
    status: 'healthy',
  },
];

export const INITIAL_SNAPSHOTS: Snapshot[] = [
  {
    id: 'snap-001',
    name: 'gold-master-clean',
    timestamp: Date.now() - 86400000 * 2,
    sizeMb: 4120,
    sha256MetadataHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    parentSnapshotId: null,
    btrfsGeneration: 104,
    description: 'Baseline minimal Arch Linux rootfs with systemd 256 and base-devel installed',
    tags: ['baseline', 'verified', 'production'],
    mountPath: '/var/lib/machines/arch-nspawn-01/.snapshots/@gold-master-clean',
    uidMapping: 'PrivateUsers=655360:65536',
    locked: true,
  },
  {
    id: 'snap-002',
    name: 'pre-network-stress-test',
    timestamp: Date.now() - 3600000 * 4,
    sizeMb: 5240,
    sha256MetadataHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    parentSnapshotId: 'snap-001',
    btrfsGeneration: 142,
    description: 'Pre-flight checkpoint before injecting high-throughput epoll streaming daemons',
    tags: ['checkpoint', 'testing'],
    mountPath: '/var/lib/machines/arch-nspawn-01/.snapshots/@pre-network-stress-test',
    uidMapping: 'PrivateUsers=655360:65536',
    locked: false,
  },
  {
    id: 'snap-003',
    name: 'wireguard-mesh-configured',
    timestamp: Date.now() - 1800000,
    sizeMb: 5410,
    sha256MetadataHash: 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9',
    parentSnapshotId: 'snap-002',
    btrfsGeneration: 168,
    description: 'Kernel networking crypto modules and WireGuard interface keys validated',
    tags: ['network', 'checkpoint'],
    mountPath: '/var/lib/machines/arch-nspawn-01/.snapshots/@wireguard-mesh-configured',
    uidMapping: 'PrivateUsers=655360:65536',
    locked: false,
  },
];

export const INITIAL_POLICIES: AutoScalingPolicy[] = [
  {
    id: 'policy-cpu-burst',
    name: 'CPU Quota Saturation Guard',
    enabled: true,
    metric: 'cpu',
    operator: '>=',
    threshold: 85,
    durationSeconds: 8,
    actionType: 'scale_cpu',
    actionValue: 2,
    mode: 'interactive',
    cooldownSeconds: 60,
    triggerCount: 3,
  },
  {
    id: 'policy-memory-headroom',
    name: 'OOM Prevention Buffer',
    enabled: true,
    metric: 'memory',
    operator: '>=',
    threshold: 80,
    durationSeconds: 10,
    actionType: 'scale_memory',
    actionValue: 2048,
    mode: 'strict',
    cooldownSeconds: 90,
    triggerCount: 1,
  },
  {
    id: 'policy-queue-spill',
    name: 'Network Socket Overflow Mitigation',
    enabled: true,
    metric: 'queue_depth',
    operator: '>=',
    threshold: 12000,
    durationSeconds: 6,
    actionType: 'tune_cgroup_weight',
    actionValue: 250,
    mode: 'strict',
    cooldownSeconds: 45,
    triggerCount: 5,
  },
  {
    id: 'policy-ring-buffer',
    name: 'Ring Buffer Backpressure Throttle',
    enabled: true,
    metric: 'ring_buffer',
    operator: '>=',
    threshold: 75,
    durationSeconds: 5,
    actionType: 'throttle_stream',
    actionValue: 25,
    mode: 'interactive',
    cooldownSeconds: 30,
    triggerCount: 0,
  },
];

export const PRELOADED_BUILDS: BuildJob[] = [
  {
    id: 'build-epoll-bench',
    name: 'epoll-network-stress-benchmark.sh',
    description: 'Compiles and executes low-level epoll asynchronous socket stress test (500k frames/sec target)',
    script: `#!/usr/bin/env bash
set -euo pipefail
echo "[arch-ci] Initializing Arch Linux GCC 14 toolchain inside cgroup..."
gcc -O3 -march=native -pthread src/epoll_bench.c -o /usr/local/bin/epoll-bench
echo "[arch-ci] Toolchain build successful. Binding to host0 (10.244.0.2)..."
echo "[arch-ci] Pinning 16 worker threads to cpuset.cpus (0-3)..."
/usr/local/bin/epoll-bench --clients 10000 --duration 15s --ring-buffer-kb 65536
echo "[arch-ci] Benchmark complete: 482,910 events/sec, 0 packet loss, mean latency 18.2us"
`,
    status: 'idle',
    logs: [],
  },
  {
    id: 'build-cgroups-verify',
    name: 'verify-cgroups-v2-isolation.sh',
    description: 'Audits namespace barriers, memory.max enforcement, and static UID 655360 mapping',
    script: `#!/usr/bin/env bash
set -euo pipefail
echo "[audit] Probing /sys/fs/cgroup/machine.slice/machine-arch\\x2dnspawn\\x2d01.scope/..."
test -f /sys/fs/cgroup/cgroup.controllers && echo "[OK] cgroups v2 unified tree active"
echo "[audit] Verifying static UID mapping: PrivateUsers=655360:65536..."
grep -q "655360" /proc/self/uid_map && echo "[OK] Pinned UID mapping active (btrfs safe)"
echo "[audit] Inspecting dropped Linux kernel capabilities..."
capsh --print | grep -q "cap_sys_admin" || echo "[OK] CAP_SYS_ADMIN strictly stripped"
echo "[audit] Checking nftables egress rules on ve-arch01..."
nft list ruleset | grep -q "archguard" && echo "[OK] nftables isolation table loaded"
echo "[audit] Container isolation integrity verified: 100% compliant"
`,
    status: 'idle',
    logs: [],
  },
  {
    id: 'build-btrfs-migration-pack',
    name: 'package-persistent-migration.sh',
    description: 'Generates Btrfs send metadata stream and computes immutable verification manifest',
    script: `#!/usr/bin/env bash
set -euo pipefail
echo "[storage] Creating read-only Btrfs snapshot at /var/lib/machines/arch-nspawn-01/.snapshots/@migration-bundle..."
btrfs subvolume snapshot -r /var/lib/machines/arch-nspawn-01 /var/lib/machines/arch-nspawn-01/.snapshots/@migration-bundle
echo "[storage] Emitting metadata-stream: btrfs send --no-data..."
btrfs send --no-data /var/lib/machines/arch-nspawn-01/.snapshots/@migration-bundle | sha256sum > /tmp/metadata-stream.sha256
echo "[storage] Streaming Btrfs send differential chunk with zstd:3 compression..."
btrfs send /var/lib/machines/arch-nspawn-01/.snapshots/@migration-bundle | zstd -3 -o /tmp/arch-migration-bundle.tar.zst
echo "[storage] Bundle verified. Static UID 655360 permissions preserved."
`,
    status: 'idle',
    logs: [],
  },
];

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'container_lifecycle',
    description: 'Execute container lifecycle transitions (start, stop, pause, resume, reboot)',
    inputSchema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container machine ID' },
        action: { type: 'string', enum: ['start', 'stop', 'pause', 'resume', 'reboot'] },
        mfa_token: { type: 'string', description: 'Required for stop or destroy' },
      },
      required: ['container_id', 'action'],
    },
  },
  {
    name: 'cgroup_reconfigure',
    description: 'Dynamically reconfigure cgroups v2 limits inside machine-arch\\x2dnspawn\\x2d01.scope',
    inputSchema: {
      type: 'object',
      properties: {
        container_id: { type: 'string' },
        cpu_cores: { type: 'number', minimum: 1, maximum: 64 },
        memory_mb: { type: 'number', minimum: 1024, maximum: 131072 },
        cpu_weight: { type: 'number', minimum: 1, maximum: 10000 },
        cpuset_cpus: { type: 'string' },
      },
      required: ['container_id'],
    },
  },
  {
    name: 'snapshot_create',
    description: 'Create instantaneous Btrfs COW subvolume snapshot and compute metadata stream SHA-256',
    inputSchema: {
      type: 'object',
      properties: {
        container_id: { type: 'string' },
        snapshot_name: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['container_id', 'snapshot_name'],
    },
  },
  {
    name: 'snapshot_rollback',
    description: 'Rollback persistent rootfs volume to previous snapshot state (requires valid MFA session signature)',
    inputSchema: {
      type: 'object',
      properties: {
        snapshot_id: { type: 'string' },
        mfa_token: { type: 'string', description: 'Cryptographic MFA session signature' },
      },
      required: ['snapshot_id', 'mfa_token'],
    },
  },
  {
    name: 'set_traffic_pressure',
    description: 'Simulate high-throughput socket payload generation into the network namespace',
    inputSchema: {
      type: 'object',
      properties: {
        packets_per_sec: { type: 'number', minimum: 1000, maximum: 1000000 },
        simulate_drop: { type: 'boolean' },
      },
      required: ['packets_per_sec'],
    },
  },
  {
    name: 'set_airplane_mode',
    description: 'Toggle nftables forward drop rule on ve-arch01 to isolate external traffic while keeping telemetry active',
    inputSchema: {
      type: 'object',
      properties: {
        sealed: { type: 'boolean' },
      },
      required: ['sealed'],
    },
  },
];

export const MCP_RESOURCES: McpResource[] = [
  {
    uri: 'container://arch-node-01/telemetry/tsdb',
    name: 'Real-Time TSDB Metric Feed',
    mimeType: 'application/json',
    description: 'High-frequency time-series database feed from circular ring buffer with 1-second resolution',
  },
  {
    uri: 'container://arch-node-01/cgroups/v2',
    name: 'cgroups v2 Control Knobs',
    mimeType: 'application/json',
    description: 'Kernel cgroups v2 limits at /sys/fs/cgroup/machine.slice/machine-arch\\x2dnspawn\\x2d01.scope/',
  },
  {
    uri: 'container://arch-node-01/journal',
    name: 'systemd Journal Log Stream',
    mimeType: 'text/plain',
    description: 'Arch Linux systemd journal logs filtered for active daemons and PrivateUsers 655360',
  },
  {
    uri: 'container://arch-node-01/audit-ledger',
    name: 'Cryptographic Merkle Audit Ledger',
    mimeType: 'application/json',
    description: 'Tamper-evident Merkle hash chain recording all scaling, MFA, and lifecycle decisions',
  },
];

export class VirtualEngine {
  private node: ContainerNode;
  private daemons: DaemonProcess[];
  private storage: StorageVolume[];
  private snapshots: Snapshot[];
  private policies: AutoScalingPolicy[];
  private auditLogs: AuditLogEntry[] = [];
  private builds: BuildJob[];
  private ringBuffer: CircularTelemetryBuffer;
  private trafficPressure = 24500;
  private listeners: Set<() => void> = new Set();
  private pendingScaleAction: {
    policy: AutoScalingPolicy;
    targetAction: string;
    countdown: number;
    timerId?: ReturnType<typeof setInterval>;
  } | null = null;

  // Deterministic Holt-Winters Double Exponential Smoothing State (O(1) execution per tick)
  // Parameters: alpha = 0.4, beta = 0.2
  private readonly HW_ALPHA = 0.4;
  private readonly HW_BETA = 0.2;
  private hwLevelCpu = 35.0;
  private hwTrendCpu = 0.0;
  private hwLevelMem = 3410.0;
  private hwTrendMem = 0.0;
  private hwLevelQueue = 1840.0;
  private hwTrendQueue = 0.0;

  constructor() {
    this.node = { ...INITIAL_NODE, cgroups: { ...INITIAL_NODE.cgroups }, network: { ...INITIAL_NODE.network } };
    this.daemons = [...INITIAL_DAEMONS];
    this.storage = [...INITIAL_STORAGE];
    this.snapshots = [...INITIAL_SNAPSHOTS];
    this.policies = [...INITIAL_POLICIES];
    this.builds = [...PRELOADED_BUILDS];
    this.ringBuffer = new CircularTelemetryBuffer(300);

    // Initialize genesis block and baseline Merkle audit ledger
    this.initMerkleLedger();

    // Populate initial 30 points into ring buffer with deterministic Holt-Winters
    const now = Date.now();
    for (let i = 30; i >= 0; i--) {
      const t = now - i * 1000;
      const valCpu = 35 + Math.sin(i / 5) * 8 + (Math.random() * 4);
      const valMem = 3400 + (30 - i) * 5;
      const valQueue = 1800 + Math.sin(i / 4) * 400;

      // Update Holt-Winters in O(1)
      const prevLevelCpu = this.hwLevelCpu;
      this.hwLevelCpu = this.HW_ALPHA * valCpu + (1 - this.HW_ALPHA) * (this.hwLevelCpu + this.hwTrendCpu);
      this.hwTrendCpu = this.HW_BETA * (this.hwLevelCpu - prevLevelCpu) + (1 - this.HW_BETA) * this.hwTrendCpu;

      const prevLevelMem = this.hwLevelMem;
      this.hwLevelMem = this.HW_ALPHA * valMem + (1 - this.HW_ALPHA) * (this.hwLevelMem + this.hwTrendMem);
      this.hwTrendMem = this.HW_BETA * (this.hwLevelMem - prevLevelMem) + (1 - this.HW_BETA) * this.hwTrendMem;

      // 3-minute lookahead horizon (m = 18 projected steps)
      const predCpu = Math.min(100, Math.max(5, Math.round((this.hwLevelCpu + 18 * this.hwTrendCpu) * 10) / 10));
      const predMem = Math.min(8192, Math.max(1024, Math.round(this.hwLevelMem + 18 * this.hwTrendMem)));

      this.ringBuffer.push({
        timestamp: t,
        cpuPercent: Math.round(valCpu * 10) / 10,
        memoryUsedMb: Math.round(valMem),
        memoryTotalMb: Math.round(this.node.cgroups.memoryMaxBytes / (1024 * 1024)),
        ioIops: Math.round(450 + Math.random() * 80),
        rxMbps: Math.round(140 + Math.sin(i / 4) * 20),
        txMbps: Math.round(85 + Math.cos(i / 4) * 10),
        queueDepth: Math.round(valQueue),
        ringBufferUsagePercent: 28,
        predictedCpu: predCpu,
        predictedMemory: predMem,
        predictedQueueDepth: Math.round(valQueue + 120),
        bottleneckRisk: 'nominal',
      });
    }

    // High-resolution 1-second telemetry loop (free of heavy ARIMA/array copies)
    setInterval(() => this.tick(), 1000);
  }

  private async initMerkleLedger() {
    const genesisTime = Date.now() - 7200000;
    const genesisHash = await computeAuditEntryHash(
      GENESIS_PREV_HASH,
      genesisTime,
      'system:nspawn-core',
      'GENESIS_NODE_PROVISIONED',
      'Arch Linux container initialized at /sys/fs/cgroup/machine.slice/machine-arch\\x2dnspawn\\x2d01.scope/ with PrivateUsers=655360:65536'
    );

    const genesisEntry: AuditLogEntry = {
      id: 'audit-gen-001',
      timestamp: genesisTime,
      prevHash: GENESIS_PREV_HASH,
      hash: genesisHash,
      actor: 'system:nspawn-core',
      category: 'lifecycle',
      action: 'GENESIS_NODE_PROVISIONED',
      details:
        'Arch Linux container initialized at /sys/fs/cgroup/machine.slice/machine-arch\\x2dnspawn\\x2d01.scope/ with PrivateUsers=655360:65536',
      status: 'verified',
    };

    const entry2Time = Date.now() - 5400000;
    const entry2Hash = await computeAuditEntryHash(
      genesisHash,
      entry2Time,
      'system:mfa-gateway',
      'MFA_GATEWAY_TOKEN_ISSUED',
      'Operator lordlobrau@gmail.com authenticated via hardware TOTP'
    );
    const entry2: AuditLogEntry = {
      id: 'audit-002',
      timestamp: entry2Time,
      prevHash: genesisHash,
      hash: entry2Hash,
      actor: 'system:mfa-gateway',
      category: 'mfa',
      action: 'MFA_GATEWAY_TOKEN_ISSUED',
      details: 'Operator lordlobrau@gmail.com authenticated via hardware TOTP',
      status: 'verified',
    };

    const entry3Time = Date.now() - 3600000;
    const entry3Hash = await computeAuditEntryHash(
      entry2Hash,
      entry3Time,
      'autonomous:predictive-engine',
      'AUTONOMOUS_SCALE_CGROUP',
      'IF network queue > 12000 FOR 6s -> cpu.weight adjusted 100 -> 250 in machine-arch\\x2dnspawn\\x2d01.scope'
    );
    const entry3: AuditLogEntry = {
      id: 'audit-003',
      timestamp: entry3Time,
      prevHash: entry2Hash,
      hash: entry3Hash,
      actor: 'autonomous:predictive-engine',
      category: 'scaling',
      action: 'AUTONOMOUS_SCALE_CGROUP',
      details:
        'IF network queue > 12000 FOR 6s -> cpu.weight adjusted 100 -> 250 in machine-arch\\x2dnspawn\\x2d01.scope',
      status: 'autonomous',
    };

    this.auditLogs = [entry3, entry2, genesisEntry];
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getNode(): ContainerNode {
    return {
      ...this.node,
      cgroups: { ...this.node.cgroups },
      network: { ...this.node.network },
      securityState: { ...this.node.securityState, capabilitiesDropped: [...this.node.securityState.capabilitiesDropped] },
    };
  }

  public getDaemons(): DaemonProcess[] {
    return this.daemons.map((d) => ({ ...d }));
  }

  public getStorage(): StorageVolume[] {
    return this.storage.map((s) => ({ ...s }));
  }

  public getSnapshots(): Snapshot[] {
    return this.snapshots.map((s) => ({ ...s }));
  }

  public getPolicies(): AutoScalingPolicy[] {
    return this.policies.map((p) => ({ ...p }));
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  public getBuilds(): BuildJob[] {
    return this.builds.map((b) => ({ ...b }));
  }

  public getTelemetry(points = 60): TelemetryPoint[] {
    return this.ringBuffer.getLatest(points);
  }

  public getTrafficPressure(): number {
    return this.trafficPressure;
  }

  public getPendingScaleAction() {
    return this.pendingScaleAction;
  }

  public setTrafficPressure(packetsPerSec: number) {
    this.trafficPressure = Math.max(1000, Math.min(600000, packetsPerSec));
    this.notify();
  }

  // nftables Sealed / Airplane Mode Toggle
  public toggleSealedMode(sealed?: boolean): { success: boolean; sealed: boolean } {
    const newState = sealed !== undefined ? sealed : !this.node.sealedMode;
    this.node.sealedMode = newState;
    this.node.network.sealedMode = newState;

    if (newState) {
      this.node.network.nftablesRule = 'nft add rule inet archguard forward iifname "ve-arch01" drop';
      this.recordAudit(
        'operator@archguard.internal',
        'network',
        'NFTABLES_EGRESS_DROPPED',
        'Applied nftables rule: nft add rule inet archguard forward iifname "ve-arch01" drop. Container sealed.',
        'verified'
      );
    } else {
      this.node.network.nftablesRule = '# nftables egress forward drop rule flushed';
      this.recordAudit(
        'operator@archguard.internal',
        'network',
        'NFTABLES_EGRESS_RESTORED',
        'Flushed nftables drop rule on ve-arch01. Container network routes restored.',
        'verified'
      );
    }
    this.notify();
    return { success: true, sealed: newState };
  }

  // Gated Lifecycle Controller (enforces MFA on destructive actions)
  public async performLifecycle(
    action: string,
    mfaToken?: string
  ): Promise<{ success: boolean; message: string }> {
    if (action === 'start') {
      this.node.status = 'running';
      this.node.cgroups.cgroupFreeze = 0;
      await this.recordAudit(
        'operator@archguard.internal',
        'lifecycle',
        'SYSTEMD_NSPAWN_START',
        'systemd-nspawn booted arch-nspawn-01 using static PrivateUsers=655360:65536',
        'verified'
      );
      this.notify();
      return { success: true, message: 'Container arch-nspawn-01 started.' };
    }

    if (action === 'pause' || action === 'freeze') {
      const isFrozen = this.node.cgroups.cgroupFreeze === 1;
      this.node.cgroups.cgroupFreeze = isFrozen ? 0 : 1;
      this.node.status = isFrozen ? 'running' : 'paused';
      await this.recordAudit(
        'operator@archguard.internal',
        'lifecycle',
        isFrozen ? 'CGROUP_UNFREEZE' : 'CGROUP_FREEZE',
        `echo ${this.node.cgroups.cgroupFreeze} > /sys/fs/cgroup/machine.slice/machine-arch\\x2dnspawn\\x2d01.scope/cgroup.freeze`,
        'verified'
      );
      this.notify();
      return {
        success: true,
        message: isFrozen ? 'cgroup.freeze set to 0 (resumed).' : 'cgroup.freeze set to 1 (frozen).',
      };
    }

    if (action === 'reboot') {
      this.node.status = 'rebuilding';
      await this.recordAudit(
        'operator@archguard.internal',
        'lifecycle',
        'SYSTEMD_NSPAWN_REBOOT',
        'Warm container reboot requested via SIGRTMIN+4 inside private UTS/PID namespaces',
        'verified'
      );
      this.notify();
      setTimeout(() => {
        this.node.status = 'running';
        this.node.uptimeSeconds = 0;
        this.recordAudit(
          'system:systemd-nspawn',
          'lifecycle',
          'BOOT_COMPLETE',
          'multi-user.target reached. Pinned UID 655360 verified.',
          'verified'
        );
        this.notify();
      }, 1500);
      return { success: true, message: 'Reboot initiated.' };
    }

    // Destructive actions: require valid MFA session token
    if (action === 'stop' || action === 'destroy') {
      const auth = verifyMfaToken(mfaToken || '', 'lifecycle_destroy');
      if (!auth.valid) {
        await this.recordAudit(
          'operator@archguard.internal',
          'security',
          'MFA_VERIFICATION_REJECTED',
          `Unauthorized attempt to ${action} container: ${auth.reason}`,
          'blocked'
        );
        this.notify();
        return { success: false, message: auth.reason || 'MFA validation failed.' };
      }

      this.node.status = 'stopped';
      await this.recordAudit(
        'operator@archguard.internal',
        'lifecycle',
        action === 'destroy' ? 'CONTAINER_DESTROY' : 'SYSTEMD_NSPAWN_STOP',
        `MFA token verified. Action ${action} executed on /var/lib/machines/arch-nspawn-01`,
        'verified'
      );
      this.notify();
      return { success: true, message: `Container ${action} executed.` };
    }

    return { success: false, message: `Unknown action: ${action}` };
  }

  // cgroups v2 dynamic limits reconfiguration
  public async reconfigureCgroups(
    params: { cpuCores?: number; memoryLimitMb?: number; cpuWeight?: number; cpusetCpus?: string },
    mfaToken?: string
  ): Promise<{ success: boolean; message: string }> {
    const oldCores = this.node.cgroups.cpuCores;
    const oldMem = Math.round(this.node.cgroups.memoryMaxBytes / (1024 * 1024));

    if (params.cpuCores) {
      this.node.cgroups.cpuCores = Math.max(1, Math.min(32, params.cpuCores));
      this.node.cgroups.cpuMaxQuotaUs = this.node.cgroups.cpuCores * 100000;
      this.node.cgroups.cpusetCpus = `0-${this.node.cgroups.cpuCores - 1}`;
    }
    if (params.cpusetCpus) {
      this.node.cgroups.cpusetCpus = params.cpusetCpus;
    }
    if (params.memoryLimitMb) {
      this.node.cgroups.memoryMaxBytes = params.memoryLimitMb * 1024 * 1024;
      this.node.cgroups.memoryHighBytes = Math.round(this.node.cgroups.memoryMaxBytes * 0.85);
    }
    if (params.cpuWeight) {
      this.node.cgroups.cpuWeight = Math.max(1, Math.min(10000, params.cpuWeight));
    }

    const newMem = Math.round(this.node.cgroups.memoryMaxBytes / (1024 * 1024));
    await this.recordAudit(
      'operator@archguard.internal',
      'scaling',
      'CGROUPS_V2_RECONFIGURED',
      `Updated ${this.node.cgroups.cgroupScopePath}: cpu.max="${this.node.cgroups.cpuMaxQuotaUs} 100000" (${oldCores}->${this.node.cgroups.cpuCores}c, cpuset=${this.node.cgroups.cpusetCpus}), memory.max=${this.node.cgroups.memoryMaxBytes} (${oldMem}MB->${newMem}MB), cpu.weight=${this.node.cgroups.cpuWeight}`,
      'verified'
    );
    this.notify();
    return { success: true, message: 'cgroups v2 limits updated.' };
  }

  // Btrfs metadata stream hashing for snapshot creation
  public async createSnapshot(name: string, description: string): Promise<Snapshot> {
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || `snap-${Date.now()}`;
    const id = `snap-${Date.now().toString(36)}`;

    // Instantaneous metadata hash computed against btrfs send --no-data stream header
    const metadataStreamHeader = `BTRFS_SEND_STREAM_V2|GEN:${170 + this.snapshots.length * 4}|UID:655360:65536|UUID:${id}|NAME:${cleanName}`;
    const sha256MetadataHash = await computeSha256(metadataStreamHeader);

    const snap: Snapshot = {
      id,
      name: cleanName,
      timestamp: Date.now(),
      sizeMb: Math.round(this.node.cgroups.memoryUsageBytes / (1024 * 1024) * 1.25),
      sha256MetadataHash,
      parentSnapshotId: this.snapshots[0]?.id || null,
      btrfsGeneration: 170 + this.snapshots.length * 4,
      description: description || 'Instantaneous Btrfs copy-on-write subvolume snapshot',
      tags: ['btrfs-cow', 'uid-655360'],
      mountPath: `/var/lib/machines/arch-nspawn-01/.snapshots/@${cleanName}`,
      uidMapping: 'PrivateUsers=655360:65536',
      locked: false,
    };

    this.snapshots.unshift(snap);
    await this.recordAudit(
      'operator@archguard.internal',
      'storage',
      'BTRFS_SUBVOLUME_SNAPSHOT',
      `Created subvolume ${snap.mountPath} (btrfs send --no-data metadata sha256: ${sha256MetadataHash.slice(0, 16)}..., PrivateUsers=655360:65536)`,
      'verified'
    );
    this.notify();
    return snap;
  }

  // Gated Rollback with MFA session token validation
  public async rollbackSnapshot(
    snapshotId: string,
    mfaToken?: string
  ): Promise<{ success: boolean; message: string }> {
    const snap = this.snapshots.find((s) => s.id === snapshotId);
    if (!snap) {
      return { success: false, message: `Snapshot not found: ${snapshotId}` };
    }

    const auth = verifyMfaToken(mfaToken || '', 'snapshot_rollback');
    if (!auth.valid) {
      await this.recordAudit(
        'operator@archguard.internal',
        'security',
        'MFA_VERIFICATION_REJECTED',
        `Rollback to ${snap.name} blocked: ${auth.reason}`,
        'blocked'
      );
      this.notify();
      return { success: false, message: auth.reason || 'MFA validation failed.' };
    }

    this.node.status = 'rebuilding';
    await this.recordAudit(
      'operator@archguard.internal',
      'storage',
      'BTRFS_SNAPSHOT_ROLLBACK_INIT',
      `Verified MFA token. Initiating atomic rollback to ${snap.mountPath} (Metadata hash: ${snap.sha256MetadataHash.slice(0, 16)}...)`,
      'verified'
    );
    this.notify();

    setTimeout(() => {
      this.node.status = 'running';
      this.recordAudit(
        'system:btrfs-engine',
        'storage',
        'BTRFS_SNAPSHOT_ROLLBACK_COMPLETE',
        `Subvolume remounted at /var/lib/machines/arch-nspawn-01. Static UID 655360 intact.`,
        'verified'
      );
      this.notify();
    }, 1500);

    return { success: true, message: `Rollback to ${snap.name} completed successfully.` };
  }

  public deleteSnapshot(snapshotId: string): boolean {
    const snap = this.snapshots.find((s) => s.id === snapshotId);
    if (!snap || snap.locked) return false;

    this.snapshots = this.snapshots.filter((s) => s.id !== snapshotId);
    this.recordAudit(
      'operator@archguard.internal',
      'storage',
      'BTRFS_SNAPSHOT_DELETE',
      `Deleted snapshot ${snap.name} [Generation ${snap.btrfsGeneration}]`,
      'verified'
    );
    this.notify();
    return true;
  }

  public updatePolicy(updated: AutoScalingPolicy, mfaToken?: string): { success: boolean; message: string } {
    if (updated.mode === 'interactive') {
      const prev = this.policies.find((p) => p.id === updated.id);
      if (prev && prev.mode === 'strict') {
        const auth = verifyMfaToken(mfaToken || '', 'policy_modify');
        if (!auth.valid) {
          return { success: false, message: `Disabling strict autonomous mode requires MFA signature: ${auth.reason}` };
        }
      }
    }

    this.policies = this.policies.map((p) => (p.id === updated.id ? { ...updated } : p));
    this.recordAudit(
      'operator@archguard.internal',
      'scaling',
      'POLICY_DEFINITION_UPDATE',
      `Updated auto-scaling if-statement rule: ${updated.name} (Mode: ${updated.mode}, Threshold: ${updated.threshold})`,
      'verified'
    );
    this.notify();
    return { success: true, message: 'Policy updated.' };
  }

  public addPolicy(newPolicy: Omit<AutoScalingPolicy, 'id' | 'triggerCount'>) {
    const policy: AutoScalingPolicy = {
      ...newPolicy,
      id: `policy-${Date.now().toString(36)}`,
      triggerCount: 0,
    };
    this.policies.push(policy);
    this.recordAudit(
      'operator@archguard.internal',
      'scaling',
      'POLICY_CREATED',
      `Added conditional auto-scaling policy: ${policy.name}`,
      'verified'
    );
    this.notify();
  }

  public deletePolicy(id: string) {
    const p = this.policies.find((item) => item.id === id);
    if (!p) return;
    this.policies = this.policies.filter((item) => item.id !== id);
    this.recordAudit(
      'operator@archguard.internal',
      'scaling',
      'POLICY_REMOVED',
      `Removed policy: ${p.name}`,
      'verified'
    );
    this.notify();
  }

  public applyPendingScaleAction(approved: boolean) {
    if (!this.pendingScaleAction) return;
    const { policy } = this.pendingScaleAction;
    if (this.pendingScaleAction.timerId) {
      clearInterval(this.pendingScaleAction.timerId);
    }

    if (approved) {
      this.executeScalingAction(policy, 'OPERATOR_OVERRIDE_APPROVED');
    } else {
      this.recordAudit(
        'operator@archguard.internal',
        'scaling',
        'SCALING_PROPOSAL_DISMISSED',
        `Operator dismissed proposed scaling action for policy: ${policy.name}`,
        'override'
      );
    }
    this.pendingScaleAction = null;
    this.notify();
  }

  private executeScalingAction(policy: AutoScalingPolicy, triggerSource: string) {
    policy.triggerCount++;
    policy.lastTriggeredTimestamp = Date.now();

    if (policy.actionType === 'scale_cpu') {
      const prev = this.node.cgroups.cpuCores;
      this.node.cgroups.cpuCores = Math.min(32, this.node.cgroups.cpuCores + policy.actionValue);
      this.node.cgroups.cpuMaxQuotaUs = this.node.cgroups.cpuCores * 100000;
      this.node.cgroups.cpusetCpus = `0-${this.node.cgroups.cpuCores - 1}`;
      this.recordAudit(
        triggerSource,
        'scaling',
        'AUTONOMOUS_SCALE_CPU',
        `Policy ${policy.name}: cpu.max increased from ${prev}c to ${this.node.cgroups.cpuCores}c (quota: ${this.node.cgroups.cpuMaxQuotaUs}us)`,
        policy.mode === 'strict' ? 'autonomous' : 'override'
      );
    } else if (policy.actionType === 'scale_memory') {
      const prevMb = Math.round(this.node.cgroups.memoryMaxBytes / (1024 * 1024));
      const newMb = Math.min(65536, prevMb + policy.actionValue);
      this.node.cgroups.memoryMaxBytes = newMb * 1024 * 1024;
      this.node.cgroups.memoryHighBytes = Math.round(this.node.cgroups.memoryMaxBytes * 0.85);
      this.recordAudit(
        triggerSource,
        'scaling',
        'AUTONOMOUS_SCALE_MEMORY',
        `Policy ${policy.name}: memory.max scaled from ${prevMb}MB to ${newMb}MB`,
        policy.mode === 'strict' ? 'autonomous' : 'override'
      );
    } else if (policy.actionType === 'tune_cgroup_weight') {
      const prev = this.node.cgroups.cpuWeight;
      this.node.cgroups.cpuWeight = Math.min(10000, this.node.cgroups.cpuWeight + policy.actionValue);
      this.recordAudit(
        triggerSource,
        'scaling',
        'AUTONOMOUS_TUNE_WEIGHT',
        `Policy ${policy.name}: cpu.weight adjusted from ${prev} to ${this.node.cgroups.cpuWeight}`,
        policy.mode === 'strict' ? 'autonomous' : 'override'
      );
    } else if (policy.actionType === 'throttle_stream') {
      const prev = this.trafficPressure;
      this.trafficPressure = Math.max(10000, Math.round(this.trafficPressure * (1 - policy.actionValue / 100)));
      this.recordAudit(
        triggerSource,
        'scaling',
        'AUTONOMOUS_THROTTLE_STREAM',
        `Policy ${policy.name}: stream pressure throttled by ${policy.actionValue}% (${prev} -> ${this.trafficPressure} pkt/s)`,
        policy.mode === 'strict' ? 'autonomous' : 'override'
      );
    }
  }

  // Run build scripts inside container
  public async runBuildJob(jobId: string) {
    const job = this.builds.find((b) => b.id === jobId);
    if (!job || job.status === 'running') return;

    job.status = 'running';
    job.startedAt = Date.now();
    job.logs = [`[${new Date().toLocaleTimeString()}] Task invoked inside container namespace: ${job.name}`];
    await this.recordAudit(
      'operator@archguard.internal',
      'build',
      'BUILD_JOB_STARTED',
      `Executing build runner: ${job.name}`,
      'verified'
    );
    this.notify();

    const scriptLines = job.script.split('\n').filter((l) => l.trim() && !l.startsWith('#!'));

    for (let i = 0; i < scriptLines.length; i++) {
      await new Promise((res) => setTimeout(res, 350 + Math.random() * 200));
      const line = scriptLines[i];
      job.logs.push(`> ${line}`);
      if (line.includes('echo')) {
        const out = line.replace(/echo\s+["']?/, '').replace(/["']?$/, '');
        job.logs.push(out);
      } else if (line.includes('gcc')) {
        job.logs.push('Compiling object files: [100%] epoll_bench.o linked with -lpthread -luring');
      } else if (line.includes('btrfs send')) {
        job.logs.push('At subvol /var/lib/machines/arch-nspawn-01/.snapshots/@migration-bundle');
        job.logs.push('Metadata stream sha256 calculated. Compression ratio 2.84x');
      }
      this.notify();
    }

    job.status = 'success';
    job.durationMs = Date.now() - (job.startedAt || Date.now());
    job.exitCode = 0;
    job.logs.push(`[${new Date().toLocaleTimeString()}] Execution completed with exit code 0`);

    await this.recordAudit(
      'system:arch-builder',
      'build',
      'BUILD_JOB_SUCCESS',
      `Job ${job.name} finished successfully in ${(job.durationMs / 1000).toFixed(1)}s`,
      'verified'
    );
    this.notify();
  }

  // Standard Model Context Protocol (MCP) JSON-RPC 2.0 Handler
  public handleMcpRequest(request: McpRpcRequest): McpRpcResponse {
    const { id, method, params } = request;

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS },
      };
    }

    if (method === 'resources/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: { resources: MCP_RESOURCES },
      };
    }

    if (method === 'resources/read') {
      const uri = params?.uri as string;
      if (uri === 'container://arch-node-01/telemetry/tsdb') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            uri,
            contents: [{ text: JSON.stringify(this.getTelemetry(10)), mimeType: 'application/json' }],
          },
        };
      }
      if (uri === 'container://arch-node-01/cgroups/v2') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            uri,
            contents: [{ text: JSON.stringify(this.node.cgroups), mimeType: 'application/json' }],
          },
        };
      }
      if (uri === 'container://arch-node-01/audit-ledger') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            uri,
            contents: [{ text: JSON.stringify(this.auditLogs.slice(0, 15)), mimeType: 'application/json' }],
          },
        };
      }
      if (uri === 'container://arch-node-01/journal') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            uri,
            contents: [
              {
                text: this.daemons
                  .map((d) => `systemd[1]: Unit ${d.unitFile} active (PID ${d.pid}, PrivateUsers 655360)`)
                  .join('\n'),
                mimeType: 'text/plain',
              },
            ],
          },
        };
      }
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Resource not found: ${uri}` },
      };
    }

    if (method === 'tools/call') {
      const name = params?.name as string;
      const args = (params?.arguments || {}) as Record<string, any>;

      if (name === 'container_lifecycle') {
        const action = args.action;
        const mfa = args.mfa_token;
        this.performLifecycle(action, mfa);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: `Dispatched lifecycle action '${action}'.` }] },
        };
      }

      if (name === 'cgroup_reconfigure') {
        this.reconfigureCgroups({
          cpuCores: args.cpu_cores,
          memoryLimitMb: args.memory_mb,
          cpuWeight: args.cpu_weight,
          cpusetCpus: args.cpuset_cpus,
        });
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: 'cgroups v2 limits updated.' }] },
        };
      }

      if (name === 'snapshot_create') {
        this.createSnapshot(args.snapshot_name || 'mcp-snapshot', args.description || 'Created via MCP tool call');
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: 'Snapshot created and metadata hash generated.' }] },
        };
      }

      if (name === 'snapshot_rollback') {
        this.rollbackSnapshot(args.snapshot_id, args.mfa_token);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: 'Rollback scheduled with MFA validation.' }] },
        };
      }

      if (name === 'set_traffic_pressure') {
        this.setTrafficPressure(args.packets_per_sec);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: `Traffic pressure updated to ${args.packets_per_sec} pkt/s` }] },
        };
      }

      if (name === 'set_airplane_mode') {
        this.toggleSealedMode(Boolean(args.sealed));
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: `nftables forward drop set to ${args.sealed}` }] },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unknown tool: ${name}` },
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not implemented: ${method}` },
    };
  }

  // Interactive Terminal Command Parser
  public executeCommand(input: string): string[] {
    const raw = input.trim();
    if (!raw) return [];
    const parts = raw.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    if (cmd === 'help') {
      return [
        'ArchGuard systemd-nspawn Virtual Terminal v2026.10',
        'Available native commands:',
        '  archctl status | start | stop | pause | reboot | scale | snapshot | seal',
        '  machinectl list | status arch-nspawn-01 | shell',
        '  systemctl status | restart | stop <unit>',
        '  journalctl -u <unit> [-n <lines>]',
        '  ip a | ip route | ip link',
        '  nft list ruleset',
        '  btrfs subvolume list | snapshot | send',
        '  pacman -Q | pacman -Syu',
        '  mcp tools | mcp resources | mcp call <tool>',
        '  build list | build run <job-id>',
        '  cat /etc/systemd/nspawn/arch-nspawn-01.nspawn',
        '  cat /sys/fs/cgroup/machine.slice/.../cpu.max',
        '  clear | uname -a',
      ];
    }

    if (cmd === 'clear') {
      return ['__CLEAR__'];
    }

    if (cmd === 'uname' && (args.includes('-a') || args.length === 0)) {
      return [`${this.node.kernel} #1 SMP PREEMPT_DYNAMIC GNU/Linux`];
    }

    if (cmd === 'cat' && args[0]?.includes('nspawn')) {
      return [
        '# /etc/systemd/nspawn/arch-nspawn-01.nspawn',
        '[Exec]',
        'Boot=yes',
        'PrivateUsers=655360:65536',
        'Capability=all',
        'DropCapability=CAP_SYS_ADMIN CAP_SYS_MODULE CAP_SYS_RAWIO CAP_MKNOD',
        '',
        '[Network]',
        'VirtualEthernet=yes',
        'Bridge=br0',
        `Zone=archguard`,
      ];
    }

    if (cmd === 'cat' && args[0]?.includes('cgroup')) {
      const maxMemMb = Math.round(this.node.cgroups.memoryMaxBytes / (1024 * 1024));
      const curMemMb = Math.round(this.node.cgroups.memoryUsageBytes / (1024 * 1024));
      return [
        `# ${this.node.cgroups.cgroupScopePath}`,
        `cpu.max: ${this.node.cgroups.cpuMaxQuotaUs} ${this.node.cgroups.cpuMaxPeriodUs}`,
        `cpuset.cpus: ${this.node.cgroups.cpusetCpus}`,
        `cpu.weight: ${this.node.cgroups.cpuWeight}`,
        `memory.max: ${this.node.cgroups.memoryMaxBytes} (${maxMemMb}MB)`,
        `memory.high: ${this.node.cgroups.memoryHighBytes}`,
        `memory.current: ${this.node.cgroups.memoryUsageBytes} (${curMemMb}MB)`,
        `cgroup.freeze: ${this.node.cgroups.cgroupFreeze}`,
        `pids.current: ${this.node.cgroups.pidsCurrent}`,
        `pids.max: ${this.node.cgroups.pidsMax}`,
      ];
    }

    if (cmd === 'nft') {
      if (args[0] === 'list' && args[1] === 'ruleset') {
        return [
          'table inet archguard {',
          '    chain forward {',
          '        type filter hook forward priority filter; policy accept;',
          this.node.sealedMode
            ? '        iifname "ve-arch01" drop comment "Air-gap sealed mode active"'
            : '        iifname "ve-arch01" accept comment "Container egress allowed"',
          '    }',
          '}',
        ];
      }
      return ['Usage: nft list ruleset'];
    }

    if (cmd === 'archctl') {
      const sub = args[0];
      if (!sub || sub === 'status') {
        const memMb = Math.round(this.node.cgroups.memoryUsageBytes / (1024 * 1024));
        const limitMb = Math.round(this.node.cgroups.memoryMaxBytes / (1024 * 1024));
        return [
          `● ${this.node.name} (${this.node.id})`,
          `  State: ${this.node.status.toUpperCase()} (cgroup.freeze=${this.node.cgroups.cgroupFreeze})`,
          `  Scope: ${this.node.cgroups.cgroupScopePath}`,
          `  UID Mapping: ${this.node.uidMapping}`,
          `  cpu.max: "${this.node.cgroups.cpuMaxQuotaUs} 100000" (${this.node.cgroups.cpuCores} cores, cpuset: ${this.node.cgroups.cpusetCpus})`,
          `  memory.max: ${limitMb}MB (usage: ${memMb}MB)`,
          `  Network: ${this.node.network.ipAddress} (ve-arch01 -> host0)`,
          `  nftables: ${this.node.sealedMode ? 'DROPPED (Airplane Mode Sealed)' : 'FORWARD ACCEPT'}`,
        ];
      }
      if (sub === 'start') {
        this.performLifecycle('start');
        return ['Container started.'];
      }
      if (sub === 'stop') {
        return ['Stopping container requires MFA token in strict mode. Use UI control or pass mfa_token.'];
      }
      if (sub === 'pause') {
        this.performLifecycle('pause');
        return [`cgroup.freeze toggled to ${this.node.cgroups.cgroupFreeze}.`];
      }
      if (sub === 'seal') {
        const res = this.toggleSealedMode();
        return [`nftables rule: ${res.sealed ? 'FORWARD DROP (Sealed)' : 'FORWARD ACCEPT (Unsealed)'}`];
      }
      if (sub === 'snapshot') {
        if (args[1] === 'list') {
          return this.snapshots.map((s) => `[${s.id}] ${s.name} - ${s.sizeMb}MB (metadata: ${s.sha256MetadataHash.slice(0, 16)}...)`);
        }
        if (args[1] === 'create') {
          const name = args[2] || 'cli-snap';
          this.createSnapshot(name, 'CLI initiated snapshot');
          return [`Snapshot ${name} created.`];
        }
      }
      return [`Usage: archctl status | start | pause | seal | snapshot`];
    }

    if (cmd === 'machinectl') {
      const sub = args[0];
      if (sub === 'list') {
        return [
          'MACHINE           CLASS     SERVICE         OS         VERSION ADDRESSES',
          `arch-nspawn-01    container systemd-nspawn  archlinux  rolling ${this.node.network.ipAddress}`,
          '',
          '1 machines listed (PrivateUsers=655360:65536).',
        ];
      }
      if (sub === 'status') {
        return [
          `● arch-nspawn-01`,
          `  Since: Sun 2026-10-14 02:00:00 UTC`,
          `  Leader: 984 (systemd)`,
          `  Service: systemd-nspawn; class container`,
          `  Root: ${this.node.rootFsPath}`,
          `  UID Range: 655360..720895 (PrivateUsers static pinning)`,
          `  Unit: machine-arch\\x2dnspawn\\x2d01.scope`,
        ];
      }
      return ['Usage: machinectl list | machinectl status arch-nspawn-01'];
    }

    if (cmd === 'systemctl') {
      const sub = args[0];
      const unit = args[1] || 'epoll-stream.service';
      const daemon = this.daemons.find((d) => d.unitFile.includes(unit) || d.name.includes(unit));

      if (sub === 'status') {
        if (!daemon) return [`Unit ${unit} not found.`];
        return [
          `● ${daemon.unitFile} - ${daemon.description}`,
          `   Loaded: loaded (/etc/systemd/system/${daemon.unitFile}; enabled)`,
          `   Active: active (running) (PID ${daemon.pid})`,
          `    Tasks: ${daemon.threads} (limit: 512, cpuset: ${this.node.cgroups.cpusetCpus})`,
          `   Memory: ${daemon.memoryMb}.0M (ring buffer: ${daemon.ringBufferPressure}%)`,
          `      CPU: ${daemon.cpuPercent}% (epoll: ${daemon.epollEventsPerSec} events/s)`,
          `   CGroup: ${this.node.cgroups.cgroupScopePath}system.slice/${daemon.unitFile}`,
        ];
      }
      return [`systemctl: action ${sub} executed on ${unit}`];
    }

    if (cmd === 'journalctl') {
      return [
        `-- Journal begins at Sun 2026-10-14 02:00:00 UTC --`,
        `Oct 14 02:00:01 arch-nspawn-core systemd[1]: Started Epoll Network Stream Worker.`,
        `Oct 14 02:00:04 arch-nspawn-core epoll-stream-worker[1042]: Bound 16 async workers to host0:9000 (UID 655360)`,
        `Oct 14 02:05:12 arch-nspawn-core tsdb-probe[1190]: eBPF ringbuffer probe initialized (loss 0.0%)`,
        `Oct 14 02:18:44 arch-nspawn-core systemd-nspawn[984]: cgroups v2 controller memory.high threshold nominal`,
      ];
    }

    if (cmd === 'ip') {
      return [
        '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000',
        '    inet 127.0.0.1/8 scope host lo',
        `2: host0@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000`,
        `    inet ${this.node.network.ipAddress}/24 metric 1024 brd 10.244.0.255 scope global host0`,
        this.node.sealedMode ? '    [nftables: Egress Dropped by Rule archguard/forward]' : '',
      ].filter(Boolean);
    }

    if (cmd === 'btrfs') {
      if (args[0] === 'subvolume' && args[1] === 'list') {
        return [
          'ID 256 gen 104 top level 5 path @',
          'ID 257 gen 142 top level 5 path @home',
          'ID 258 gen 168 top level 5 path .snapshots/@wireguard-mesh-configured',
          'ID 259 gen 172 top level 5 path @persistent',
        ];
      }
      return [
        'Data, single: total=120.00GiB, used=28.40GiB',
        'System, DUP: total=32.00MiB, used=16.00KiB',
        'Metadata, DUP: total=1.00GiB, used=245.20MiB',
      ];
    }

    if (cmd === 'pacman') {
      return ['archlinux-keyring 20260912-1', 'btrfs-progs 6.11-1', 'systemd 256.7-1', 'nftables 1.1.1-1'];
    }

    if (cmd === 'mcp') {
      if (args[0] === 'tools') return MCP_TOOLS.map((t) => `* ${t.name} - ${t.description}`);
      if (args[0] === 'resources') return MCP_RESOURCES.map((r) => `* [${r.uri}] ${r.name}`);
      return ['Model Context Protocol (MCP) JSON-RPC 2.0 CLI. Usage: mcp tools | mcp resources'];
    }

    if (cmd === 'build') {
      if (args[0] === 'list') return this.builds.map((b) => `* [${b.id}] ${b.name} (${b.status})`);
      if (args[0] === 'run' && args[1]) {
        this.runBuildJob(args[1]);
        return [`Started build: ${args[1]}`];
      }
      return ['Usage: build list | build run <job-id>'];
    }

    return [`bash: ${cmd}: command not found. Type 'help' for available commands.`];
  }

  // High-performance Telemetry Tick using O(1) Holt-Winters Smoothing
  private tick() {
    if (this.node.status !== 'running') {
      return;
    }

    this.node.uptimeSeconds++;

    // Compute load from traffic pressure
    const trafficNormalized = this.trafficPressure / 100000;
    const cpuRaw = Math.min(
      98,
      Math.max(12, 16 + trafficNormalized * 14 + Math.sin(Date.now() / 3500) * 6 + (Math.random() * 4))
    );
    const cpuAdjusted = Math.round(cpuRaw * (4 / Math.max(1, this.node.cgroups.cpuCores)));

    const limitMb = Math.round(this.node.cgroups.memoryMaxBytes / (1024 * 1024));
    const memUsageBase = 3200 + trafficNormalized * 620 + Math.sin(Date.now() / 7000) * 180;
    const memAdjusted = Math.min(limitMb - 150, Math.round(memUsageBase));
    this.node.cgroups.memoryUsageBytes = memAdjusted * 1024 * 1024;

    const rx = this.node.sealedMode ? 0 : Math.round(this.trafficPressure * 0.0058);
    const tx = this.node.sealedMode ? 0 : Math.round(this.trafficPressure * 0.0036);
    this.node.network.rxMbps = rx;
    this.node.network.txMbps = tx;
    this.node.network.packetsPerSec = this.node.sealedMode ? 0 : this.trafficPressure;

    const queueRatio = this.trafficPressure / 150000;
    const socketQueue = Math.min(32768, Math.round(1200 + queueRatio * 14000 + (Math.random() * 300)));
    this.node.network.socketQueueDepth = socketQueue;

    const ringPressure = Math.min(100, Math.round(18 + trafficNormalized * 13 + (Math.random() * 4)));
    this.daemons[0].ringBufferPressure = ringPressure;
    this.daemons[0].epollEventsPerSec = Math.round(this.trafficPressure * 7.5);
    this.daemons[2].ringBufferPressure = Math.min(100, Math.round(ringPressure * 1.12));

    // Holt-Winters Double Exponential Smoothing (O(1) execution)
    // alpha = 0.4, beta = 0.2
    const prevLevelCpu = this.hwLevelCpu;
    this.hwLevelCpu = this.HW_ALPHA * cpuAdjusted + (1 - this.HW_ALPHA) * (this.hwLevelCpu + this.hwTrendCpu);
    this.hwTrendCpu = this.HW_BETA * (this.hwLevelCpu - prevLevelCpu) + (1 - this.HW_BETA) * this.hwTrendCpu;

    const prevLevelMem = this.hwLevelMem;
    this.hwLevelMem = this.HW_ALPHA * memAdjusted + (1 - this.HW_ALPHA) * (this.hwLevelMem + this.hwTrendMem);
    this.hwTrendMem = this.HW_BETA * (this.hwLevelMem - prevLevelMem) + (1 - this.HW_BETA) * this.hwTrendMem;

    const prevLevelQueue = this.hwLevelQueue;
    this.hwLevelQueue = this.HW_ALPHA * socketQueue + (1 - this.HW_ALPHA) * (this.hwLevelQueue + this.hwTrendQueue);
    this.hwTrendQueue = this.HW_BETA * (this.hwLevelQueue - prevLevelQueue) + (1 - this.HW_BETA) * this.hwTrendQueue;

    // 3-minute lookahead forecast (m = 18 scaled projection steps)
    const predictedCpu = Math.min(100, Math.max(5, Math.round((this.hwLevelCpu + 18 * this.hwTrendCpu) * 10) / 10));
    const predictedMemory = Math.min(limitMb, Math.max(1024, Math.round(this.hwLevelMem + 18 * this.hwTrendMem)));
    const predictedQueue = Math.round(this.hwLevelQueue + 18 * this.hwTrendQueue);

    let bottleneckRisk: 'nominal' | 'elevated' | 'critical' = 'nominal';
    let timeToBottleneck: number | undefined = undefined;

    if (predictedCpu >= 85 || (predictedMemory / limitMb) >= 0.85 || ringPressure >= 80) {
      bottleneckRisk = 'critical';
      timeToBottleneck = Math.max(15, Math.round(60 / (1 + Math.abs(this.hwTrendCpu) + Math.abs(this.hwTrendQueue / 1000))));
    } else if (predictedCpu >= 70 || ringPressure >= 60 || predictedQueue >= 10000) {
      bottleneckRisk = 'elevated';
      timeToBottleneck = Math.round(180 / (1 + Math.abs(this.hwTrendCpu)));
    }

    const point: TelemetryPoint = {
      timestamp: Date.now(),
      cpuPercent: cpuAdjusted,
      memoryUsedMb: memAdjusted,
      memoryTotalMb: limitMb,
      ioIops: Math.round(400 + trafficNormalized * 140 + Math.random() * 40),
      rxMbps: rx,
      txMbps: tx,
      queueDepth: socketQueue,
      ringBufferUsagePercent: ringPressure,
      predictedCpu,
      predictedMemory,
      predictedQueueDepth: predictedQueue,
      bottleneckRisk,
      timeToBottleneckSeconds: timeToBottleneck,
    };

    // Push into O(1) circular ring buffer
    this.ringBuffer.push(point);

    // Evaluate Auto-Scaling Policies
    this.evaluatePolicies(point);

    this.notify();
  }

  private evaluatePolicies(current: TelemetryPoint) {
    if (this.pendingScaleAction) return;

    const now = Date.now();
    for (const policy of this.policies) {
      if (!policy.enabled) continue;

      if (policy.lastTriggeredTimestamp && now - policy.lastTriggeredTimestamp < policy.cooldownSeconds * 1000) {
        continue;
      }

      let metricVal = 0;
      if (policy.metric === 'cpu') metricVal = current.cpuPercent;
      else if (policy.metric === 'memory') metricVal = (current.memoryUsedMb / current.memoryTotalMb) * 100;
      else if (policy.metric === 'queue_depth') metricVal = current.queueDepth;
      else if (policy.metric === 'ring_buffer') metricVal = current.ringBufferUsagePercent;

      const triggered = policy.operator === '>=' ? metricVal >= policy.threshold : metricVal > policy.threshold;

      if (triggered) {
        if (policy.mode === 'strict') {
          this.executeScalingAction(policy, 'AUTONOMOUS_POLICY_EVALUATOR');
        } else {
          this.pendingScaleAction = {
            policy,
            targetAction: `${policy.actionType.replace('_', ' ').toUpperCase()} (+${policy.actionValue})`,
            countdown: 10,
          };

          const timer = setInterval(() => {
            if (!this.pendingScaleAction) {
              clearInterval(timer);
              return;
            }
            this.pendingScaleAction.countdown--;
            if (this.pendingScaleAction.countdown <= 0) {
              clearInterval(timer);
              this.applyPendingScaleAction(true);
            } else {
              this.notify();
            }
          }, 1000);

          this.pendingScaleAction.timerId = timer;
          this.notify();
        }
        break;
      }
    }
  }

  // Record audit entry in cryptographic Merkle chain
  public async recordAudit(
    actor: string,
    category: AuditLogEntry['category'],
    action: string,
    details: string,
    status: AuditLogEntry['status']
  ) {
    const prevHash = this.auditLogs.length > 0 ? this.auditLogs[0].hash : GENESIS_PREV_HASH;
    const timestamp = Date.now();
    const hash = await computeAuditEntryHash(prevHash, timestamp, actor, action, details);

    const entry: AuditLogEntry = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp,
      prevHash,
      hash,
      actor,
      category,
      action,
      details,
      status,
    };

    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 300) {
      this.auditLogs.pop();
    }
  }
}

export const engineInstance = new VirtualEngine();
