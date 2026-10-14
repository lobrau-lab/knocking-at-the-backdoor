# ArchGuard: Advanced Virtualized Testing & Deployment Platform (Arch Linux & systemd-nspawn)

A high-performance, hermetically sealed virtualization testing and deployment platform built on Arch Linux and native `systemd-nspawn` container isolation. The platform provides native cgroups v2 resource governance, persistent Btrfs snapshot migration, Google Model Context Protocol (MCP) inter-service communication, high-resolution local Time-Series Database (TSDB) telemetry, predictive bottleneck analytics with autonomous scaling if-statement rules, MFA verification, and a responsive operations console.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters were confirmed during Phase 1 clarification:
> - **Unified Operations Center & Gamified Console**: A multi-pane interface combining a real-time Telemetry Dashboard, an authentic Arch Linux CLI Terminal Sandbox (`archctl` + native Linux utils), a low-level Network Daemon & Worker Visualizer, and customizable keyboard shortcuts (`1-6`, `Ctrl+K`, `~`).
> - **Preloaded Deployment Workload**: Real-time simulation of low-level Linux networking daemons (`epoll-stream-worker`, `wireguard-tun-router`, `high-load-ring-buffer`) under sustained I/O and packet pressure.
> - **Autonomous Scaling & If-Statement Policy Engine**: Dual-mode predictive optimization (Interactive with manual override toggles vs. Strict Autonomous enforcement) driven by programmable conditional rules and local TSDB trend forecasting.
> - **Sealed / Airplane Mode**: Hermetic isolation toggle disabling all outbound network leaks with cryptographic SHA-256 backup verification.

---

## 1. Overview & Core Concept

ArchGuard is designed for systems engineers, site reliability engineers (SREs), and low-level software developers who need to test, benchmark, and deploy daemons and distributed network services inside a lightweight Arch Linux container without the overhead and abstractions of Docker/Podman.

### What It Delivers
1. **Native `systemd-nspawn` Container Sandbox**: Real-time virtualization lifecycle (`start`, `stop`, `pause`/cgroup freeze, `reboot`, `destroy`) managing dedicated Arch Linux userlands, namespace isolation (PID, NET, IPC, UTS, MNT), and cgroup v2 resource limits (`cpu.max`, `memory.max`, `io.weight`).
2. **Google Model Context Protocol (MCP) Server**: Embedded MCP channel exposing container resources, active systemd units, TSDB metrics, and lifecycle commands as standardized MCP tools and contexts for automated agent orchestration.
3. **Local TSDB & Predictive Bottleneck Analytics**: High-frequency telemetry pipeline recording CPU, RAM, IOPS, and network socket queue metrics into an indexed local time-series engine, running exponential trend forecasting to anticipate memory exhaustion and CPU throttling before service degradation occurs.
4. **Conditional Auto-Scaling Rule Engine**: Programmable if-statement triggers (e.g., `IF net_queue_depth > 12000 FOR 10s THEN scale_cpu(+2) AND notify()`) with interactive override toggles and strict autonomous execution.
5. **Snapshot & Volume Migration Matrix**: Instantaneous Btrfs-style copy-on-write snapshot creation, differential tree comparisons, and volume packaging for cross-host migration.
6. **MFA & Compliance Audit Ledger**: Multi-factor authentication gating for high-impact lifecycle actions and an immutable cryptographic audit log exportable to JSON, CSV, and compliance summaries.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Operator Command & Control**: The operator monitors the live Arch Linux node. A status banner indicates container state (Running, Paused, Sealed, Scaling).
2. **Terminal Execution & Lifecycle Management**: Using the built-in terminal or the graphical control deck, the operator executes `archctl status`, tests daemons, runs automated build scripts, and triggers live container snapshots.
3. **Workload Stress & Real-Time Telemetry**: The operator activates the preloaded network streaming worker. Telemetry cards and high-resolution charts reflect immediate CPU spikes, socket buffer fill rates, and memory allocation.
4. **Predictive Alerting & Autonomous Scaling**: As network pressure builds, the predictive analytics engine forecasts a bottleneck within 3 minutes. Depending on mode, the system either prompts the operator with a 1-click remediation toggle or autonomously applies cgroup limits, recording the decision in the audit ledger.
5. **Snapshot Rollback & Migration Export**: The operator snapshots the clean state, tests an experimental build script, triggers a simulated fault, and instantly rolls back the persistent volume or exports the container bundle.
6. **MFA Verification**: Gated operations (container destruction, secret key rotation, strict rule overrides) invoke a simulated TOTP/PIN authorization modal.

