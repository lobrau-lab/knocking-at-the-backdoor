import React, { useState } from 'react';
import { BuildJob } from '../types';
import { engineInstance } from '../services/virtualEngine';
import { Play, CheckCircle2, Clock, X, Terminal, FileCode2 } from 'lucide-react';

interface AutomatedBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  builds: BuildJob[];
  onRunBuild: (id: string) => void;
}

export const AutomatedBuildModal: React.FC<AutomatedBuildModalProps> = ({
  isOpen,
  onClose,
  builds,
  onRunBuild,
}) => {
  const [selectedBuildId, setSelectedBuildId] = useState<string>(builds[0]?.id || '');

  if (!isOpen) return null;

  const activeJob = builds.find((b) => b.id === selectedBuildId) || builds[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[#131B2E] border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Automated Deployment &amp; Test Suite</h3>
              <p className="text-xs text-slate-400">
                Standardized bash runners executing inside native systemd-nspawn container namespace
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Script List, Right Console Output */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          {/* Left Script Selector */}
          <div className="border-r border-slate-800 p-4 space-y-2 overflow-y-auto">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-2">
              Available Test Suites
            </span>
            {builds.map((job) => {
              const isSelected = job.id === activeJob?.id;
              return (
                <button
                  key={job.id}
                  onClick={() => setSelectedBuildId(job.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-[#1E293B] border-cyan-500/50 text-white'
                      : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold truncate text-cyan-400">
                      {job.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        job.status === 'success'
                          ? 'bg-emerald-500'
                          : job.status === 'running'
                          ? 'bg-amber-500 animate-ping'
                          : 'bg-slate-600'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{job.description}</p>
                </button>
              );
            })}
          </div>

          {/* Right Script & Execution Output */}
          <div className="md:col-span-2 p-5 flex flex-col justify-between overflow-hidden space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-cyan-400 font-bold">{activeJob?.name}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                    activeJob?.status === 'success'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                      : activeJob?.status === 'running'
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {activeJob?.status}
                </span>
              </div>

              {/* Script Viewer */}
              <div className="mb-3">
                <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Script Source</span>
                <pre className="p-3 bg-[#0B0F17] border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36">
                  {activeJob?.script}
                </pre>
              </div>

              {/* Live Terminal Output */}
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Execution Stream</span>
                <div className="p-3 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs font-mono text-slate-200 overflow-y-auto h-48 space-y-1">
                  {activeJob?.logs.length === 0 ? (
                    <span className="text-slate-600 italic">No output yet. Click 'Run Script' to execute inside container.</span>
                  ) : (
                    activeJob?.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`${
                          log.includes('[OK]') || log.includes('successful') || log.includes('exit code 0')
                            ? 'text-emerald-400'
                            : log.startsWith('>')
                            ? 'text-cyan-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Run Button */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                disabled={activeJob?.status === 'running'}
                onClick={() => onRunBuild(activeJob.id)}
                className="px-4 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{activeJob?.status === 'running' ? 'Executing Test Runner...' : 'Run Inside Container'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
