import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

interface VisNode {
  id: string;
  label: string;
  tier: number;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  isAi: boolean;
  isLeaf?: boolean;
  desc: string;
}

interface VisEdge {
  source: string;
  target: string;
  type: 'p1' | 'p2';
  id: string;
}

const MAX_TIER = 5;

const TIER_LABELS: Record<number, string> = {
  0: 'AI Opening (Col 4)',
  1: 'Your Replies (1-7)',
  2: 'AI Invariants (Ply 2)',
  3: 'Your Replies (Ply 3)',
  4: 'AI Invariants (Ply 4)',
  5: 'Steady-State Leaf',
};

const INVARIANT_DEFS = [
  { key: 'wing5', label: 'Wing 5', baseX: 0.28, desc: 'AI Invariant Wing 5' },
  { key: 'center4', label: 'Center 4', baseX: 0.50, desc: 'AI Invariant Center 4' },
  { key: 'wing3', label: 'Wing 3', baseX: 0.72, desc: 'AI Invariant Wing 3' },
] as const;

function buildStaticWeakC4Graph() {
  const nodesMap = new Map<string, VisNode>();
  const edges: VisEdge[] = [];

  nodesMap.set('root_4', {
    id: 'root_4',
    label: 'AI: 4',
    tier: 0,
    baseX: 0.5,
    baseY: 0,
    x: 0,
    y: 0,
    isAi: true,
    desc: 'WeakC4 Root: Center Column 4',
  });

  const addInvariants = (tier: 2 | 4, prefix: 't2' | 't4') => {
    return INVARIANT_DEFS.map((inv) => {
      const id = `${prefix}_inv_${inv.key}`;
      const node: VisNode = {
        id,
        label: inv.label,
        tier,
        baseX: inv.baseX,
        baseY: tier / MAX_TIER,
        x: 0,
        y: 0,
        isAi: true,
        desc: inv.desc,
      };
      nodesMap.set(id, node);
      return id;
    });
  };

  const addReplies = (tier: 1 | 3, prefix: 't1' | 't3') => {
    const ids: string[] = [];
    for (let c = 1; c <= 7; c++) {
      const id = `${prefix}_col_${c}`;
      nodesMap.set(id, {
        id,
        label: `Col ${c}`,
        tier,
        baseX: (c - 0.5) / 7.0,
        baseY: tier / MAX_TIER,
        x: 0,
        y: 0,
        isAi: false,
        desc: `Ply ${tier}: Your reply in Column ${c}`,
      });
      ids.push(id);
    }
    return ids;
  };

  const t1Ids = addReplies(1, 't1');
  for (const id of t1Ids) {
    edges.push({ id: `root_4->${id}`, source: 'root_4', target: id, type: 'p2' });
  }

  const t2Ids = addInvariants(2, 't2');
  for (const sId of t1Ids) {
    for (const tId of t2Ids) {
      edges.push({ id: `${sId}->${tId}`, source: sId, target: tId, type: 'p1' });
    }
  }

  const t3Ids = addReplies(3, 't3');
  for (const sId of t2Ids) {
    for (const tId of t3Ids) {
      edges.push({ id: `${sId}->${tId}`, source: sId, target: tId, type: 'p2' });
    }
  }

  const t4Ids = addInvariants(4, 't4');
  for (const sId of t3Ids) {
    for (const tId of t4Ids) {
      edges.push({ id: `${sId}->${tId}`, source: sId, target: tId, type: 'p1' });
    }
  }

  const leafId = 't5_ss_leaf';
  nodesMap.set(leafId, {
    id: leafId,
    label: 'SS Leaf',
    tier: 5,
    baseX: 0.5,
    baseY: 1.0,
    x: 0,
    y: 0,
    isAi: true,
    isLeaf: true,
    desc: 'WeakC4 14-Level Steady-State Leaf Reached',
  });

  for (const sId of t4Ids) {
    edges.push({ id: `${sId}->${leafId}`, source: sId, target: leafId, type: 'p1' });
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
    nodesMap,
  };
}

const STATIC_GRAPH = buildStaticWeakC4Graph();