### Visual Identity & Theme
- **Aesthetic Direction**: High-density, precision-engineered telemetry workstation. Industrial dark slate canvas with crisp technical typography, reminiscent of modern aerospace and systems monitoring centers.
- **Color Palette**:
  - Neutral Canvas: Deep Obsidian (`#0B0F17`)
  - Structural Surfaces: Surface Slate (`#131B2E`), Border Hairline (`#1E293B`)
  - Accent & Semantic States:
    - Nominal / Running: Pure Emerald (`#10B981`)
    - Warning / High Load: Amber Flare (`#F59E0B`)
    - Critical / Bottleneck: Vivid Crimson (`#EF4444`)
    - Control & Selection: Electric Cyan (`#06B6D4`)
    - Terminal Text: High-contrast Monospace Phosphor (`#E2E8F0` and `#38BDF8`)
- **Typography & Hierarchy**:
  - Display / Headings: `Plus Jakarta Sans` / `Outfit` (clean geometric weight)
  - Data, Telemetry, Code & Terminal: `JetBrains Mono` / `IBM Plex Mono` with strict `tabular-nums`
- **Layout Rhythm**:
  - Top Bar: Wordmark (`ArchGuard Ops`), breadcrumb state, Sealed/Airplane toggle, MFA status, and primary action bar.
  - Sub-Navigation / Workspace Modes: Segmented tabs for `Overview & Nodes`, `Live Terminal`, `Network Daemons & Streamers`, `Predictive & Auto-Scaler`, `Snapshots & Storage`, `Security & Audit Logs`.
  - Global Keyboard Shortcuts: Quick command palette (`Ctrl+K`), quick terminal drawer (`~`), tab navigation (`1-6`).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: `systemd-nspawn` Emulation Engine vs. Generic Mocking
- **Chosen Approach**: Full-fidelity stateful virtualization emulator that simulates the exact behavior of `systemd-nspawn`, `machinectl`, and Linux cgroups v2. Commands like `machinectl shell`, `archctl snapshot`, `systemctl status epoll-worker`, and `btrfs subvolume snapshot` produce real, consistent output and mutate container state.
- **Why**: Developers and DevOps engineers require authentic terminal interactions, realistic file-tree structures, and genuine operational semantics rather than canned animations.

### Decision 2: Local Client-Side Time-Series Database (TSDB) & Trend Forecasting
- **Chosen Approach**: In-memory ring-buffer TSDB with IndexedDB persistence, sub-second aggregation, and client-side predictive linear/exponential trend analysis.
- **Why**: Satisfies the strict "No Data Leak / Airplane Mode" requirement where the sealed virtual container operates completely hermetic without external telemetry egress.

### Decision 3: Google Model Context Protocol (MCP) Interface
- **Chosen Approach**: Native Model Context Protocol (JSON-RPC 2.0 schema) inspector and dispatcher. Exposes tools (`container_exec`, `scale_cgroup`, `create_snapshot`, `get_telemetry`) and resources (`container://arch-node/journal`, `container://arch-node/tsdb`) directly in the UI.
- **Why**: Directly fulfills the prompt's mandate that inter-service and external communication must conform to Google MCP.

### Decision 4: Interactive vs. Strict Autonomous Scaling
- **Chosen Approach**: Dual-mode engine where the user can author custom rules (e.g. `IF cpu > 85% FOR 15s THEN add_cores(2)`) and toggle between "Interactive Override" (asks for operator confirmation with 10s auto-apply countdown) and "Strict Autonomous" (instant non-blocking execution with mandatory audit record).

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ArchGuard Ops Center (UI)                         │
│  ┌───────────────┐ ┌────────────────┐ ┌───────────────┐ ┌───────────┐  │
│  │ Telemetry Deck│ │Terminal Console│ │Daemon Streamer│ │Scale Rules│  │
│  └───────┬───────┘ └───────┬────────┘ └───────┬───────┘ └─────┬─────┘  │
└──────────┼─────────────────┼──────────────────┼───────────────┼────────┘
           │                 │                  │               │
