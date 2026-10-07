import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { getBestNimMove } from '../../solvers/nim';

interface GraphNode {
  id: string;
  heaps: number[];
  depth: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  isLeaf?: boolean;
  label?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'p1' | 'p2';
}

const LEAF_ID = 'leaf_terminal_000';

function toKey(heaps: number[]): string {
  return heaps.join('-');
}

function buildHierarchicalWeakGraph(startHeaps = [3, 4, 5]) {
  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeIdSet = new Set<string>();
  const layersMap = new Map<number, string[]>();

  const addEdge = (source: string, target: string, type: 'p1' | 'p2') => {
    const edgeId = `${source}->${target}`;
    if (!edgeIdSet.has(edgeId)) {
      edgeIdSet.add(edgeId);
      edges.push({ id: edgeId, source, target, type });
    }
  };

  const rootKey = toKey(startHeaps);
  const queue: { key: string; heaps: number[]; depth: number }[] = [
    { key: rootKey, heaps: [...startHeaps], depth: 0 },
  ];

  nodesMap.set(rootKey, {
    id: rootKey,
    heaps: [...startHeaps],
    depth: 0,
    x: 0,
    y: 0,
    baseX: 0,
    baseY: 0,
  });
  layersMap.set(0, [rootKey]);

  const visited = new Set<string>([rootKey]);
  const terminalTransitions: { source: string; type: 'p1' | 'p2' }[] = [];

  while (queue.length > 0) {
    const { key: currKey, heaps, depth } = queue.shift()!;

    const aiMove = getBestNimMove(heaps);
    if (!aiMove) continue;

    const afterAi = [...heaps];
    afterAi[aiMove.heapIdx] -= aiMove.take;
    const isTerminal = afterAi.every((h) => h === 0);

    if (isTerminal) {
      terminalTransitions.push({ source: currKey, type: 'p1' });
      continue;
    }

    const aiKey = toKey(afterAi);
    const aiDepth = depth + 1;

    addEdge(currKey, aiKey, 'p1');

    if (!nodesMap.has(aiKey)) {
      nodesMap.set(aiKey, {
        id: aiKey,
        heaps: [...afterAi],
        depth: aiDepth,
        x: 0,
        y: 0,
        baseX: 0,
        baseY: 0,
      });
      if (!layersMap.has(aiDepth)) layersMap.set(aiDepth, []);
      layersMap.get(aiDepth)!.push(aiKey);
    }

    if (!visited.has(aiKey)) {
      visited.add(aiKey);

      for (let i = 0; i < afterAi.length; i++) {
        for (let take = 1; take <= afterAi[i]; take++) {
          const afterHuman = [...afterAi];
          afterHuman[i] -= take;
          const humanTerminal = afterHuman.every((h) => h === 0);

          if (humanTerminal) {
            terminalTransitions.push({ source: aiKey, type: 'p2' });
            continue;
          }

          const humanKey = toKey(afterHuman);
          const humanDepth = aiDepth + 1;

          addEdge(aiKey, humanKey, 'p2');

          if (!nodesMap.has(humanKey)) {
            nodesMap.set(humanKey, {
              id: humanKey,
              heaps: [...afterHuman],
              depth: humanDepth,
              x: 0,
              y: 0,
              baseX: 0,
              baseY: 0,
            });
            if (!layersMap.has(humanDepth)) layersMap.set(humanDepth, []);
            layersMap.get(humanDepth)!.push(humanKey);
          }

          if (!visited.has(humanKey)) {
            visited.add(humanKey);
            queue.push({ key: humanKey, heaps: afterHuman, depth: humanDepth });
          }
        }
      }
    }
  }

  const maxIntermediateDepth = Math.max(...Array.from(layersMap.keys()));
  const leafDepth = maxIntermediateDepth + 1;

  const leafNode: GraphNode = {
    id: LEAF_ID,
    heaps: [0, 0, 0],
    depth: leafDepth,
    x: 0,
    y: 0,
    baseX: 0.5,
    baseY: 1.0,
    isLeaf: true,
    label: '0·0·0',
  };
  nodesMap.set(LEAF_ID, leafNode);
  layersMap.set(leafDepth, [LEAF_ID]);

  for (const trans of terminalTransitions) {
    addEdge(trans.source, LEAF_ID, trans.type);
  }

  layersMap.forEach((nodeKeys, depth) => {
    const layerY = depth / leafDepth;
    const count = nodeKeys.length;

    nodeKeys.forEach((key, idx) => {
      const node = nodesMap.get(key)!;
      const layerX = count === 1 ? 0.5 : (idx + 0.5) / count;
      node.baseX = layerX;
      node.baseY = layerY;
      node.x = layerX;
      node.y = layerY;
    });
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
    nodesMap,
    maxDepth: leafDepth,
  };
}

const STATIC_NIM_GRAPH = buildHierarchicalWeakGraph([3, 4, 5]);

function findBfsPath(rootKey: string, targetKey: string, edges: GraphEdge[]): string[] {
  if (rootKey === targetKey) return [rootKey];

  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  const parentMap = new Map<string, string>();
  const queue = [rootKey];
  const visited = new Set<string>([rootKey]);

  let found = false;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === targetKey) {
      found = true;
      break;
    }
    const nextList = adj.get(curr) || [];
    for (const next of nextList) {
      if (!visited.has(next)) {
        visited.add(next);
        parentMap.set(next, curr);
        queue.push(next);
      }
    }
  }

  if (!found) return [rootKey];

  const path: string[] = [];
  let curr: string | undefined = targetKey;
  while (curr) {
    path.unshift(curr);
    if (curr === rootKey) break;
    curr = parentMap.get(curr);
  }
  return path;
}

