import React, { useState } from 'react';
import { MCP_TOOLS, MCP_RESOURCES } from '../services/virtualEngine';
import { transportBridge } from '../services/transportBridge';
import { Code2, Play, Eye, BookOpen, Layers } from 'lucide-react';

export const McpInspector: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'tools' | 'resources' | 'rpc'>('tools');
  const [selectedResourceContent, setSelectedResourceContent] = useState<string | null>(null);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  // Interactive JSON-RPC 2.0 Request State
  const [rpcPayload, setRpcPayload] = useState<string>(
    JSON.stringify(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      },
      null,
      2
    )
  );
  const [rpcResponse, setRpcResponse] = useState<string | null>(null);
  const [isExecutingRpc, setIsExecutingRpc] = useState(false);

  const handleReadResource = async (uri: string) => {
    setSelectedUri(uri);
    const resp = await transportBridge.sendMcp({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'resources/read',
      params: { uri },
    });
    setSelectedResourceContent(JSON.stringify(resp.result || resp.error, null, 2));
  };

  const handleExecuteRpc = async () => {
    try {
      setIsExecutingRpc(true);
      const parsed = JSON.parse(rpcPayload);
      const resp = await transportBridge.sendMcp(parsed);
      setRpcResponse(JSON.stringify(resp, null, 2));
    } catch (err: any) {
      setRpcResponse(JSON.stringify({ error: err?.message || 'Invalid JSON syntax' }, null, 2));
    } finally {
      setIsExecutingRpc(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span>Model Context Protocol (MCP) JSON-RPC 2.0 Inspector</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Inter-service protocol interface for automated agent orchestration, container queries, and lifecycle tools
          </p>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#131B2E] border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('tools')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeSubTab === 'tools' ? 'bg-[#1E293B] text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tools ({MCP_TOOLS.length})
          </button>
          <button
            onClick={() => setActiveSubTab('resources')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeSubTab === 'resources' ? 'bg-[#1E293B] text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Resources ({MCP_RESOURCES.length})
          </button>
          <button
            onClick={() => setActiveSubTab('rpc')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeSubTab === 'rpc' ? 'bg-[#1E293B] text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Live JSON-RPC Tester
          </button>
        </div>
      </div>

      {/* SubTab 1: Tools */}
      {activeSubTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MCP_TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-cyan-400">{tool.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{tool.description}</p>
                </div>
                <span className="text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded">
                  tool
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                  Input Schema
                </span>
                <pre className="p-3 bg-[#0B0F17] border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40">
                  {JSON.stringify(tool.inputSchema, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SubTab 2: Resources */}
      {activeSubTab === 'resources' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MCP_RESOURCES.map((res) => (
              <div
                key={res.uri}
                className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{res.name}</h3>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded shrink-0">
                      {res.mimeType}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-cyan-400 mt-1 break-all">{res.uri}</div>
                  <p className="text-xs text-slate-400 mt-1">{res.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleReadResource(res.uri)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-950/60 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Read Resource</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedResourceContent && (
            <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-cyan-400">
                  URI Content: {selectedUri}
                </h4>
                <button
                  onClick={() => setSelectedResourceContent(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
              <pre className="p-4 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto max-h-72">
                {selectedResourceContent}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Live JSON-RPC Tester */}
      {activeSubTab === 'rpc' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                JSON-RPC 2.0 Request
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setRpcPayload(
                      JSON.stringify(
                        { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'set_airplane_mode', arguments: { sealed: true } } },
                        null,
                        2
                      )
                    )
                  }
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Preset: Seal
                </button>
                <button
                  onClick={() =>
                    setRpcPayload(
                      JSON.stringify(
                        { jsonrpc: '2.0', id: 3, method: 'resources/read', params: { uri: 'container://arch-node-01/cgroups/v2' } },
                        null,
                        2
                      )
                    )
                  }
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Preset: Read cgroups
                </button>
              </div>
            </div>

            <textarea
              value={rpcPayload}
              onChange={(e) => setRpcPayload(e.target.value)}
              rows={12}
              className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />

            <button
              onClick={handleExecuteRpc}
              disabled={isExecutingRpc}
              className="w-full py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isExecutingRpc ? 'Dispatching...' : 'Dispatch MCP Request'}</span>
            </button>
          </div>

          <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              JSON-RPC 2.0 Response Packet
            </h3>
            <pre className="p-3 bg-[#0B0F17] border border-slate-800 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto min-h-[280px] max-h-[360px]">
              {rpcResponse || '// Dispatch an MCP request to inspect the JSON-RPC response'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
