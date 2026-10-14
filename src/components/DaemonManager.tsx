import React from 'react';
import { DaemonProcess } from '../types';
import { Cpu, RefreshCw, Zap, Shield, Radio, Server } from 'lucide-react';

interface DaemonManagerProps {
  daemons: DaemonProcess[];
  trafficPressure: number;
  onSetTrafficPressure: (val: number) => void;
  onExecuteCommand: (cmd: string) => void;
}

export const DaemonManager: React.FC<DaemonManagerProps> = ({
  daemons,
  trafficPressure,
  onSetTrafficPressure,
  onExecuteCommand,
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Low-Level Linux Daemons &amp; Network Streaming Workers</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time async epoll event loops, WireGuard tunnel routing, and lock-free ring buffers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400">
            Current Stream Velocity:
            <span className="font-mono text-cyan-400 font-semibold ml-1.5">
              {trafficPressure.toLocaleString()} pkt/s
            </span>
          </div>
        </div>
      </div>

      {/* Daemons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {daemons.map((daemon) => {
          return (
            <div
              key={daemon.id}
              className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-bold font-mono text-white">{daemon.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400">{daemon.description}</p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-500">PID {daemon.pid}</span>
                  <div className="text-[11px] font-mono text-cyan-400">{daemon.unitFile}</div>
                </div>
              </div>

              {/* Thread & Telemetry Metrics */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Threads</div>
                  <div className="text-white font-semibold">{daemon.threads} workers</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">CPU Usage</div>
                  <div className="text-cyan-400 font-semibold">{daemon.cpuPercent}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Memory RSS</div>
                  <div className="text-emerald-400 font-semibold">{daemon.memoryMb} MB</div>
                </div>
              </div>

              {/* Ring Buffer Pressure Gauge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Circular Ring Buffer Pressure:</span>
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      daemon.ringBufferPressure > 70
                        ? 'text-red-400'
                        : daemon.ringBufferPressure > 40
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {daemon.ringBufferPressure}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      daemon.ringBufferPressure > 70
                        ? 'bg-red-500'
                        : daemon.ringBufferPressure > 40
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${daemon.ringBufferPressure}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>
                  epoll dispatch: <strong className="text-slate-200 font-mono">{daemon.epollEventsPerSec.toLocaleString()}</strong> events/s
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onExecuteCommand(`systemctl status ${daemon.unitFile}`)}
                    className="text-[11px] text-slate-400 hover:text-white underline"
                  >
                    status
                  </button>
                  <button
                    onClick={() => onExecuteCommand(`systemctl restart ${daemon.unitFile}`)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                  >
                    restart
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Epoll Architecture Card */}
      <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Kernel Async Architecture Specifications
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          All workers are bound directly to the isolated container network namespace (<code className="text-cyan-400">host0</code>), pinned across physical cores defined in <code className="text-cyan-400">cpuset.cpus</code>. Incoming datagrams enter a zero-copy lockless ring buffer, bypassing host context switches and maximizing sustained throughput.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-[#0B0F17] border border-slate-800">
            <span className="text-slate-500 block text-[10px]">DRIVER</span>
            <span className="text-slate-200">veth + eBPF XDP redirect</span>
          </div>
          <div className="p-3 rounded bg-[#0B0F17] border border-slate-800">
            <span className="text-slate-500 block text-[10px]">EVENT LOOP</span>
            <span className="text-slate-200">epoll(7) ET + io_uring SQPOLL</span>
          </div>
          <div className="p-3 rounded bg-[#0B0F17] border border-slate-800">
            <span className="text-slate-500 block text-[10px]">MEMORY CONFINEMENT</span>
            <span className="text-slate-200">cgroups v2 memory.max</span>
          </div>
        </div>
      </div>
    </div>
  );
};
