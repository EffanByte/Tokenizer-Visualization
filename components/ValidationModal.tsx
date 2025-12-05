import React from 'react';
import { ValidationRow } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  rows: ValidationRow[];
}

const ValidationModal: React.FC<Props> = ({ open, onClose, rows }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Tokenizer Validation Metrics</h2>
          <button
            onClick={onClose}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-border">
                <th className="text-left py-1 pr-2">Metric</th>
                <th className="text-left py-1 pr-2">Value</th>
                <th className="text-left py-1 pr-2">Pass/Fail</th>
                <th className="text-left py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.metric} className="border-t border-border/60">
                  <td className="py-1 pr-2 text-zinc-100">{r.metric}</td>
                  <td className="py-1 pr-2 text-zinc-100">{r.value}</td>
                  <td className="py-1 pr-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'Pass'
                          ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60'
                          : r.status === 'Fail'
                          ? 'bg-red-900/40 text-red-300 border border-red-700/60'
                          : 'bg-amber-900/40 text-amber-300 border border-amber-700/60'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-1 text-zinc-400">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ValidationModal;


