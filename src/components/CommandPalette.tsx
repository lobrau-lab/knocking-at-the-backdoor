import React, { useState, useEffect } from 'react';
import {
  Search,
  Terminal,
  Activity,
  Cpu,
  TrendingUp,
  HardDrive,
  FileCheck2,
  ShieldCheck,
  Plane,
  Play,
  RotateCw,
  Camera,
  X,
} from 'lucide-react';
import { WorkspaceTab } from './NavigationDeck';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onToggleAirplaneMode: () => void;
  onToggleTransportMode: () => void;
  onLifecycle: (action: string) => void;
  onOpenSnapshotModal: () => void;
  onOpenBuildModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onToggleAirplaneMode,
  onToggleTransportMode,
  onLifecycle,
  onOpenSnapshotModal,
  onOpenBuildModal,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    {
      id: 'tab-overview',
      title: 'Navigate to Node Telemetry',
      category: 'Navigation',
      shortcut: '1',
      icon: Activity,
      action: () => {
        onSelectTab('overview');
        onClose();
      },
    },
    {
      id: 'tab-terminal',
      title: 'Open Arch Linux Terminal Console',
      category: 'Navigation',
      shortcut: '2',
      icon: Terminal,
      action: () => {
        onSelectTab('terminal');
        onClose();
      },
    },
    {
      id: 'tab-daemons',
      title: 'Inspect Low-Level Network Daemons',
      category: 'Navigation',
      shortcut: '3',
      icon: Cpu,
      action: () => {
        onSelectTab('daemons');
        onClose();
      },
    },
    {
      id: 'tab-predictive',
      title: 'Open Predictive Auto-Scaling Studio',
      category: 'Navigation',
      shortcut: '4',
      icon: TrendingUp,
      action: () => {
        onSelectTab('predictive');
        onClose();
      },
    },
    {
      id: 'tab-snapshots',
      title: 'Inspect Btrfs Snapshots & Volumes',
      category: 'Navigation',
      shortcut: '5',
      icon: HardDrive,
      action: () => {
        onSelectTab('snapshots');
        onClose();
      },
    },
    {
      id: 'tab-audit',
      title: 'View Cryptographic Merkle Audit Ledger',
      category: 'Navigation',
      shortcut: '6',
      icon: FileCheck2,
      action: () => {
        onSelectTab('audit');
        onClose();
      },
    },
    {
      id: 'action-seal',
      title: 'Toggle Sealed / Airplane Mode (nftables drop)',
      category: 'Security',
      shortcut: 'Alt+S',
      icon: Plane,
      action: () => {
        onToggleAirplaneMode();
        onClose();
      },
    },
    {
      id: 'action-transport',
      title: 'Toggle Local Daemon (127.0.0.1:8420) / Sandbox Fallback',
      category: 'Transport',
      icon: RotateCw,
      action: () => {
        onToggleTransportMode();
        onClose();
      },
    },
    {
      id: 'action-pause',
      title: 'Toggle Atomic Kernel Freeze (cgroup.freeze)',
      category: 'Lifecycle',
      shortcut: 'P',
      icon: Play,
      action: () => {
        onLifecycle('pause');
        onClose();
      },
    },
    {
      id: 'action-reboot',
      title: 'Initiate Warm Arch Linux Reboot',
      category: 'Lifecycle',
      shortcut: 'R',
      icon: RotateCw,
      action: () => {
        onLifecycle('reboot');
        onClose();
      },
    },
    {
      id: 'action-snapshot',
      title: 'Create Instantaneous Btrfs Snapshot',
      category: 'Storage',
      shortcut: 'S',
      icon: Camera,
      action: () => {
        onOpenSnapshotModal();
        onClose();
      },
    },
    {
      id: 'action-build',
      title: 'Run CI Epoll / cgroups Test Runner',
      category: 'Testing',
      shortcut: 'B',
      icon: Play,
      action: () => {
        onOpenBuildModal();
        onClose();
      },
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#131B2E] border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-slate-100">
        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500 ml-1" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to view (Ctrl+K)..."
            className="flex-1 bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No commands found.</div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#1E293B] text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
                    <div>
                      <div className="text-xs font-medium text-slate-200 group-hover:text-white">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-500">{item.category}</div>
                    </div>
                  </div>
                  {item.shortcut && (
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
