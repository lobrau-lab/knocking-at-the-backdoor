/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { engineInstance } from './services/virtualEngine';
import { transportBridge } from './services/transportBridge';
import {
  ContainerNode,
  TelemetryPoint,
  Snapshot,
  StorageVolume,
  DaemonProcess,
  AutoScalingPolicy,
  AuditLogEntry,
  BuildJob,
  TransportStatus,
  MfaSessionToken,
} from './types';

import { OpsHeader } from './components/OpsHeader';
import { NavigationDeck, WorkspaceTab } from './components/NavigationDeck';
import { DashboardOverview } from './components/DashboardOverview';
import { TerminalSandbox } from './components/TerminalSandbox';
import { DaemonManager } from './components/DaemonManager';
import { PredictiveScalingStudio } from './components/PredictiveScalingStudio';
import { SnapshotStorageMatrix } from './components/SnapshotStorageMatrix';
import { McpInspector } from './components/McpInspector';
import { AuditLogViewer } from './components/AuditLogViewer';
import { MfaModal } from './components/MfaModal';
import { AutomatedBuildModal } from './components/AutomatedBuildModal';
import { CommandPalette } from './components/CommandPalette';
import { X, Terminal as TerminalIcon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Engine state subscriptions
  const [node, setNode] = useState<ContainerNode>(engineInstance.getNode());
  const [daemons, setDaemons] = useState<DaemonProcess[]>(engineInstance.getDaemons());
  const [storage, setStorage] = useState<StorageVolume[]>(engineInstance.getStorage());
  const [snapshots, setSnapshots] = useState<Snapshot[]>(engineInstance.getSnapshots());
  const [policies, setPolicies] = useState<AutoScalingPolicy[]>(engineInstance.getPolicies());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(engineInstance.getAuditLogs());
  const [builds, setBuilds] = useState<BuildJob[]>(engineInstance.getBuilds());
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(engineInstance.getTelemetry(60));
  const [trafficPressure, setTrafficPressure] = useState<number>(engineInstance.getTrafficPressure());
  const [pendingScaleAction, setPendingScaleAction] = useState(engineInstance.getPendingScaleAction());
  const [transportStatus, setTransportStatus] = useState<TransportStatus>(transportBridge.getStatus());

  // UI state for modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isTerminalDrawerOpen, setIsTerminalDrawerOpen] = useState(false);

  // Privileged MFA modal state
  const [mfaModalState, setMfaModalState] = useState<{
    isOpen: boolean;
    requiredAction: string;
    actionTitle: string;
    onVerified: (token: MfaSessionToken) => void;
  }>({
    isOpen: false,
    requiredAction: '',
    actionTitle: '',
    onVerified: () => {},
  });

  // Subscribe to virtualEngine and transport changes
  useEffect(() => {
    const unsubEngine = engineInstance.subscribe(() => {
      setNode(engineInstance.getNode());
      setDaemons(engineInstance.getDaemons());
      setStorage(engineInstance.getStorage());
      setSnapshots(engineInstance.getSnapshots());
      setPolicies(engineInstance.getPolicies());
      setAuditLogs(engineInstance.getAuditLogs());
      setBuilds(engineInstance.getBuilds());
      setTelemetry(engineInstance.getTelemetry(60));
      setTrafficPressure(engineInstance.getTrafficPressure());
      setPendingScaleAction(engineInstance.getPendingScaleAction());
    });

    const unsubTransport = transportBridge.subscribe(() => {
      setTransportStatus(transportBridge.getStatus());
    });

    return () => {
      unsubEngine();
      unsubTransport();
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setIsCommandPaletteOpen((prev) => !prev);
        }
        return;
      }

      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsTerminalDrawerOpen((prev) => !prev);
      } else if (e.key === '1') {
        setActiveTab('overview');
      } else if (e.key === '2') {
        setActiveTab('terminal');
      } else if (e.key === '3') {
        setActiveTab('daemons');
      } else if (e.key === '4') {
        setActiveTab('predictive');
      } else if (e.key === '5') {
        setActiveTab('snapshots');
      } else if (e.key === '6') {
        setActiveTab('audit');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // MFA Action trigger
  const requestMfa = (action: string, title: string, callback: (t: MfaSessionToken) => void) => {
    setMfaModalState({
      isOpen: true,
      requiredAction: action,
      actionTitle: title,
      onVerified: callback,
    });
  };

  const handleToggleAirplaneMode = () => {
    transportBridge.toggleAirplaneMode();
  };

  const handleToggleTransportMode = () => {
    const nextMode = transportStatus.mode === 'daemon' ? 'emulator' : 'daemon';
    transportBridge.setTargetMode(nextMode);
  };

  const handleLifecycle = (action: string, mfaToken?: string) => {
    transportBridge.performLifecycle(action, mfaToken);
  };

  const handleReconfigureCgroups = (params: any) => {
    transportBridge.reconfigureCgroups(params);
  };

  const handleCreateSnapshot = (name: string, description: string) => {
    transportBridge.createSnapshot(name, description);
    setIsSnapshotModalOpen(false);
  };

  const handleRollbackSnapshot = (id: string, mfaToken?: string) => {
    transportBridge.rollbackSnapshot(id, mfaToken);
  };

  const handleDeleteSnapshot = (id: string) => {
    engineInstance.deleteSnapshot(id);
  };

  const handleUpdatePolicy = (policy: AutoScalingPolicy, mfaToken?: string) => {
    return engineInstance.updatePolicy(policy, mfaToken);
  };

  const handleAddPolicy = (policy: Omit<AutoScalingPolicy, 'id' | 'triggerCount'>) => {
    engineInstance.addPolicy(policy);
  };

  const handleDeletePolicy = (id: string) => {
    engineInstance.deletePolicy(id);
  };

  const handleApplyPendingScale = (approved: boolean) => {
    engineInstance.applyPendingScaleAction(approved);
  };

  const handleRunBuild = (id: string) => {
    engineInstance.runBuildJob(id);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Bar */}
      <OpsHeader
        node={node}
        transport={transportStatus}
        onToggleAirplaneMode={handleToggleAirplaneMode}
        onToggleTransportMode={handleToggleTransportMode}
        onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
        onOpenBuildModal={() => setIsBuildModalOpen(true)}
        onOpenTerminalToggle={() => setIsTerminalDrawerOpen((prev) => !prev)}
      />

      {/* Navigation Deck */}
      <NavigationDeck
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        pendingScaleCount={pendingScaleAction ? 1 : 0}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 pb-16">
        {activeTab === 'overview' && (
          <DashboardOverview
            node={node}
            telemetry={telemetry}
            trafficPressure={trafficPressure}
            onSetTrafficPressure={(v) => engineInstance.setTrafficPressure(v)}
            onLifecycle={handleLifecycle}
            onReconfigureCgroups={handleReconfigureCgroups}
            onRequestMfa={requestMfa}
          />
        )}

        {activeTab === 'terminal' && <TerminalSandbox />}

        {activeTab === 'daemons' && (
          <DaemonManager
            daemons={daemons}
            trafficPressure={trafficPressure}
            onSetTrafficPressure={(v) => engineInstance.setTrafficPressure(v)}
            onExecuteCommand={(cmd) => engineInstance.executeCommand(cmd)}
          />
        )}

        {activeTab === 'predictive' && (
          <PredictiveScalingStudio
            policies={policies}
            pendingScaleAction={pendingScaleAction}
            onApplyPendingScale={handleApplyPendingScale}
            onUpdatePolicy={handleUpdatePolicy}
            onAddPolicy={handleAddPolicy}
            onDeletePolicy={handleDeletePolicy}
            onRequestMfa={requestMfa}
          />
        )}

        {activeTab === 'snapshots' && (
          <SnapshotStorageMatrix
            snapshots={snapshots}
            storage={storage}
            onCreateSnapshot={handleCreateSnapshot}
            onRollbackSnapshot={handleRollbackSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
            onRequestMfa={requestMfa}
          />
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <McpInspector />
            <div className="border-t border-slate-800">
              <AuditLogViewer logs={auditLogs} />
            </div>
          </div>
        )}
      </main>

      {/* Floating Quick Terminal Drawer (toggled via `~`) */}
      {isTerminalDrawerOpen && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0B0F17] border-t-2 border-cyan-500 shadow-2xl h-80 flex flex-col">
          <div className="px-4 py-2 bg-[#131B2E] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Quick Terminal Overlay (Press `~` or Esc to hide)</span>
            </div>
            <button
              onClick={() => setIsTerminalDrawerOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            <TerminalSandbox />
          </div>
        </div>
      )}

      {/* Privileged MFA Modal */}
      <MfaModal
        isOpen={mfaModalState.isOpen}
        onClose={() => setMfaModalState((prev) => ({ ...prev, isOpen: false }))}
        requiredAction={mfaModalState.requiredAction}
        actionTitle={mfaModalState.actionTitle}
        onVerified={mfaModalState.onVerified}
      />

      {/* Automated Build Script Modal */}
      <AutomatedBuildModal
        isOpen={isBuildModalOpen}
        onClose={() => setIsBuildModalOpen(false)}
        builds={builds}
        onRunBuild={handleRunBuild}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={setActiveTab}
        onToggleAirplaneMode={handleToggleAirplaneMode}
        onToggleTransportMode={handleToggleTransportMode}
        onLifecycle={handleLifecycle}
        onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
        onOpenBuildModal={() => setIsBuildModalOpen(true)}
      />

      {/* Quick Snapshot Modal */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#131B2E] border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Create Btrfs Snapshot</h3>
            <p className="text-xs text-slate-400">
              Captures subvolume metadata stream and writes copy-on-write pointer at{' '}
              <code className="text-cyan-400">/var/lib/machines/arch-nspawn-01/.snapshots/</code>
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.elements.namedItem('snapName') as HTMLInputElement).value;
                const desc = (form.elements.namedItem('snapDesc') as HTMLInputElement).value;
                handleCreateSnapshot(name, desc);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Snapshot Name
                </label>
                <input
                  name="snapName"
                  type="text"
                  required
                  placeholder="e.g. pre-migration-checkpoint"
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <input
                  name="snapDesc"
                  type="text"
                  placeholder="Optional context note"
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg"
                >
                  Create Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