┌──────────▼─────────────────▼──────────────────▼───────────────▼────────┐
│                   ArchGuard Core Virtual Engine                        │
│                                                                        │
│  ┌───────────────────────────────┐   ┌──────────────────────────────┐  │
│  │     systemd-nspawn Engine     │   │      Google MCP Dispatcher   │  │
│  │ • PID / NET / MNT Namespaces  │   │ • Tools: exec, scale, snap   │  │
│  │ • cgroups v2 Resource Governor│   │ • Resources: journal, metrics│  │
│  │ • Btrfs Persistent Volumes    │   │ • Prompt Context: diagnostics│  │
│  └───────────────┬───────────────┘   └───────────────┬──────────────┘  │
│                  │                                   │                 │
│  ┌───────────────▼───────────────┐   ┌───────────────▼──────────────┐  │
│  │  High-Throughput Daemons      │   │  Local TSDB & Predictive Core│  │
│  │ • epoll-stream-worker         │   │ • 1s Telemetry Ingestion     │  │
│  │ • wireguard-tun-router        │   │ • ARIMA / Trend Bottleneck   │  │
│  │ • ring-buffer-pressure-test   │   │ • Autonomous Rule Evaluator  │  │
│  └───────────────┬───────────────┘   └───────────────┬──────────────┘  │
│                  │                                   │                 │
│  ┌───────────────▼───────────────────────────────────▼──────────────┐  │
│  │             Security, MFA & Immutable Audit Ledger               │  │
│  │ • TOTP / PIN Security Guard   • Airplane Mode Hermetic Firewall  │  │
│  │ • SHA-256 Volume Hash Verify  • Export (JSON / CSV / Report)     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Core State Entities
1. **ContainerInstance**:
   - `id`: string, `name`: `arch-nspawn-01`
   - `status`: `'running' | 'paused' | 'stopped' | 'rebuilding'`
   - `uptime`: number, `os`: `'Arch Linux 2026.10-lts'`
   - `cgroups`: `{ cpuCores: number, cpuWeight: number, memoryLimitMb: number, memoryUsageMb: number, ioReadMbps: number, ioWriteMbps: number }`
   - `network`: `{ vethInterface: 've-arch01', ip: '10.244.0.2/24', rxMbps: number, txMbps: number, dropRate: number, queueDepth: number }`
   - `sealedMode`: boolean (Airplane mode blocking external egress)
2. **TelemetryMetricPoint**:
   - `timestamp`: number, `cpuPercent`: number, `memoryUsedMb`: number, `memoryTotalMb`: number, `ioIops`: number, `networkThroughput`: number, `queueDepth`: number, `predictedCpu`: number, `predictedMemory`: number
3. **SnapshotRecord**:
   - `id`: string, `name`: string, `timestamp`: number, `sizeMb`: number, `volumePath`: string, `sha256`: string, `parentSnapshotId`: string | null, `description`: string
4. **AutoScalingPolicy**:
   - `id`: string, `name`: string, `enabled`: boolean, `metric`: `'cpu' | 'memory' | 'queue_depth' | 'io'`, `operator`: `'>' | '>='`, `threshold`: number, `durationSec`: number, `action`: `{ type: 'scale_cpu' | 'scale_memory' | 'throttle_worker', delta: number }`, `mode`: `'interactive' | 'strict'`, `cooldownSec`: number, `lastTriggered`: number | null
5. **AuditLogEntry**:
   - `id`: string, `timestamp`: number, `actor`: string, `action`: string, `category`: `'scaling' | 'lifecycle' | 'security' | 'storage' | 'mfa'`, `details`: Record<string, any>, `hash`: string

### Interactive Component & State Mapping
- **OpsCenterHeader**: Displays node status, CPU/Mem mini meters, Airplane Mode toggle, MFA badge, and system time.
- **NodeMetricsDeck**: Interactive SVG time-series graphs displaying historical and predicted metrics, scrubber slider, and anomaly highlights.
- **TerminalSandbox**: Interactive xterm-like shell with command parser supporting `archctl`, `machinectl`, `systemctl`, `journalctl`, `pacman`, `btrfs`, `mcp`, `help`, and `clear`.
- **DaemonPipelineMonitor**: Visual flow of streaming worker processes (`epoll-stream-worker`, `wireguard-tun-router`) with real-time payload generation controls (1k - 500k req/s).
- **PredictiveScalingStudio**: Interactive if-statement rule builder, live forecast simulator, and autonomous action override modal.
- **SnapshotMigrationManager**: Visual snapshot tree, 1-click snapshot creation, rollback verification with SHA-256 integrity, and JSON/tarball export.
- **MfaSecurityModal**: Authenticator TOTP prompt for privileged operations.
- **ComplianceAuditViewer**: Searchable, filterable audit log with one-click export (JSON, CSV, and formatted Print-Ready Compliance Report).
