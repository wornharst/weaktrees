import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { ChopsticksState, Hands } from '../../types/game';
import {
  applyChopsticksMove,
  getBestChopsticksMove,
  getLegalChopsticksMoves,
  isDead,
} from '../../solvers/chopsticks';

interface VisNode {
  id: string;
  label: string;
  subLabel: string;
  tier: number;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  isAi: boolean;
  isLeaf?: boolean;
  winner?: 'AI' | 'Player';
  p1: Hands;
  p2: Hands;
  desc: string;
}

interface VisEdge {
  id: string;
  source: string;
  target: string;
  type: 'p1' | 'p2';
}

interface ChopsticksTreeVisualizerProps {
  currentState: ChopsticksState;
  currentPly: number;
}

const MAX_TIER = 8;

const TIER_LABELS: Record<number, string> = {
  0: 'Ply 0: Opening',
  1: 'Ply 1: Your Strike',
  2: 'Ply 2: AI Invariant',
  3: 'Ply 3: Your Strike',
  4: 'Ply 4: AI Invariant',
  5: 'Ply 5: Your Strike',
  6: 'Ply 6: AI Invariant',
  7: 'Ply 7: Your Strike',
  8: 'Win Leaf (Knockout)',
};

function buildChopsticksWeakTree() {
  const nodesMap = new Map<string, VisNode>();
  const edges: VisEdge[] = [];
  const edgeSet = new Set<string>();

  const rootId = 'root_11_11';
  nodesMap.set(rootId, {
    id: rootId,
    label: '[1,1] vs [1,1]',
    subLabel: 'Start',
    tier: 0,
    baseX: 0.5,
    baseY: 0,
    x: 0,
    y: 0,
    isAi: false,
    p1: [1, 1],
    p2: [1, 1],
    desc: 'Opening: You [1, 1] vs AI [1, 1]',
  });

  const winLeafId = 'win_leaf';
  nodesMap.set(winLeafId, {
    id: winLeafId,
    label: 'Win Leaf',
    subLabel: 'AI Knockout',
    tier: MAX_TIER,
    baseX: 0.5,
    baseY: 1.0,
    x: 0,
    y: 0,
    isAi: true,
    isLeaf: true,
    winner: 'AI',
    p1: [0, 0],
    p2: [0, 0],
    desc: 'Weak Solution Invariant Held: AI forced knockout victory',
  });

  const queue: Array<{ p1: Hands; p2: Hands; tier: number; id: string }> = [
    { p1: [1, 1], p2: [1, 1], tier: 0, id: rootId },
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.tier >= MAX_TIER - 1) {
      const aiMove = getBestChopsticksMove({ p1: curr.p1, p2: curr.p2 }, 'P2');
      if (aiMove) {
        const edgeId = `${curr.id}->${winLeafId}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({ id: edgeId, source: curr.id, target: winLeafId, type: 'p2' });
        }
      }
      continue;
    }

    if (curr.tier % 2 === 0) {
      const moves = getLegalChopsticksMoves(curr.p1, curr.p2);
      const seenNextStates = new Map<string, Hands[]>();

      for (const m of moves) {
        const next = applyChopsticksMove({ p1: curr.p1, p2: curr.p2 }, m, 'P1');
        const stateKey = `${next.p1[0]}${next.p1[1]}_${next.p2[0]}${next.p2[1]}`;

        if (!seenNextStates.has(stateKey)) {
          seenNextStates.set(stateKey, [next.p1, next.p2]);
        }
      }

      for (const [stateKey, [nextP1, nextP2]] of seenNextStates.entries()) {
        const nextTier = curr.tier + 1;
        const childId = `t${nextTier}_${stateKey}`;

        const edgeId = `${curr.id}->${childId}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({ id: edgeId, source: curr.id, target: childId, type: 'p1' });
        }

        if (!nodesMap.has(childId)) {
          nodesMap.set(childId, {
            id: childId,
            label: `[${nextP1[0]},${nextP1[1]}] vs [${nextP2[0]},${nextP2[1]}]`,
            subLabel: `Ply ${nextTier}`,
            tier: nextTier,
            baseX: 0.5,
            baseY: nextTier / MAX_TIER,
            x: 0,
            y: 0,
            isAi: false,
            p1: nextP1,
            p2: nextP2,
            desc: `Your strike: You [${nextP1[0]}, ${nextP1[1]}] vs AI [${nextP2[0]}, ${nextP2[1]}]`,
          });

          queue.push({ p1: nextP1, p2: nextP2, tier: nextTier, id: childId });
        }
      }
    } else {
      const aiMove = getBestChopsticksMove({ p1: curr.p1, p2: curr.p2 }, 'P2');
      if (aiMove) {
        const next = applyChopsticksMove({ p1: curr.p1, p2: curr.p2 }, aiMove, 'P2');

        if (isDead(next.p1)) {
          const edgeId = `${curr.id}->${winLeafId}`;
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            edges.push({ id: edgeId, source: curr.id, target: winLeafId, type: 'p2' });
          }
        } else {
          const nextTier = curr.tier + 1;
          const childId = `t${nextTier}_${next.p1[0]}${next.p1[1]}_${next.p2[0]}${next.p2[1]}`;

          const edgeId = `${curr.id}->${childId}`;
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            edges.push({ id: edgeId, source: curr.id, target: childId, type: 'p2' });
          }

          if (!nodesMap.has(childId)) {
            nodesMap.set(childId, {
              id: childId,
              label: `[${next.p1[0]},${next.p1[1]}] vs [${next.p2[0]},${next.p2[1]}]`,
              subLabel: `Ply ${nextTier}`,
              tier: nextTier,
              baseX: 0.5,
              baseY: nextTier / MAX_TIER,
              x: 0,
              y: 0,
              isAi: true,
              p1: next.p1,
              p2: next.p2,
              desc: `AI counter: You [${next.p1[0]}, ${next.p1[1]}] vs AI [${next.p2[0]}, ${next.p2[1]}]`,
            });

            queue.push({ p1: next.p1, p2: next.p2, tier: nextTier, id: childId });
          }
        }
      }
    }
  }

  const allNodes = Array.from(nodesMap.values());
  const tierMap = new Map<number, VisNode[]>();
  for (const n of allNodes) {
    if (!tierMap.has(n.tier)) tierMap.set(n.tier, []);
    tierMap.get(n.tier)!.push(n);
  }

  for (const [tier, nodes] of tierMap.entries()) {
    if (tier === 0 || tier === MAX_TIER) {
      nodes[0].baseX = 0.5;
      continue;
    }

    nodes.sort((a, b) => {
      const aVal = a.p2[0] * 100 + a.p2[1] * 10 + a.p1[0] * 2 + a.p1[1];
      const bVal = b.p2[0] * 100 + b.p2[1] * 10 + b.p1[0] * 2 + b.p1[1];
      return aVal - bVal;
    });

    const count = nodes.length;
    nodes.forEach((node, idx) => {
      node.baseX = count === 1 ? 0.5 : (idx + 0.5) / count;
    });
  }

  return { nodes: allNodes, edges, nodesMap, tierMap };
}

