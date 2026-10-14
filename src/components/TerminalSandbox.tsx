import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Copy, Trash2, ArrowRight } from 'lucide-react';
import { transportBridge } from '../services/transportBridge';

interface TerminalSandboxProps {
  initialCommand?: string;
}

export const TerminalSandbox: React.FC<TerminalSandboxProps> = ({ initialCommand }) => {
  const [history, setHistory] = useState<Array<{ command: string; output: string[] }>>([
    {
      command: 'archctl status',
      output: [
        '● arch-nspawn-core (arch-nspawn-01)',
        '  State: RUNNING (cgroup.freeze=0)',
        '  Scope: /sys/fs/cgroup/machine.slice/machine-arch\\x2dnspawn\\x2d01.scope/',
        '  UID Mapping: PrivateUsers=655360:65536',
        '  cpu.max: "400000 100000" (4 cores, cpuset: 0-3)',
        '  memory.max: 8192MB (usage: 3410MB)',
        '  Network: 10.244.0.2 (ve-arch01 -> host0)',
        '  nftables: FORWARD ACCEPT',
      ],
    },
  ]);
  const [input, setInput] = useState(initialCommand || '');
  const [cmdHistory, setCmdHistory] = useState<string[]>(['archctl status']);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;

    if (raw === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    setCmdHistory((prev) => [...prev, raw]);
    setHistoryIdx(-1);

    const output = await transportBridge.executeCommand(raw);
    if (output.length === 1 && output[0] === '__CLEAR__') {
      setHistory([]);
    } else {
      setHistory((prev) => [...prev, { command: raw, output }]);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInput(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= cmdHistory.length) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        setHistoryIdx(nextIdx);
        setInput(cmdHistory[nextIdx]);
      }
    }
  };

  const runPreset = (cmd: string) => {
    setInput(cmd);
    inputRef.current?.focus();
  };

  const copyTerminalText = () => {
    const text = history
      .map((h) => `[root@arch-nspawn-01 ~]# ${h.command}\n${h.output.join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Terminal Header & Presets */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-cyan-400" />
            <span>Dedicated Arch Linux CLI Terminal Sandbox</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Native <code className="text-cyan-400">systemd-nspawn</code> container shell with pinned <code className="text-slate-300">PrivateUsers=655360:65536</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyTerminalText}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-[#131B2E] border border-slate-800 hover:border-slate-700 rounded transition-colors"
            title="Copy terminal session"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Session</span>
          </button>
          <button
            onClick={() => setHistory([])}
            className="p-1.5 text-slate-400 hover:text-red-400 bg-[#131B2E] border border-slate-800 rounded transition-colors"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Clickable Preset Quick Commands */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 text-[11px] uppercase tracking-wider shrink-0 font-mono">
          Quick Shell:
        </span>
        {[
          'archctl status',
          'cat /sys/fs/cgroup/machine.slice/machine-arch\\x2dnspawn\\x2d01.scope/cpu.max',
          'nft list ruleset',
          'machinectl status arch-nspawn-01',
          'systemctl status epoll-stream.service',
          'btrfs subvolume list /var/lib/machines',
          'mcp tools',
          'help',
        ].map((cmd) => (
          <button
            key={cmd}
            onClick={() => runPreset(cmd)}
            className="px-2 py-0.5 bg-[#131B2E] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded font-mono text-[11px] whitespace-nowrap transition-colors"
          >
            {cmd.split(' ')[0]} {cmd.split(' ')[1] || ''}
          </button>
        ))}
      </div>

      {/* Terminal Screen Console */}
      <div
        className="bg-[#0B0F17] border border-slate-800 rounded-xl p-4 font-mono text-xs leading-relaxed shadow-2xl min-h-[480px] max-h-[640px] overflow-y-auto flex flex-col justify-between"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="space-y-4">
          <div className="text-slate-500 pb-2 border-b border-slate-850">
            Arch Linux (rolling) · systemd-nspawn kernel sandbox · PrivateUsers 655360:65536
            <br />
            Type <span className="text-cyan-400">help</span> for platform commands or test <span className="text-cyan-400">archctl</span>, <span className="text-cyan-400">nft</span>, <span className="text-cyan-400">mcp</span>.
          </div>

          {history.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-emerald-400 font-semibold">[root@arch-nspawn-01 ~]#</span>
                <span className="text-white font-medium">{item.command}</span>
              </div>
              <div className="pl-4 text-slate-300 space-y-0.5 whitespace-pre-wrap">
                {item.output.map((line, lIdx) => (
                  <div
                    key={lIdx}
                    className={`${
                      line.includes('●') || line.includes('[OK]')
                        ? 'text-emerald-400'
                        : line.includes('DROPPED') || line.includes('Frozen')
                        ? 'text-amber-400'
                        : line.includes('error') || line.includes('failed')
                        ? 'text-red-400'
                        : line.startsWith('#') || line.startsWith('//')
                        ? 'text-slate-500'
                        : 'text-slate-300'
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input Line with Blinking Cursor */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-4 mt-2 border-t border-slate-850">
          <span className="text-emerald-400 font-semibold shrink-0">
            [root@arch-nspawn-01 ~]#
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type command (e.g. archctl status, nft list ruleset, mcp tools)..."
            className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder-slate-600"
            autoFocus
          />
          <button type="submit" className="text-slate-500 hover:text-cyan-400 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
