import React, { useMemo, useState } from 'react';
import { FSTGraphData, TokenEdge } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  data: FSTGraphData;
  selectedPath: string[];
  // Optional step playback highlights
  candidateEdges?: string[]; // edges currently being considered
  chosenEdge?: string | null; // edge chosen in this step
}

const NODE_SPACING = 80;
const CANVAS_HEIGHT = 400;
const BASELINE_Y = 300;
const TEXT_Y = 340;

const FSTGraph: React.FC<Props> = ({ data, selectedPath, candidateEdges = [], chosenEdge = null }) => {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const canvasWidth = Math.max(800, (data.nodes.length) * NODE_SPACING + 100);

  // Helper to calculate arc path
  const getArcPath = (start: number, end: number, isSelected: boolean) => {
    const x1 = start * NODE_SPACING + 50;
    const x2 = end * NODE_SPACING + 50;
    const width = x2 - x1;
    
    // Higher arcs for longer jumps
    const height = Math.min(180, 40 + width * 0.3); 
    
    return `M ${x1} ${BASELINE_Y} Q ${x1 + width / 2} ${BASELINE_Y - height} ${x2} ${BASELINE_Y}`;
  };

  // Sort edges to render selected ones on top
  const sortedEdges = useMemo(() => {
    return [...data.edges].sort((a, b) => {
      const aSel = selectedPath.includes(a.id) ? 1 : 0;
      const bSel = selectedPath.includes(b.id) ? 1 : 0;
      return aSel - bSel;
    });
  }, [data.edges, selectedPath]);

  return (
    <div className="w-full overflow-x-auto bg-surface rounded-xl border border-border p-4 shadow-2xl">
      <div className="min-w-max relative">
        <svg width={canvasWidth} height={CANVAS_HEIGHT} className="select-none">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#52525b" />
            </marker>
            <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ec4899" />
            </marker>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Draw Edges */}
          <AnimatePresence>
            {sortedEdges.map((edge) => {
              const isSelected = selectedPath.includes(edge.id);
              const isHovered = hoveredEdge === edge.id;
              const isGhost = !isSelected && hoveredEdge && hoveredEdge !== edge.id;
              const isCandidate = candidateEdges.includes(edge.id);
              const isChosen = chosenEdge === edge.id;
              
              let strokeColor = isSelected ? '#ec4899' : '#3f3f46';
              let strokeWidth = isSelected ? 3 : 1.5;
              let opacity = isGhost ? 0.1 : (isSelected || isHovered ? 1 : 0.3);
              if (isCandidate) {
                strokeColor = '#f59e0b'; // amber for candidates
                strokeWidth = 2.5;
                opacity = 1;
              }
              if (isChosen) {
                strokeColor = '#10b981'; // green for chosen
                strokeWidth = 3.5;
                opacity = 1;
              }
              const zIndex = isSelected ? 10 : 1;

              return (
                <motion.g 
                  key={edge.id}
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity, pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                  onMouseEnter={() => setHoveredEdge(edge.id)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  className="cursor-pointer"
                  style={{ zIndex }}
                >
                  <path
                    d={getArcPath(edge.from, edge.to, isSelected)}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                  />
                  {/* Label on Arc */}
                  {(isSelected || isHovered || isCandidate || isChosen) && (
                    <text
                      x={(edge.from * NODE_SPACING + 50 + edge.to * NODE_SPACING + 50) / 2}
                      y={BASELINE_Y - Math.min(180, 40 + ((edge.to - edge.from) * NODE_SPACING) * 0.3) - 10}
                      fill={isSelected ? '#f472b6' : '#a1a1aa'}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="bold"
                      className="bg-black"
                    >
                      {edge.label} <tspan fontSize="10" fill="#71717a">({edge.score.toFixed(2)})</tspan>
                    </text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* Draw Nodes (Characters) */}
          {data.nodes.map((nodeIndex) => (
            <g key={nodeIndex} transform={`translate(${nodeIndex * NODE_SPACING + 50}, ${BASELINE_Y})`}>
              <circle r="4" fill="#71717a" />
              <text
                x="0"
                y="20"
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize="10"
                fontFamily="monospace"
              >
                {nodeIndex}
              </text>
            </g>
          ))}

          {/* Character Letters */}
          {data.text.split('').map((char, i) => (
            <text
              key={i}
              x={(i * NODE_SPACING + 50 + (i + 1) * NODE_SPACING + 50) / 2}
              y={TEXT_Y}
              textAnchor="middle"
              fill="#e4e4e7"
              fontSize="24"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {char}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default FSTGraph;
