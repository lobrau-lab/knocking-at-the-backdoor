import React, { useState } from 'react';
import {
  ContainerNode,
  TelemetryPoint,
  MfaSessionToken,
} from '../types';
import {
  Cpu,
  HardDrive,
  Network,
  Zap,
  Play,
  Pause,
  RotateCw,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  Activity,
} from 'lucide-react';

interface DashboardOverviewProps {
  node: ContainerNode;
  telemetry: TelemetryPoint[];
  trafficPressure: number;
  onSetTrafficPressure: (val: number) => void;
  onLifecycle: (action: string, mfaToken?: string) => void;
  onReconfigureCgroups: (params: any) => void;
  onRequestMfa: (action: string, title: string, callback: (t: MfaSessionToken) => void) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  node,
  telemetry,
  trafficPressure,
  onSetTrafficPressure,
  onLifecycle,
  onReconfigureCgroups,
  onRequestMfa,
}) => {
  const current = telemetry[telemetry.length - 1] || {
    cpuPercent: 32,
    memoryUsedMb: 3410,
    memoryTotalMb: 8192,
    ioIops: 450,
    rxMbps: 142,
    txMbps: 88,
    queueDepth: 1840,
    ringBufferUsagePercent: 28,
    predictedCpu: 36,
    predictedMemory: 3560,
    predictedQueueDepth: 1960,
    bottleneckRisk: 'nominal' as const,
  };

  const [editCores, setEditCores] = useState(node.cgroups.cpuCores);
  const [editMem, setEditMem] = useState(Math.round(node.cgroups.memoryMaxBytes / (1024 * 1024)));

  const handleApplyCgroups = (e: React.FormEvent) => {
    e.preventDefault();
    onReconfigureCgroups({ cpuCores: editCores, memoryLimitMb: editMem });
  };

  const handleDestroyClick = () => {
    onRequestMfa('lifecycle_destroy', 'Destroy Arch Linux container sandbox and release cgroup slices', (token) => {
      onLifecycle('destroy', token.token);
    });
  };

  // Render SVG Sparkline / Forecast for CPU
  const renderCpuChart = () => {
    if (telemetry.length < 2) return null;
    const width = 500;
    const height = 120;
    const maxVal = 100;

    const points = telemetry.map((pt, idx) => {
      const x = (idx / (telemetry.length - 1)) * (width - 100);
      const y = height - (pt.cpuPercent / maxVal) * (height - 20) - 10;
      return `${x},${y}`;
    }).join(' ');

    // Holt-Winters Forecast projection segment
    const lastX = width - 100;
    const lastY = height - (current.cpuPercent / maxVal) * (height - 20) - 10;
    const projX = width - 10;
    const projY = height - (current.predictedCpu / maxVal) * (height - 20) - 10;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
        {/* Threshold Reference Line (85% warning) */}
        <line
          x1="0"
          y1={height - (85 / maxVal) * (height - 20) - 10}
          x2={width}
          y2={height - (85 / maxVal) * (height - 20) - 10}
          stroke="#EF4444"
          strokeDasharray="4 4"
          strokeOpacity="0.4"
        />

        {/* Historical Actual CPU Curve */}
        <polyline
          fill="none"
          stroke="#06B6D4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Holt-Winters 3-minute Forecast Projection */}
        <line
          x1={lastX}
          y1={lastY}
          x2={projX}
          y2={projY}
          stroke="#F59E0B"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
        <circle cx={projX} cy={projY} r="3.5" fill="#F59E0B" />
      </svg>
    );
  };

  const memoryUsageMb = Math.round(node.cgroups.memoryUsageBytes / (1024 * 1024));
  const memoryLimitMb = Math.round(node.cgroups.memoryMaxBytes / (1024 * 1024));
  const memPercent = Math.round((memoryUsageMb / memoryLimitMb) * 100);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Telemetry Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: CPU & cgroups Quota */}
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>CPU Utilization</span>
            </span>
            <span className="font-mono text-cyan-400 font-semibold">{current.cpuPercent}%</span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-white">
              {current.cpuPercent}
              <span className="text-sm font-normal text-slate-400"> %</span>
            </div>
            <div className="text-[11px] text-right font-mono text-slate-400">
              <span>{node.cgroups.cpuCores} Cores · </span>
              <span className="text-slate-300">{node.cgroups.cpuMaxQuotaUs / 1000}ms</span>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                current.cpuPercent > 80 ? 'bg-red-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, current.cpuPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Holt-Winters 3m:</span>
            <span className="font-mono text-amber-400 font-medium">
              {current.predictedCpu}%
            </span>
          </div>
        </div>

        {/* Metric 2: Memory (cgroups memory.max) */}
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Memory Allocation</span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold">{memPercent}%</span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-white">
              {memoryUsageMb}
              <span className="text-sm font-normal text-slate-400"> MB</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              / {memoryLimitMb} MB max
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                memPercent > 85 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, memPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Forecast Headroom:</span>
            <span className="font-mono text-emerald-300 font-medium">
              {memoryLimitMb - current.predictedMemory} MB
            </span>
          </div>
        </div>

        {/* Metric 3: Network Throughput & nftables */}
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Network className="w-4 h-4 text-blue-400" />
              <span>Network veth (host0)</span>
            </span>
            <span className="font-mono text-blue-400">
              {node.sealedMode ? 'DROPPED' : 'ACTIVE'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-white">
              {current.rxMbps + current.txMbps}
              <span className="text-sm font-normal text-slate-400"> Mbps</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Rx: {current.rxMbps}M · Tx: {current.txMbps}M
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (current.rxMbps / 300) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Socket Queue Depth:</span>
            <span className="font-mono text-slate-200">
              {current.queueDepth.toLocaleString()} / 32k
            </span>
          </div>
        </div>

        {/* Metric 4: Predictive Bottleneck Assessment */}
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Bottleneck Predictor</span>
            </span>
            <span
              className={`uppercase text-[11px] font-mono font-bold px-1.5 py-0.2 rounded ${
                current.bottleneckRisk === 'critical'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : current.bottleneckRisk === 'elevated'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {current.bottleneckRisk}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-white">
              {current.timeToBottleneckSeconds
                ? `${current.timeToBottleneckSeconds}s`
                : 'Nominal'}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {current.timeToBottleneckSeconds ? 'TTB lookahead' : 'Zero Risk'}
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                current.bottleneckRisk === 'critical'
                  ? 'bg-red-500'
                  : current.bottleneckRisk === 'elevated'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: current.bottleneckRisk === 'critical' ? '90%' : current.bottleneckRisk === 'elevated' ? '60%' : '20%',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Ring Buffer Pressure:</span>
            <span className="font-mono text-slate-200">
              {current.ringBufferUsagePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Telemetry Curves & Kernel cgroups v2 Knobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-Time Holt-Winters Telemetry Stream */}
        <div className="lg:col-span-2 bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>TSDB Real-Time Metric Feed &amp; 3-Minute Holt-Winters Projection</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                O(1) double exponential smoothing (α=0.4, β=0.2) streaming into fixed 300-point ring buffer
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Actual
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-0.5 border-t border-amber-400 border-dashed inline-block" /> Holt-Winters Forecast
              </span>
            </div>
          </div>

          {/* SVG Telemetry Canvas */}
          <div className="bg-[#0B0F17] border border-slate-800/80 rounded-lg p-3 pt-4">
            {renderCpuChart()}
          </div>

          {/* Traffic Pressure Stress Generator */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Packet Ingestion Stress Test:</span>
                <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                  {trafficPressure.toLocaleString()} packets/sec
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onSetTrafficPressure(25000)}
                  className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  25k (Nominal)
                </button>
                <button
                  onClick={() => onSetTrafficPressure(120000)}
                  className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 rounded"
                >
                  120k (Heavy)
                </button>
                <button
                  onClick={() => onSetTrafficPressure(450000)}
                  className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-red-300 rounded"
                >
                  450k (Stress)
                </button>
              </div>
            </div>

            <input
              type="range"
              min="10000"
              max="500000"
              step="5000"
              value={trafficPressure}
              onChange={(e) => onSetTrafficPressure(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Right Col: Authentic cgroups v2 Kernel Controllers */}
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>cgroups v2 Kernel Controllers</span>
            </h2>
            <p className="text-[11px] font-mono text-slate-400 truncate mt-1">
              {node.cgroups.cgroupScopePath}
            </p>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-[#0B0F17] border border-slate-800">
              <span className="text-slate-400">cpu.max</span>
              <span className="text-cyan-400 font-bold">
                "{node.cgroups.cpuMaxQuotaUs} {node.cgroups.cpuMaxPeriodUs}"
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#0B0F17] border border-slate-800">
              <span className="text-slate-400">cpuset.cpus</span>
              <span className="text-slate-200">{node.cgroups.cpusetCpus}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#0B0F17] border border-slate-800">
              <span className="text-slate-400">cpu.weight</span>
              <span className="text-slate-200">{node.cgroups.cpuWeight}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#0B0F17] border border-slate-800">
              <span className="text-slate-400">memory.max</span>
              <span className="text-slate-200 tabular-nums">
                {node.cgroups.memoryMaxBytes} bytes
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#0B0F17] border border-slate-800">
              <span className="text-slate-400">memory.high</span>
              <span className="text-slate-200 tabular-nums">
                {node.cgroups.memoryHighBytes} bytes
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#0B0F17] border border-slate-800">
              <span className="text-slate-400">cgroup.freeze</span>
              <span
                className={`font-bold ${
                  node.cgroups.cgroupFreeze === 1 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {node.cgroups.cgroupFreeze} ({node.cgroups.cgroupFreeze === 1 ? 'Frozen' : 'Thawed'})
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#0B0F17] border border-slate-800">
              <span className="text-slate-400">pids.current / max</span>
              <span className="text-slate-200">
                {node.cgroups.pidsCurrent} / {node.cgroups.pidsMax}
              </span>
            </div>
          </div>

          {/* Quick Dynamic Reconfigure Form */}
          <form onSubmit={handleApplyCgroups} className="pt-3 border-t border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cores (1-16)</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={editCores}
                  onChange={(e) => setEditCores(parseInt(e.target.value, 10))}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Memory (MB)</label>
                <input
                  type="number"
                  min="1024"
                  max="32768"
                  step="1024"
                  value={editMem}
                  onChange={(e) => setEditMem(parseInt(e.target.value, 10))}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded transition-colors"
            >
              Apply cgroups v2 Limits
            </button>
          </form>

          {/* Sandbox Lifecycle Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => onLifecycle('pause')}
              className="flex-1 py-1.5 text-xs font-medium text-slate-200 bg-[#0B0F17] border border-slate-800 hover:border-slate-700 rounded flex items-center justify-center gap-1.5 transition-colors"
              title="Toggle atomic kernel cgroup.freeze"
            >
              {node.cgroups.cgroupFreeze === 1 ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unfreeze</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Freeze</span>
                </>
              )}
            </button>

            <button
              onClick={() => onLifecycle('reboot')}
              className="flex-1 py-1.5 text-xs font-medium text-slate-200 bg-[#0B0F17] border border-slate-800 hover:border-slate-700 rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Reboot</span>
            </button>

            <button
              onClick={handleDestroyClick}
              className="py-1.5 px-3 text-xs font-medium text-red-400 bg-red-950/20 border border-red-900/40 hover:bg-red-950/40 rounded flex items-center justify-center transition-colors"
              title="Destroy container (Requires MFA token)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
