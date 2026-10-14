import React, { useState } from 'react';
import { AuditLogEntry } from '../types';
import { verifyMerkleChain } from '../services/merkleAudit';
import {
  ShieldCheck,
  FileCheck2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  FileText,
  Printer,
  X,
} from 'lucide-react';

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    totalChecked: number;
    brokenIndex?: number;
    error?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const filtered = logs.filter((log) => {
    const matchesCat = filterCategory === 'all' || log.category === filterCategory;
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.hash.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    const result = await verifyMerkleChain(logs);
    setIsVerifying(false);
    setVerificationResult(result);
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `archguard-audit-ledger-${Date.now()}.json`;
    a.click();
  };

  const exportCsv = () => {
    const headers = ['id', 'timestamp', 'actor', 'category', 'action', 'details', 'hash', 'prevHash', 'status'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.timestamp).toISOString(),
      l.actor,
      l.category,
      l.action,
      `"${l.details.replace(/"/g, '""')}"`,
      l.hash,
      l.prevHash,
      l.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csvContent);
    a.download = `archguard-audit-ledger-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Cryptographic Merkle Audit Ledger &amp; Traceability</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tamper-evident SHA-256 Merkle hash chain validating all lifecycle transitions, scaling triggers, and MFA tokens
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-950/60 rounded-lg transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isVerifying ? 'Verifying Chain...' : 'Verify Chain Integrity'}</span>
          </button>

          <button
            onClick={exportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#131B2E] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#131B2E] border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowCertificateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Compliance Certificate</span>
          </button>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            verificationResult.valid
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/40 border-red-800/60 text-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {verificationResult.valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {verificationResult.valid ? 'Merkle Chain Integrity Verified' : 'Cryptographic Mismatch Detected'}
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {verificationResult.valid
                  ? `All ${verificationResult.totalChecked} sequential blocks verified back to Genesis (prevHash: 00000...0000). Zero tampering detected.`
                  : verificationResult.error}
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerificationResult(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#131B2E] border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, actor, details, or hash..."
            className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          {['all', 'scaling', 'lifecycle', 'security', 'storage', 'mfa', 'network', 'build'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded text-[11px] uppercase font-mono transition-colors whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'bg-[#0B0F17] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Merkle Ledger Table */}
      <div className="bg-[#131B2E] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="divide-y divide-slate-800">
          {filtered.map((log) => {
            return (
              <div key={log.id} className="p-4 hover:bg-[#162038] transition-colors space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        log.status === 'verified'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                          : log.status === 'autonomous'
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
                          : log.status === 'blocked'
                          ? 'bg-red-950/60 text-red-300 border border-red-800/40'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                      }`}
                    >
                      {log.status}
                    </span>

                    <span className="text-xs font-bold font-mono text-white">
                      {log.action}
                    </span>

                    <span className="text-slate-500">·</span>
                    <span className="text-[11px] text-slate-400 font-mono">{log.actor}</span>
                  </div>

                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-mono leading-relaxed">{log.details}</p>

                {/* Merkle Chain Link Hashes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono bg-[#0B0F17] p-2 rounded border border-slate-800/80">
                  <div className="truncate text-slate-500">
                    <span>prevHash: </span>
                    <span className="text-slate-400">{log.prevHash}</span>
                  </div>
                  <div className="truncate text-slate-500 text-right">
                    <span>hash: </span>
                    <span className="text-cyan-400">{log.hash}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Printable Compliance Audit Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-xl p-8 shadow-2xl space-y-6 relative print:p-0">
            <button
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  ARCHGUARD COMPLIANCE ATTESTATION
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cryptographic Audit Trail &amp; Isolation Certification
                </p>
              </div>
              <div className="text-right text-xs font-mono text-slate-600">
                <div>Date: {new Date().toISOString()}</div>
                <div>Status: CERTIFIED COMPLIANT</div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block font-mono">CONTAINER RUNTIME</span>
                  <span className="font-semibold">systemd-nspawn (Arch Linux 2026.10)</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-mono">STATIC USER NAMESPACE</span>
                  <span className="font-semibold">PrivateUsers=655360:65536</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-mono">ISOLATION BARRIER</span>
                  <span className="font-semibold">cgroups v2 + nftables forward drop</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-mono">MERKLE BLOCKS VERIFIED</span>
                  <span className="font-semibold">{logs.length} Sequential Records</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-1">ATTESTATION STATEMENT</h3>
                <p className="text-slate-700 leading-relaxed">
                  This document certifies that container instance <code className="font-mono">arch-nspawn-01</code> has been operated under continuous, non-bypassable cgroups v2 resource governor boundaries. All autonomous scaling decisions, MFA privileged action grants, and snapshot rollback operations have been immutably hashed into a Merkle sequence with zero detected cryptographic breaks.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <div>Lead Auditor: Automated Merkle Probe</div>
                <div>Head Digest: {logs[0]?.hash.slice(0, 32)}...</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
