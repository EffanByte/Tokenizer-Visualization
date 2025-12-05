import React from 'react';
import { StepFrame, TokenEdge } from '../types';

interface Props {
  frame: StepFrame | null;
  edges: TokenEdge[];
}

const StepInspector: React.FC<Props> = ({ frame, edges }) => {
  if (!frame) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 text-sm text-zinc-400">
        No frame selected.
      </div>
    );
  }

  const lookup = (id: string) => edges.find(e => e.id === id);

  return (
    <div className="bg-surface border border-border rounded-xl p-4 text-sm text-gray-200">
      <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Frame Inspector</h4>
      <div className="mb-2 text-xs text-zinc-300">{frame.description}</div>

      <div className="mb-3">
        <div className="text-[11px] text-zinc-400 mb-1">Candidates</div>
        <div className="flex flex-wrap gap-2">
          {frame.candidates.map(id => {
            const e = lookup(id);
            return (
              <div key={id} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs">
                <div className="font-mono text-sm text-cyan-300">{e?.label ?? id}</div>
                <div className="text-[11px] text-zinc-500">{e ? `score: ${Number(e.score).toFixed(3)}` : id}</div>
              </div>
            );
          })}
        </div>
      </div>

      {frame.chosen && (
        <div className="mb-3">
          <div className="text-[11px] text-zinc-400 mb-1">Chosen</div>
          <div className="px-3 py-2 bg-emerald-900/20 border border-emerald-800 rounded text-xs">
            <div className="font-mono text-sm text-emerald-300">{lookup(frame.chosen)?.label ?? frame.chosen}</div>
            <div className="text-[11px] text-zinc-500">{`id: ${frame.chosen}`}</div>
          </div>
        </div>
      )}

      <div className="mb-3">
        <div className="text-[11px] text-zinc-400 mb-1">Partial Path</div>
        <div className="flex flex-wrap gap-2">
          {frame.partialPath.map(pid => (
            <div key={pid} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-cyan-400">{lookup(pid)?.label ?? pid}</div>
          ))}
          {frame.partialPath.length === 0 && <div className="text-xs text-zinc-500 italic">(none)</div>}
        </div>
      </div>

      {frame.viterbiSnapshot && (
        <div>
          <div className="text-[11px] text-zinc-400 mb-1">Viterbi Snapshot</div>
          <div className="overflow-auto max-h-40 border border-border rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400">
                  <th className="text-left px-2 py-1">Node</th>
                  <th className="text-left px-2 py-1">Cost</th>
                  <th className="text-left px-2 py-1">Edge</th>
                  <th className="text-left px-2 py-1">Prev</th>
                </tr>
              </thead>
              <tbody>
                {frame.viterbiSnapshot.map(s => (
                  <tr key={s.node} className="border-t border-border/60">
                    <td className="px-2 py-1 text-zinc-300">{s.node}</td>
                    <td className="px-2 py-1 text-zinc-300">{s.cost === Infinity ? '∞' : Number(s.cost).toFixed(3)}</td>
                    <td className="px-2 py-1 text-zinc-300 font-mono">{s.edgeId ?? '-'}</td>
                    <td className="px-2 py-1 text-zinc-300">{s.prev >= 0 ? s.prev : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepInspector;