function mapColToInvariant(col: number, tierPrefix: 't2' | 't4'): string {
  if (col === 4) return `${tierPrefix}_inv_center4`;
  if (col === 1 || col === 2 || col === 5) return `${tierPrefix}_inv_wing5`;
  return `${tierPrefix}_inv_wing3`;
}

function getActivePath(history: string) {
  const activeEdgeIds = new Set<string>();
  const moves = history ? history.split('').map(Number) : [];
  const depth = moves.length;

  let currentActiveId = 'root_4';

  if (depth >= 2) {
    const t1Id = `t1_col_${moves[1]}`;
    activeEdgeIds.add(`root_4->${t1Id}`);
    currentActiveId = t1Id;

    if (depth >= 3) {
      const t2Id = mapColToInvariant(moves[2], 't2');
      activeEdgeIds.add(`${t1Id}->${t2Id}`);
      currentActiveId = t2Id;

      if (depth >= 4) {
        const t3Id = `t3_col_${moves[3]}`;
        activeEdgeIds.add(`${t2Id}->${t3Id}`);
        currentActiveId = t3Id;

        if (depth >= 5) {
          const t4Id = mapColToInvariant(moves[4], 't4');
          activeEdgeIds.add(`${t3Id}->${t4Id}`);
          currentActiveId = t4Id;

          if (depth >= 6) {
            const leafId = 't5_ss_leaf';
            activeEdgeIds.add(`${t4Id}->${leafId}`);
            currentActiveId = leafId;
          }
        }
      }
    }
  }

  return { currentActiveId, activeEdgeIds };
}

export function Connect4TreeVisualizer({ currentHistory }: { currentHistory: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<VisNode | null>(null);

  const { currentActiveId, activeEdgeIds } = useMemo(
    () => getActivePath(currentHistory),
    [currentHistory]
  );

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

    // Guide lines: Blue for human replies, Red for AI invariants
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
      ctx.fillStyle = t % 2 === 1 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(244, 63, 94, 0.85)';
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

    // Active crisp branches: Blue for Human (p2), Red for AI (p1)
    for (const edge of STATIC_GRAPH.edges) {
      if (!activeEdgeIds.has(edge.id)) continue;
      const s = STATIC_GRAPH.nodesMap.get(edge.source);
      const t = STATIC_GRAPH.nodesMap.get(edge.target);
      if (!s || !t) continue;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = edge.type === 'p1' ? '#f43f5e' : '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // Nodes: Blue for Human, Red for AI
    for (const node of STATIC_GRAPH.nodes) {
      const isActive = node.id === currentActiveId;
      const isHovered = hoveredNode?.id === node.id;

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
      } else {
        const r = isActive || isHovered ? 5 : 3.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.isAi ? '#f43f5e' : '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = node.isAi ? '#9f1239' : '#0284c7';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';

      if (isActive) {
        ctx.fillStyle = '#f4f4f5';
        ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(`[${node.label}]`, node.x, node.y - 12);
      } else if (isHovered) {
        ctx.fillStyle = '#e4e4e7';
        ctx.fillText(`[${node.label}]`, node.x, node.y - 10);
      } else {
        ctx.fillStyle = 'rgba(161, 161, 170, 0.45)';
        ctx.fillText(node.label, node.x, node.y + 12);
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
      return dx * dx + dy * dy < 196;
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
      {/* Top Header & Legend */}
      <div className="absolute top-4 left-5 z-10 flex flex-col gap-1.5 pointer-events-none">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-semibold">
          Weak Solution Strategy Tree (Connect 4)
        </span>
        <div className="flex items-center gap-3.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800/80 backdrop-blur-md">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> Your Replies (Human)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> AI Invariant
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 rotate-45" /> Steady-State Leaf
          </span>
        </div>
      </div>

      {hoveredNode && (
        <div className="absolute bottom-3 right-4 z-10 bg-zinc-900/95 border border-zinc-700/80 px-3 py-1.5 rounded-lg font-mono text-xs text-zinc-200 pointer-events-none backdrop-blur-md shadow-lg">
          State: <span className="text-sky-300 font-medium">[{hoveredNode.label}]</span> | Tier: {hoveredNode.tier} ({hoveredNode.desc})
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