const STATIC_GRAPH = buildChopsticksWeakTree();

export function ChopsticksTreeVisualizer({
  currentState,
  currentPly,
}: ChopsticksTreeVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<VisNode | null>(null);
  const [visitedPath, setVisitedPath] = useState<string[]>(['root_11_11']);

  const currentActiveId = useMemo(() => {
    if (isDead(currentState.p1)) return 'win_leaf';
    if (currentPly === 0) return 'root_11_11';

    const exactId = `t${currentPly}_${currentState.p1[0]}${currentState.p1[1]}_${currentState.p2[0]}${currentState.p2[1]}`;
    if (STATIC_GRAPH.nodesMap.has(exactId)) return exactId;

    const match = STATIC_GRAPH.nodes.find(
      (n) =>
        n.p1[0] === currentState.p1[0] &&
        n.p1[1] === currentState.p1[1] &&
        n.p2[0] === currentState.p2[0] &&
        n.p2[1] === currentState.p2[1] &&
        Math.abs(n.tier - currentPly) <= 1
    );
    return match ? match.id : 'root_11_11';
  }, [currentState, currentPly]);

  useEffect(() => {
    if (currentPly === 0) {
      setVisitedPath(['root_11_11']);
      return;
    }

    setVisitedPath((prev) => {
      if (prev.length > currentPly && prev[currentPly] === currentActiveId) return prev;
      const next = prev.slice(0, currentPly);
      if (next.length === 0) next.push('root_11_11');
      next[currentPly] = currentActiveId;
      return next;
    });
  }, [currentActiveId, currentPly]);

  const activeEdgeIds = useMemo(() => {
    const edgeSet = new Set<string>();
    for (let i = 0; i < visitedPath.length - 1; i++) {
      const u = visitedPath[i];
      const v = visitedPath[i + 1];
      if (u && v && u !== v) edgeSet.add(`${u}->${v}`);
    }
    return edgeSet;
  }, [visitedPath]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth || 560;
    const height = container.clientHeight || 620;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const padLeft = 145;
    const padRight = 40;
    const padTop = 75;
    const padBottom = 45;

    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    ctx.fillStyle = '#101217';
    ctx.fillRect(0, 0, width, height);

    // Guide lines: Blue for player strikes, Red for AI invariants
    for (let t = 0; t <= MAX_TIER; t++) {
      const y = padTop + (t / MAX_TIER) * innerH;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft - 10, y);
      ctx.lineTo(width - padRight + 10, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle =
        t === MAX_TIER
          ? 'rgba(16, 185, 129, 0.9)'
          : t % 2 === 1
          ? 'rgba(56, 189, 248, 0.85)'
          : 'rgba(244, 63, 94, 0.85)';
      ctx.textAlign = 'right';
      ctx.fillText(TIER_LABELS[t] || `Ply ${t}`, padLeft - 18, y + 3);
    }

    for (const node of STATIC_GRAPH.nodes) {
      node.x = padLeft + node.baseX * innerW;
      node.y = padTop + node.baseY * innerH;
    }

    // Inactive filaments
    for (const edge of STATIC_GRAPH.edges) {
      if (activeEdgeIds.has(edge.id)) continue;
      const s = STATIC_GRAPH.nodesMap.get(edge.source);
      const t = STATIC_GRAPH.nodesMap.get(edge.target);
      if (!s || !t) continue;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 0.85;
      ctx.stroke();
    }

    // Active highlighted edges: Blue for Human (p1), Red for AI (p2)
    for (const edge of STATIC_GRAPH.edges) {
      if (!activeEdgeIds.has(edge.id)) continue;
      const s = STATIC_GRAPH.nodesMap.get(edge.source);
      const t = STATIC_GRAPH.nodesMap.get(edge.target);
      if (!s || !t) continue;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = edge.type === 'p1' ? '#38bdf8' : '#f43f5e';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // Nodes: Blue for Human, Red for AI
    for (const node of STATIC_GRAPH.nodes) {
      const isActive = node.id === currentActiveId;
      const isHovered = hoveredNode?.id === node.id;
      const tierCount = STATIC_GRAPH.tierMap.get(node.tier)?.length || 1;
      const isDenseTier = tierCount > 4;

      if (node.isLeaf) {
        const r = isActive || isHovered ? 6 : 4.5;
        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.restore();

        ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#10b981';
        ctx.fillText(isActive || isHovered ? `[${node.label}]` : node.label, node.x, node.y + 15);
      } else {
        const r = isActive || isHovered ? 5 : 3.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.isAi ? '#f43f5e' : '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = node.isAi ? '#9f1239' : '#0284c7';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';

        if (isActive) {
          ctx.fillStyle = '#f4f4f5';
          ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillText(`[${node.label}]`, node.x, node.y - 12);
        } else if (isHovered) {
          ctx.fillStyle = '#e4e4e7';
          ctx.fillText(`[${node.label}]`, node.x, node.y - 10);
        } else if (isDenseTier) {
          ctx.fillStyle = 'rgba(161, 161, 170, 0.45)';
          const compact = `${node.p1[0]}${node.p1[1]}:${node.p2[0]}${node.p2[1]}`;
          ctx.fillText(compact, node.x, node.y + 11);
        } else {
          ctx.fillStyle = 'rgba(161, 161, 170, 0.45)';
          ctx.fillText(node.label, node.x, node.y + 12);
        }
      }
    }

    // Precise geometric target reticle
    const activeNode = STATIC_GRAPH.nodesMap.get(currentActiveId);
    if (activeNode) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(activeNode.x, activeNode.y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(activeNode.x, activeNode.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }, [currentActiveId, activeEdgeIds, hoveredNode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  useEffect(() => {
    render();
  }, [render]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const found = STATIC_GRAPH.nodes.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return dx * dx + dy * dy < 225;
    });

    if (found?.id !== hoveredNode?.id) {
      setHoveredNode(found || null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[580px] rounded-2xl overflow-hidden border border-zinc-800/80 bg-[#101217] shadow-xl shadow-black/40 flex flex-col select-none"
    >
      <div className="absolute top-4 left-5 z-10 flex flex-col gap-1.5 pointer-events-none">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-semibold">
          Weak Solution Strategy Tree (Chopsticks)
        </span>
        <div className="flex items-center gap-3.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800/80 backdrop-blur-md">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> Player Strikes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> AI Invariant
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 rotate-45" /> Win Leaf
          </span>
        </div>
      </div>

      {hoveredNode && (
        <div className="absolute bottom-3 right-4 z-10 bg-zinc-900/95 border border-zinc-700/80 px-3 py-1.5 rounded-lg font-mono text-xs text-zinc-200 pointer-events-none backdrop-blur-md shadow-lg">
          {hoveredNode.isLeaf ? (
            <span className="text-emerald-400 font-semibold">
              State: [Win Leaf] | Forced Knockout Reached
            </span>
          ) : (
            <>
              Hands: <span className="text-sky-300 font-medium">[{hoveredNode.label}]</span> | Ply: {hoveredNode.tier} ({hoveredNode.desc})
            </>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        className="w-full h-full block cursor-crosshair flex-1"
      />
    </div>
  );
}