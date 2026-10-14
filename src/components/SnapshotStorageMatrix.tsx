import React, { useState } from 'react';
import { Snapshot, StorageVolume, MfaSessionToken } from '../types';
import {
  HardDrive,
  Camera,
  RotateCcw,
  Trash2,
  Lock,
  FileCheck,
  ShieldCheck,
  FolderGit2,
  ExternalLink,
} from 'lucide-react';

interface SnapshotStorageMatrixProps {
  snapshots: Snapshot[];
  storage: StorageVolume[];
  onCreateSnapshot: (name: string, description: string) => void;
  onRollbackSnapshot: (id: string, mfaToken?: string) => void;
  onDeleteSnapshot: (id: string) => void;
  onRequestMfa: (action: string, title: string, callback: (t: MfaSessionToken) => void) => void;
}

export const SnapshotStorageMatrix: React.FC<SnapshotStorageMatrixProps> = ({
  snapshots,
  storage,
  onCreateSnapshot,
  onRollbackSnapshot,
  onDeleteSnapshot,
  onRequestMfa,
}) => {
  const [newSnapName, setNewSnapName] = useState('');
  const [newSnapDesc, setNewSnapDesc] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapName.trim()) return;
    onCreateSnapshot(newSnapName.trim(), newSnapDesc.trim());
    setNewSnapName('');
    setNewSnapDesc('');
    setShowCreateModal(false);
  };

  const handleRollbackClick = (snap: Snapshot) => {
    onRequestMfa(
      'snapshot_rollback',
      `Rollback Arch Linux rootfs to snapshot '${snap.name}' (${snap.mountPath})`,
      (token) => {
        onRollbackSnapshot(snap.id, token.token);
      }
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Persistent Btrfs Volume &amp; Instantaneous Snapshot Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Instantaneous copy-on-write subvolumes with <code className="text-cyan-400">btrfs send --no-data</code> metadata stream SHA-256 signatures
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm self-start md:self-auto"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Create COW Snapshot</span>
        </button>
      </div>

      {/* Storage Volumes Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {storage.map((vol) => {
          const usedPct = Math.round((vol.usedGb / vol.totalGb) * 100);
          return (
            <div key={vol.id} className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white">{vol.name}</h3>
                  <div className="text-xs font-mono text-slate-400">{vol.mountPoint}</div>
                </div>
                <span className="text-[11px] font-mono bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 px-2 py-0.5 rounded">
                  {vol.filesystem} (zstd:3)
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Allocation</span>
                  <span className="text-white font-medium">
                    {vol.usedGb} GB / {vol.totalGb} GB ({usedPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${usedPct}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <span>Active Subvolumes: {vol.subvolumesCount}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5" /> Healthy
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Snapshots Table / Cards */}
      <div className="bg-[#131B2E] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Immutable Subvolume Snapshots ({snapshots.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Pinned Mapping: <span className="text-cyan-400">PrivateUsers=655360:65536</span>
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {snapshots.map((snap) => (
            <div key={snap.id} className="p-4 hover:bg-[#162038] transition-colors space-y-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">
                      {snap.name}
                    </span>
                    {snap.locked && (
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      Gen {snap.btrfsGeneration} · {new Date(snap.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{snap.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRollbackClick(snap)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/30 border border-amber-600/40 hover:bg-amber-950/60 rounded-lg transition-colors"
                    title="Atomic rollback to this subvolume (Requires MFA verification)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rollback (MFA)</span>
                  </button>

                  {!snap.locked && (
                    <button
                      onClick={() => onDeleteSnapshot(snap.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Subvolume path & Metadata stream hash */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono bg-[#0B0F17] p-2.5 rounded-lg border border-slate-800">
                <div className="truncate text-slate-400">
                  <span className="text-slate-500">Path: </span>
                  <span className="text-slate-200">{snap.mountPath}</span>
                </div>
                <div className="truncate text-slate-400 text-right">
                  <span className="text-slate-500">btrfs send --no-data SHA-256: </span>
                  <span className="text-cyan-400">{snap.sha256MetadataHash}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Snapshot Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#131B2E] border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Create Btrfs Snapshot</h3>
            <p className="text-xs text-slate-400">
              Captures subvolume metadata stream and writes copy-on-write pointer at{' '}
              <code className="text-cyan-400">/var/lib/machines/arch-nspawn-01/.snapshots/</code>
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Snapshot Name
                </label>
                <input
                  type="text"
                  required
                  value={newSnapName}
                  onChange={(e) => setNewSnapName(e.target.value)}
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
                  type="text"
                  value={newSnapDesc}
                  onChange={(e) => setNewSnapDesc(e.target.value)}
                  placeholder="Optional context note"
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
};