interface NimTreeVisualizerProps {
  currentHeaps: number[];
  history?: number[][];
}

export function NimTreeVisualizer({ currentHeaps, history }: NimTreeVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  const rootKey = toKey([3, 4, 5]);
  const isTerminalState = currentHeaps.every((h) => h === 0);
  const currentKey = isTerminalState ? LEAF_ID : toKey(currentHeaps);
  const historyRef = useRef<string[]>([rootKey]);

  const activeEdgeIds = useMemo(() => {
    const edgeIds = new Set<string>();
    let pathKeys: string[] = [];

    if (history && history.length > 0) {
      pathKeys = history.map((h) => (h.every((x) => x === 0) ? LEAF_ID : toKey(h)));
      if (isTerminalState && pathKeys[pathKeys.length - 1] !== LEAF_ID) {
        pathKeys.push(LEAF_ID);
      }
    } else {
      if (currentKey === rootKey) {
        historyRef.current = [rootKey];
        pathKeys = [rootKey];
      } else {
        const existingIdx = historyRef.current.indexOf(currentKey);
        if (existingIdx !== -1) {
          historyRef.current = historyRef.current.slice(0, existingIdx + 1);
          pathKeys = historyRef.current;
        } else {
          const lastKey = historyRef.current[historyRef.current.length - 1];
          const isDirectChild = STATIC_NIM_GRAPH.edges.some(
            (e) => e.source === lastKey && e.target === currentKey
          );

          if (isDirectChild) {
            historyRef.current.push(currentKey);
            pathKeys = historyRef.current;
          } else {
            pathKeys = findBfsPath(rootKey, currentKey, STATIC_NIM_GRAPH.edges);
            historyRef.current = pathKeys;
          }
        }
      }
    }

    for (let i = 0; i < pathKeys.length - 1; i++) {
      edgeIds.add(`${pathKeys[i]}->${pathKeys[i + 1]}`);
    }

    return edgeIds;
  }, [currentKey, isTerminalState, history, rootKey]);

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

    const totalTiers = STATIC_NIM_GRAPH.maxDepth;

    const tierLabels: Record<number, string> = {
      0: 'Start (3-4-5)',
      1: 'AI Opening',
      2: 'Your Moves (Ply 2)',
      3: 'AI Invariant (Ply 3)',
      4: 'Your Moves (Ply 4)',
      5: 'AI Invariant (Ply 5)',
      6: 'Your Moves (Ply 6)',
    };

    // Guide lines: Blue for human moves, Red for AI invariants
    for (let d = 0; d <= totalTiers; d++) {
      const y = padTop + (d / totalTiers) * innerH;

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
        d === totalTiers
          ? '#10b981'
          : d % 2 === 1
          ? 'rgba(244, 63, 94, 0.85)'
          : 'rgba(56, 189, 248, 0.85)';
      ctx.textAlign = 'right';

      const label =
        d === totalTiers
          ? 'Terminal (0-0-0)'
          : tierLabels[d] || `Ply ${d}`;
      ctx.fillText(label, padLeft - 18, y + 3);
    }

    for (const node of STATIC_NIM_GRAPH.nodes) {
      node.x = padLeft + node.baseX * innerW;
      node.y = padTop + node.baseY * innerH;
    }

    // Inactive filaments
    for (const edge of STATIC_NIM_GRAPH.edges) {
      if (activeEdgeIds.has(edge.id)) continue;
      const s = STATIC_NIM_GRAPH.nodesMap.get(edge.source);
      const tgt = STATIC_NIM_GRAPH.nodesMap.get(edge.target);
      if (!s || !tgt) continue;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 0.85;
      ctx.stroke();
    }

    // Active branches: Blue for Human (p2), Red for AI (p1)
    for (const edge of STATIC_NIM_GRAPH.edges) {
      if (!activeEdgeIds.has(edge.id)) continue;
      const s = STATIC_NIM_GRAPH.nodesMap.get(edge.source);
      const tgt = STATIC_NIM_GRAPH.nodesMap.get(edge.target);
      if (!s || !tgt) continue;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = edge.type === 'p1' ? '#f43f5e' : '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // Nodes: Blue for Human (even depth), Red for AI (odd depth)
    for (const node of STATIC_NIM_GRAPH.nodes) {
      const isActive = node.id === currentKey;
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
        ctx.fillStyle = node.depth % 2 === 0 ? '#38bdf8' : '#f43f5e';
        ctx.fill();
        ctx.strokeStyle = node.depth % 2 === 0 ? '#0284c7' : '#9f1239';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const label = node.isLeaf ? (node.label ?? '0·0·0') : node.heaps.join('·');
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';

      if (isActive) {
        ctx.fillStyle = '#f4f4f5';
        ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(`[${label}]`, node.x, node.y - 12);
      } else if (isHovered) {
        ctx.fillStyle = '#e4e4e7';
        ctx.fillText(`[${label}]`, node.x, node.y - 10);
      } else {
        ctx.fillStyle = node.isLeaf
          ? 'rgba(16, 185, 129, 0.85)'
          : 'rgba(161, 161, 170, 0.45)';
        ctx.fillText(label, node.x, node.y + 12);
      }
    }

    // Precise geometric target reticle
    const active = STATIC_NIM_GRAPH.nodesMap.get(currentKey);
    if (active) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(active.x, active.y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(active.x, active.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }, [currentKey, activeEdgeIds, hoveredNode]);

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

    const found = STATIC_NIM_GRAPH.nodes.find((n) => {
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
      <div className="absolute top-4 left-5 z-10 flex flex-col gap-1.5 pointer-events-none">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-semibold">
          Weak Solution Strategy Tree (Nim 3-4-5)
        </span>
        <div className="flex items-center gap-3.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800/80 backdrop-blur-md">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> Your Moves (Human)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> AI Invariant
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 rotate-45" /> Terminal (0-0-0)
          </span>
        </div>
      </div>

      {hoveredNode && (
        <div className="absolute bottom-3 right-4 z-10 bg-zinc-900/95 border border-zinc-700/80 px-3 py-1.5 rounded-lg font-mono text-xs text-zinc-200 pointer-events-none backdrop-blur-md shadow-lg">
          {hoveredNode.isLeaf ? (
            <span>
              State: <span className="text-emerald-400 font-medium">[0, 0, 0]</span> | Terminal Victory Reached
            </span>
          ) : (
            <span>
              State: <span className="text-sky-300 font-medium">[{hoveredNode.heaps.join(', ')}]</span> | Ply:{' '}
              {hoveredNode.depth}
            </span>
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