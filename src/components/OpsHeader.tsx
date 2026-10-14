import React from 'react';
import {
  ShieldCheck,
  Plane,
  Server,
  Camera,
  Play,
  RotateCw,
  Terminal,
} from 'lucide-react';
import { ContainerNode, TransportStatus } from '../types';

interface OpsHeaderProps {
  node: ContainerNode;
  transport: TransportStatus;
  onToggleAirplaneMode: () => void;
  onToggleTransportMode: () => void;
  onOpenSnapshotModal: () => void;
  onOpenBuildModal: () => void;
  onOpenTerminalToggle: () => void;
}

export const OpsHeader: React.FC<OpsHeaderProps> = ({
  node,
  transport,
  onToggleAirplaneMode,
  onToggleTransportMode,
  onOpenSnapshotModal,
  onOpenBuildModal,
  onOpenTerminalToggle,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between gap-6">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors">
            <Server className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            ArchGuard Ops
          </span>
        </a>

        {/* Clean Typographic Metadata Separator */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
          <span aria-hidden="true" className="text-slate-600">/</span>
          <span className="font-mono text-slate-300">{node.name}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono text-cyan-400/90">{node.uidMapping}</span>
        </div>
      </div>

      {/* Zone 2: Navigation & Status Indicators (Single line, whitespace-nowrap) */}
      <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-300">
        {/* Node status indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#131B2E] border border-slate-800">
          <span
            className={`w-2 h-2 rounded-full ${
              node.status === 'running'
                ? 'bg-emerald-500'
                : node.status === 'paused'
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
          />
          <span className="uppercase text-[11px] tracking-wider text-slate-200">
            {node.status}
          </span>
          <span className="text-slate-600 font-mono">|</span>
          <span className="font-mono tabular-nums text-slate-400">
            {Math.floor(node.uptimeSeconds / 60)}m uptime
          </span>
        </div>

        {/* Hybrid Backend Transport Mode Selector */}
        <button
          onClick={onToggleTransportMode}
          title="Toggle between local physical daemon and browser sandbox fallback"
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#131B2E] border border-slate-800 hover:border-slate-700 transition-colors text-slate-300"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              transport.mode === 'daemon' ? 'bg-cyan-400' : 'bg-slate-400'
            }`}
          />
          <span className="text-[11px] whitespace-nowrap">
            {transport.mode === 'daemon' ? 'Local Daemon (127.0.0.1:8420)' : 'Sandbox Fallback'}
          </span>
          {transport.mode === 'daemon' && (
            <span className="text-[10px] font-mono text-cyan-400">
              {transport.latencyMs}ms
            </span>
          )}
        </button>

        {/* Sealed / Airplane Mode (nftables drop rule toggle) */}
        <button
          onClick={onToggleAirplaneMode}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
            node.sealedMode
              ? 'bg-amber-950/40 border-amber-600/50 text-amber-300 hover:bg-amber-950/60'
              : 'bg-[#131B2E] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          title={
            node.sealedMode
              ? 'nftables rule active: external forward drop applied on ve-arch01'
              : 'External routing open. Click to hermetically seal container.'
          }
        >
          <Plane className={`w-3.5 h-3.5 ${node.sealedMode ? 'text-amber-400' : ''}`} />
          <span className="text-[11px] whitespace-nowrap">
            {node.sealedMode ? 'Sealed (nft drop)' : 'Airplane Mode'}
          </span>
        </button>

        {/* MFA Enforced Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-slate-300">MFA Enforced</span>
        </div>
      </div>

      {/* Zone 3: Primary Action & Quick Drawer Affordances */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenTerminalToggle}
          className="p-2 text-slate-400 hover:text-cyan-400 bg-[#131B2E] border border-slate-800 rounded-lg transition-colors"
          title="Toggle Quick Terminal Drawer (`~` key)"
        >
          <Terminal className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenBuildModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#131B2E] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span className="whitespace-nowrap">Run CI Test</span>
        </button>

        <button
          onClick={onOpenSnapshotModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm shadow-cyan-950/40 whitespace-nowrap"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Snapshot Volume</span>
        </button>
      </div>
    </header>
  );
};
