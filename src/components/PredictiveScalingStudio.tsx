import React, { useState } from 'react';
import { AutoScalingPolicy, MfaSessionToken } from '../types';
import {
  TrendingUp,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';

interface PredictiveScalingStudioProps {
  policies: AutoScalingPolicy[];
  pendingScaleAction: {
    policy: AutoScalingPolicy;
    targetAction: string;
    countdown: number;
  } | null;
  onApplyPendingScale: (approved: boolean) => void;
  onUpdatePolicy: (policy: AutoScalingPolicy, mfaToken?: string) => { success: boolean; message: string };
  onAddPolicy: (policy: Omit<AutoScalingPolicy, 'id' | 'triggerCount'>) => void;
  onDeletePolicy: (id: string) => void;
  onRequestMfa: (action: string, title: string, callback: (t: MfaSessionToken) => void) => void;
}

export const PredictiveScalingStudio: React.FC<PredictiveScalingStudioProps> = ({
  policies,
  pendingScaleAction,
  onApplyPendingScale,
  onUpdatePolicy,
  onAddPolicy,
  onDeletePolicy,
  onRequestMfa,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newMetric, setNewMetric] = useState<'cpu' | 'memory' | 'queue_depth' | 'ring_buffer'>('cpu');
  const [newThreshold, setNewThreshold] = useState(85);
  const [newDuration, setNewDuration] = useState(10);
  const [newActionType, setNewActionType] = useState<'scale_cpu' | 'scale_memory' | 'tune_cgroup_weight' | 'throttle_stream'>('scale_cpu');
  const [newActionVal, setNewActionVal] = useState(2);
  const [newMode, setNewMode] = useState<'interactive' | 'strict'>('interactive');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleTogglePolicy = (policy: AutoScalingPolicy) => {
    onUpdatePolicy({ ...policy, enabled: !policy.enabled });
  };

  const handleSwitchMode = (policy: AutoScalingPolicy) => {
    const nextMode = policy.mode === 'strict' ? 'interactive' : 'strict';

    // If downgrading strict mode, require MFA token signature
    if (policy.mode === 'strict' && nextMode === 'interactive') {
      onRequestMfa('policy_modify', `Downgrade policy '${policy.name}' from Strict Autonomous to Interactive`, (token) => {
        const res = onUpdatePolicy({ ...policy, mode: nextMode }, token.token);
        if (!res.success) {
          setFeedbackMsg(res.message);
        }
      });
      return;
    }

    onUpdatePolicy({ ...policy, mode: nextMode });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    onAddPolicy({
      name: newRuleName.trim(),
      enabled: true,
      metric: newMetric,
      operator: '>=',
      threshold: newThreshold,
      durationSeconds: newDuration,
      actionType: newActionType,
      actionValue: newActionVal,
      mode: newMode,
      cooldownSeconds: 60,
    });

    setNewRuleName('');
    setShowAddForm(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Autonomous Scaling Mode Explanation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>Autonomous Scaling &amp; Conditional If-Statement Policy Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Holt-Winters trend evaluations enforcing automated cgroups v2 resource expansions
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Cancel New Rule' : 'New If-Statement Rule'}</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Pending Autonomous Override Live Alert Banner */}
      {pendingScaleAction && (
        <div className="p-4 bg-amber-950/40 border border-amber-600/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <span>AUTONOMOUS SCALE PROPOSAL PENDING</span>
                <span className="font-mono bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded text-[11px]">
                  Auto-applying in {pendingScaleAction.countdown}s
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Policy <strong>{pendingScaleAction.policy.name}</strong> triggered:{' '}
                <span className="text-cyan-300 font-mono">{pendingScaleAction.targetAction}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onApplyPendingScale(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => onApplyPendingScale(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
            >
              Approve Scale Now
            </button>
          </div>
        </div>
      )}

      {/* New Policy Form (collapsible) */}
      {showAddForm && (
        <form onSubmit={handleCreateRule} className="p-5 bg-[#131B2E] border border-cyan-500/40 rounded-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Define Conditional Scaling Rule
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Rule Identifier</label>
              <input
                type="text"
                required
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g. Memory Spike Burst Cushion"
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Evaluated Metric</label>
              <select
                value={newMetric}
                onChange={(e: any) => setNewMetric(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="cpu">CPU Utilization (%)</option>
                <option value="memory">Memory Usage (%)</option>
                <option value="queue_depth">Socket Queue Depth (pkts)</option>
                <option value="ring_buffer">Ring Buffer Pressure (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Condition</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400">&gt;=</span>
                <input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseFloat(e.target.value))}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
                <span className="text-xs text-slate-400">for {newDuration}s</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Autonomous Action</label>
              <select
                value={newActionType}
                onChange={(e: any) => setNewActionType(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="scale_cpu">Scale CPU (+Cores)</option>
                <option value="scale_memory">Scale Memory (+MB)</option>
                <option value="tune_cgroup_weight">Tune cpu.weight (+Units)</option>
                <option value="throttle_stream">Throttle Stream Pressure (-%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Delta Adjustment</label>
              <input
                type="number"
                value={newActionVal}
                onChange={(e) => setNewActionVal(parseFloat(e.target.value))}
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Enforcement Mode</label>
              <select
                value={newMode}
                onChange={(e: any) => setNewMode(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
              >
                <option value="interactive">Interactive (10s Override Countdown)</option>
                <option value="strict">Strict Autonomous (Instant Execution)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg"
            >
              Save Rule
            </button>
          </div>
        </form>
      )}

      {/* Policies List */}
      <div className="space-y-3">
        {policies.map((policy) => {
          return (
            <div
              key={policy.id}
              className={`p-4 rounded-xl border transition-all ${
                policy.enabled
                  ? 'bg-[#131B2E] border-slate-800'
                  : 'bg-[#0E1524]/60 border-slate-850 opacity-60'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        policy.enabled ? 'bg-cyan-400' : 'bg-slate-600'
                      }`}
                    />
                    <h3 className="text-sm font-semibold text-white">{policy.name}</h3>

                    {/* Mode Tag */}
                    <button
                      onClick={() => handleSwitchMode(policy)}
                      title="Click to toggle between Strict Autonomous and Interactive Mode"
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                        policy.mode === 'strict'
                          ? 'bg-purple-950/40 border-purple-500/40 text-purple-300 hover:bg-purple-950/60'
                          : 'bg-blue-950/40 border-blue-500/40 text-blue-300 hover:bg-blue-950/60'
                      }`}
                    >
                      {policy.mode === 'strict' ? 'Strict Autonomous' : 'Interactive Override'}
                    </button>
                  </div>

                  {/* Clean If-Statement Logic Statement */}
                  <div className="font-mono text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
                    <span className="text-cyan-400 font-bold">IF</span>
                    <span className="text-slate-200">
                      {policy.metric.toUpperCase()} {policy.operator} {policy.threshold}
                      {policy.metric.includes('percent') || policy.metric === 'cpu' ? '%' : ''}
                    </span>
                    <span className="text-cyan-400 font-bold">FOR</span>
                    <span>{policy.durationSeconds}s</span>
                    <span className="text-cyan-400 font-bold">THEN</span>
                    <span className="text-emerald-400 font-semibold">
                      {policy.actionType.replace('_', ' ').toUpperCase()} (+{policy.actionValue})
                    </span>
                  </div>
                </div>

                {/* Right controls: Trigger stats & Toggle */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right text-xs font-mono">
                    <div className="text-slate-300">
                      Fired: <strong className="text-cyan-400">{policy.triggerCount}</strong> times
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Cooldown: {policy.cooldownSeconds}s
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePolicy(policy)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        policy.enabled
                          ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {policy.enabled ? 'Active' : 'Disabled'}
                    </button>

                    <button
                      onClick={() => onDeletePolicy(policy.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove policy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
