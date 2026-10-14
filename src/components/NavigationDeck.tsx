import React from 'react';
import {
  Activity,
  Terminal,
  Cpu,
  TrendingUp,
  HardDrive,
  FileCheck2,
} from 'lucide-react';

export type WorkspaceTab =
  | 'overview'
  | 'terminal'
  | 'daemons'
  | 'predictive'
  | 'snapshots'
  | 'audit';

interface NavigationDeckProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  pendingScaleCount: number;
}

export const NavigationDeck: React.FC<NavigationDeckProps> = ({
  currentTab,
  onSelectTab,
  pendingScaleCount,
}) => {
  interface NavTabItem {
    id: WorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    key: string;
    badge?: string;
  }

  const tabs: NavTabItem[] = [
    { id: 'overview', label: 'Node Telemetry', icon: Activity, key: '1' },
    { id: 'terminal', label: 'Arch Linux Terminal', icon: Terminal, key: '2' },
    { id: 'daemons', label: 'Daemons & Network', icon: Cpu, key: '3' },
    {
      id: 'predictive',
      label: 'Predictive & Auto-Scale',
      icon: TrendingUp,
      key: '4',
      badge: pendingScaleCount > 0 ? `${pendingScaleCount} Pending` : undefined,
    },
    { id: 'snapshots', label: 'Snapshots & Btrfs', icon: HardDrive, key: '5' },
    { id: 'audit', label: 'MCP & Merkle Audit', icon: FileCheck2, key: '6' },
  ];

  return (
    <nav className="bg-[#0E1524] border-b border-slate-800/80 px-6 py-2 flex items-center gap-1.5 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id as WorkspaceTab)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
              isActive
                ? 'bg-[#1E293B] text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                isActive
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/40'
                  : 'bg-slate-800/60 text-slate-500'
              }`}
            >
              {tab.key}
            </span>
            {tab.badge && (
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
