import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import type { GraphNode, GraphEdge, ImpactAnalysisResult, NodeType } from "@repomind/shared-types";

interface Position {
  x: number;
  y: number;
}

interface InteractiveGraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  impactResult: ImpactAnalysisResult | null;
  onSelectNode: (node: GraphNode) => void;
  onSelectEdge?: (edge: GraphEdge) => void;
  filterType?: string;
  searchQuery?: string;
  level?: 1 | 2 | 3 | 4;
  onChangeLevel?: (level: 1 | 2 | 3 | 4) => void;
  direction?: "both" | "upstream" | "downstream";
  onChangeDirection?: (direction: "both" | "upstream" | "downstream") => void;
  depth?: number;
  onChangeDepth?: (depth: number) => void;
}

export const InteractiveGraphCanvas: React.FC<InteractiveGraphCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  impactResult,
  onSelectNode,
  onSelectEdge,
  filterType = "all",
  searchQuery = "",
  level: _level = 3,
  onChangeLevel: _onChangeLevel,
  direction = "both",
  onChangeDirection,
  depth = 1,
  onChangeDepth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });

  // Hover state for interactive neighborhood highlighting
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverTooltipPos, setHoverTooltipPos] = useState<Position | null>(null);

  // Dragging individual nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  // Node Positions (hierarchical grid layout with deterministic clustering)
  const [nodePositions, setNodePositions] = useState<Map<string, Position>>(new Map());

  // Derive connected nodes & edges for hovered or selected node
  const { connectedNodeIds, connectedEdgeKeys } = useMemo(() => {
    const focusId = hoveredNodeId || selectedNodeId;
    if (!focusId) return { connectedNodeIds: new Set<string>(), connectedEdgeKeys: new Set<string>() };

    const nodeIds = new Set<string>([focusId]);
    const edgeKeys = new Set<string>();

    for (const e of edges) {
      if (e.source === focusId) {
        nodeIds.add(e.target);
        edgeKeys.add(`${e.source}->${e.target}`);
      } else if (e.target === focusId) {
        nodeIds.add(e.source);
        edgeKeys.add(`${e.source}->${e.target}`);
      }
    }

    return { connectedNodeIds: nodeIds, connectedEdgeKeys: edgeKeys };
  }, [hoveredNodeId, selectedNodeId, edges]);

  // Derive Impacted Node ID Severity Map
  const impactSeverityMap = useMemo(() => {
    const map = new Map<string, "TARGET" | "HIGH" | "MEDIUM" | "LOW">();
    if (!impactResult) return map;

    map.set(impactResult.targetNode.id, "TARGET");
    for (const e of impactResult.highImpact) map.set(e.id, "HIGH");
    for (const e of impactResult.mediumImpact) map.set(e.id, "MEDIUM");
    for (const e of impactResult.lowImpact) map.set(e.id, "LOW");

    return map;
  }, [impactResult]);

  // Initialize and cluster node positions with balanced multi-row grid layout
  useEffect(() => {
    if (nodes.length === 0) return;

    const newPos = new Map<string, Position>();

    // Semantic hierarchy: API/Routers (0) -> Controllers (1) -> Services (2) -> Models/Components (3) -> Tests (4)
    const layerOrder: Record<NodeType, number> = {
      router: 0,
      endpoint: 0,
      controller: 1,
      view: 1,
      service: 2,
      component: 2,
      module: 2,
      model: 3,
      util: 3,
      symbol: 3,
      test: 4,
    };

    const layerBuckets: Record<number, GraphNode[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    for (const n of nodes) {
      const l = layerOrder[n.type] ?? 2;
      layerBuckets[l].push(n);
    }

    const colSpacing = 240;
    const subRowSpacing = 90;
    const tierSpacing = 75;
    const maxCols = 5; // Wrap cleanly after 5 nodes to avoid endless horizontal sprawl

    let currentY = 80;

    [0, 1, 2, 3, 4].forEach((layerIdx) => {
      const bucket = layerBuckets[layerIdx];
      if (!bucket || bucket.length === 0) return;

      const numRows = Math.ceil(bucket.length / maxCols);

      bucket.forEach((node, idx) => {
        const rowInTier = Math.floor(idx / maxCols);
        const colInTier = idx % maxCols;

        // Symmetrically center each row
        const itemsInThisRow =
          rowInTier === numRows - 1 && bucket.length % maxCols !== 0
            ? bucket.length % maxCols
            : maxCols;
        const rowStartX = 120 + ((maxCols - itemsInThisRow) * colSpacing) / 2;

        const x = rowStartX + colInTier * colSpacing;
        const y = currentY + rowInTier * subRowSpacing;

        newPos.set(node.id, { x, y });
      });

      currentY += numRows * subRowSpacing + tierSpacing;
    });

    setNodePositions(newPos);
  }, [nodes]);

  // Dynamic Bounding Box Centering & Auto-fit
  const fitToScreen = useCallback(() => {
    if (nodes.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    nodePositions.forEach((pos) => {
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    });

    if (minX === Infinity || !isFinite(minX)) {
      setZoom(0.9);
      setPan({ x: 80, y: 50 });
      return;
    }

    const graphWidth = maxX - minX + 260;
    const graphHeight = maxY - minY + 150;

    const scaleX = (rect.width - 60) / graphWidth;
    const scaleY = (rect.height - 60) / graphHeight;
    const optimalZoom = Math.min(1.05, Math.max(0.85, Math.min(scaleX, scaleY)));

    setZoom(optimalZoom);
    setPan({
      x: (rect.width - graphWidth * optimalZoom) / 2 - minX * optimalZoom + 120 * optimalZoom,
      y: (rect.height - graphHeight * optimalZoom) / 2 - minY * optimalZoom + 60 * optimalZoom,
    });
  }, [nodes.length, nodePositions]);

  // Initial fit
  useEffect(() => {
    if (nodePositions.size > 0) {
      fitToScreen();
    }
  }, [nodePositions, fitToScreen]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1);
    fitToScreen();
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.max(0.3, Math.min(2.5, z + delta)));
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as HTMLElement).tagName === "svg") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggingNodeId) {
      const currentPos = nodePositions.get(draggingNodeId);
      if (currentPos) {
        const newX = (e.clientX - pan.x) / zoom - dragOffset.x;
        const newY = (e.clientY - pan.y) / zoom - dragOffset.y;
        setNodePositions((prev) => {
          const next = new Map(prev);
          next.set(draggingNodeId, { x: newX, y: newY });
          return next;
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag start
  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    const pos = nodePositions.get(nodeId) || { x: 0, y: 0 };
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - pos.x,
      y: (e.clientY - pan.y) / zoom - pos.y,
    });
  };

  // Filter nodes according to filterType and search
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (filterType !== "all" && n.type !== filterType) {
        if (filterType === "test" && !n.isTest) return false;
        if (filterType !== "test" && n.type !== filterType) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q);
      }
      return true;
    });
  }, [nodes, filterType, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // UI UX Pro Max Node Palette: High-contrast Obsidian Surface with Semantic Indicators
  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case "router":
      case "endpoint":
        return { bg: "#0D1424", stroke: "#06B6D4", text: "#67E8F9", badge: "API", dot: "#06B6D4" };
      case "controller":
        return { bg: "#0D1424", stroke: "#3B82F6", text: "#93C5FD", badge: "CTRL", dot: "#3B82F6" };
      case "service":
        return { bg: "#0D1424", stroke: "#6366F1", text: "#A5B4FC", badge: "SVC", dot: "#6366F1" };
      case "model":
        return { bg: "#0D1424", stroke: "#F59E0B", text: "#FCD34D", badge: "MODEL", dot: "#F59E0B" };
      case "component":
      case "view":
        return { bg: "#0D1424", stroke: "#A855F7", text: "#D8B4FE", badge: "JSX", dot: "#A855F7" };
      case "test":
        return { bg: "#0D1424", stroke: "#10B981", text: "#6EE7B7", badge: "TEST", dot: "#10B981" };
      case "util":
      case "module":
      default:
        return { bg: "#0D1424", stroke: "#64748B", text: "#CBD5E1", badge: "UTIL", dot: "#64748B" };
    }
  };

  const hoveredNode = hoveredNodeId ? nodes.find((n) => n.id === hoveredNodeId) : null;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full bg-[#080C14] select-none overflow-hidden cursor-grab active:cursor-grabbing border border-white/[0.08] rounded-xl"
    >
      {/* Background Grid Dots */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <pattern id="graph-grid-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#6366f1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#graph-grid-dots)" />
      </svg>

      {/* Interactive Canvas Transform Layer */}
      <svg className="w-full h-full overflow-visible">
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <defs>
            {/* Arrowhead Markers */}
            <marker
              id="arrowhead-default"
              markerWidth="8"
              markerHeight="8"
              refX="18"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill="#475569" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="10"
              markerHeight="10"
              refX="18"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#818cf8" />
            </marker>
            <marker
              id="arrowhead-api"
              markerWidth="10"
              markerHeight="10"
              refX="18"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#06b6d4" />
            </marker>
            <marker
              id="arrowhead-component"
              markerWidth="10"
              markerHeight="10"
              refX="18"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#a855f7" />
            </marker>
            <marker
              id="arrowhead-test"
              markerWidth="10"
              markerHeight="10"
              refX="18"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#10b981" />
            </marker>
            <marker
              id="arrowhead-db"
              markerWidth="10"
              markerHeight="10"
              refX="18"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#f59e0b" />
            </marker>
            <marker
              id="arrowhead-impact-high"
              markerWidth="10"
              markerHeight="10"
              refX="18"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#ef4444" />
            </marker>
          </defs>

          {/* 1. RENDER EDGES */}
          {edges.map((edge, idx) => {
            const sourcePos = nodePositions.get(edge.source);
            const targetPos = nodePositions.get(edge.target);
            if (!sourcePos || !targetPos) return null;

            if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) return null;

            const edgeKey = `${edge.source}->${edge.target}`;
            const isConnected = connectedEdgeKeys.has(edgeKey);
            const hasFocus = Boolean(hoveredNodeId || selectedNodeId);

            // Impact Edge Coloring
            const targetSeverity = impactSeverityMap.get(edge.target);
            const isImpactedEdge = targetSeverity === "HIGH" || targetSeverity === "TARGET";

            // Bezier curve path
            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const cx1 = sourcePos.x + dx * 0.25;
            const cy1 = sourcePos.y + dy * 0.75;
            const cx2 = sourcePos.x + dx * 0.75;
            const cy2 = sourcePos.y + dy * 0.25;
            const pathD = `M ${sourcePos.x} ${sourcePos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetPos.x} ${targetPos.y}`;

            // Semantic relationship edge styling
            let strokeColor = "#334155";
            let strokeWidth = 1.2;
            let strokeDasharray: string | undefined = undefined;
            let markerId = "url(#arrowhead-default)";

            if (isImpactedEdge) {
              strokeColor = "#EF4444";
              strokeWidth = 2.5;
              markerId = "url(#arrowhead-impact-high)";
            } else if (isConnected) {
              strokeWidth = 2.2;
              switch (edge.type) {
                case "API_CALLS":
                case "API_HANDLED_BY":
                  strokeColor = "#06B6D4";
                  strokeDasharray = "6 3";
                  markerId = "url(#arrowhead-api)";
                  break;
                case "RENDERS":
                  strokeColor = "#A855F7";
                  markerId = "url(#arrowhead-component)";
                  break;
                case "TESTS":
                  strokeColor = "#10B981";
                  strokeDasharray = "4 3";
                  markerId = "url(#arrowhead-test)";
                  break;
                case "EXTENDS":
                case "IMPLEMENTS":
                  strokeColor = "#F59E0B";
                  strokeDasharray = "5 3";
                  markerId = "url(#arrowhead-db)";
                  break;
                case "IMPORTS":
                case "CALLS":
                default:
                  strokeColor = "#818CF8";
                  markerId = "url(#arrowhead-active)";
                  break;
              }
            } else if (hasFocus) {
              strokeColor = "#1E293B";
            } else if (edge.type === "TESTS") {
              strokeDasharray = "4 4";
              strokeColor = "#10B98188";
            }

            const strokeOpacity = hasFocus && !isConnected ? 0.15 : 0.85;

            return (
              <g
                key={`${edge.source}->${edge.target}_${edge.type}_${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEdge?.(edge);
                }}
                className="cursor-pointer group"
              >
                {/* Thick invisible path for easy clicking */}
                <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  strokeDasharray={strokeDasharray}
                  markerEnd={markerId}
                  className="transition-all duration-200"
                />
                {/* Edge Type Label on hover/connected */}
                {isConnected && (
                  <text
                    x={(sourcePos.x + targetPos.x) / 2}
                    y={(sourcePos.y + targetPos.y) / 2 - 6}
                    fill="#a5b4fc"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="pointer-events-none bg-slate-900"
                  >
                    {edge.type}
                  </text>
                )}
              </g>
            );
          })}

          {/* 2. RENDER NODES */}
          {filteredNodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isConnected = connectedNodeIds.has(node.id);
            const hasFocus = Boolean(hoveredNodeId || selectedNodeId);

            // Impact Styling
            const severity = impactSeverityMap.get(node.id);
            const isTarget = severity === "TARGET";
            const isHighImpact = severity === "HIGH";
            const isMediumImpact = severity === "MEDIUM";

            // Opacity: Unrelated nodes fade to 15% when user hovers or selects
            const opacity = hasFocus && !isConnected && !severity ? 0.15 : 1;

            const colors = getNodeColor(node.type);

            const width = 196;
            const height = 66;
            const x = pos.x - width / 2;
            const y = pos.y - height / 2;

            // Border color depending on state
            let borderColor = "rgba(255, 255, 255, 0.12)";
            if (isTarget) borderColor = "#c084fc";
            else if (isHighImpact) borderColor = "#ef4444";
            else if (isMediumImpact) borderColor = "#f59e0b";
            else if (isSelected) borderColor = "#38bdf8";
            else if (isHovered) borderColor = "#818cf8";

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                opacity={opacity}
                onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                onMouseEnter={(e) => {
                  setHoveredNodeId(node.id);
                  setHoverTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => {
                  setHoveredNodeId(null);
                  setHoverTooltipPos(null);
                }}
                className="cursor-pointer transition-opacity duration-200"
              >
                {/* Glow ring on hover/selected or high impact */}
                {(isHovered || isSelected || isHighImpact || isTarget) && (
                  <rect
                    x={-4}
                    y={-4}
                    width={width + 8}
                    height={height + 8}
                    rx={12}
                    fill="none"
                    stroke={borderColor}
                    strokeWidth={isHighImpact || isTarget ? 3 : 2}
                    opacity={0.65}
                    className={isHighImpact || isTarget ? "animate-pulse" : ""}
                  />
                )}

                {/* Node Box (High-density Obsidian) */}
                <rect
                  width={width}
                  height={height}
                  rx={8}
                  fill="#0E1628"
                  stroke={isHovered || isSelected ? colors.stroke : colors.stroke + "38"}
                  strokeWidth={isHovered || isSelected ? 2 : 1}
                  className="shadow-2xl"
                />

                {/* Top Semantic Hairline Indicator */}
                <path
                  d={`M 1 8 A 7 7 0 0 1 8 1 L ${width - 8} 1 A 7 7 0 0 1 ${width - 1} 8`}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth={3}
                />

                {/* Layer Badge */}
                <rect
                  x={width - 58}
                  y={6}
                  width={50}
                  height={15}
                  rx={4}
                  fill="#06090F"
                  stroke={colors.stroke}
                  strokeWidth={0.7}
                  strokeOpacity={0.6}
                />
                <text
                  x={width - 33}
                  y={17}
                  fill={colors.text}
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="uppercase tracking-wider font-mono"
                >
                  {colors.badge}
                </text>

                {/* Dot Type Indicator */}
                <circle
                  cx={16}
                  cy={18}
                  r={3.5}
                  fill={colors.stroke}
                />

                {/* Node Title */}
                <text
                  x={26}
                  y={22}
                  fill="#F8FAFC"
                  fontSize="11.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="truncate"
                >
                  {node.name.length > 15 ? node.name.substring(0, 14) + "…" : node.name}
                </text>

                {/* Subtitle / Path */}
                <text
                  x={12}
                  y={40}
                  fill="#94A3B8"
                  fontSize="9.5"
                  fontFamily="sans-serif"
                >
                  {node.path.length > 24 ? "…" + node.path.substring(node.path.length - 22) : node.path}
                </text>

                {/* Footnote stats pill */}
                <rect
                  x={10}
                  y={48}
                  width={width - 20}
                  height={14}
                  rx={3}
                  fill="#06090F"
                  opacity={0.7}
                />
                <text
                  x={16}
                  y={58}
                  fill="#64748B"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  In: {node.inDegree} · Out: {node.outDegree} · {node.lines}L · {node.exports?.length || 0} exp
                </text>

                {/* Severity Badge for Impact Mode */}
                {severity && (
                  <circle
                    cx={width - 12}
                    cy={height - 12}
                    r={5}
                    fill={
                      severity === "TARGET"
                        ? "#c084fc"
                        : severity === "HIGH"
                        ? "#ef4444"
                        : severity === "MEDIUM"
                        ? "#f59e0b"
                        : "#38bdf8"
                    }
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* 3. HOVER TOOLTIP */}
      {hoveredNode && hoverTooltipPos && (
        <div
          style={{
            left: `${Math.min(window.innerWidth - 280, hoverTooltipPos.x + 16)}px`,
            top: `${Math.min(window.innerHeight - 200, hoverTooltipPos.y + 16)}px`,
          }}
          className="fixed z-50 pointer-events-none p-3 rounded-xl bg-[#0B101B]/95 border border-indigo-500/40 text-white shadow-2xl backdrop-blur-md w-64 space-y-2 animate-in fade-in zoom-in duration-100"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
            <span className="font-mono text-xs font-bold text-indigo-300 truncate">
              {hoveredNode.name}
            </span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              {hoveredNode.type}
            </span>
          </div>

          <p className="text-[10px] text-slate-400 font-mono truncate">{hoveredNode.path}</p>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-300 pt-0.5">
            <div className="bg-[#06090F] p-1.5 rounded border border-white/[0.05]">
              <span className="text-slate-500 block text-[9px]">Direct Deps</span>
              <strong className="text-indigo-400">{hoveredNode.outDegree} out</strong>
            </div>
            <div className="bg-[#06090F] p-1.5 rounded border border-white/[0.05]">
              <span className="text-slate-500 block text-[9px]">Dependents</span>
              <strong className="text-emerald-400">{hoveredNode.inDegree} in</strong>
            </div>
            <div className="bg-[#06090F] p-1.5 rounded border border-white/[0.05]">
              <span className="text-slate-500 block text-[9px]">Lines</span>
              <span className="text-white font-bold">{hoveredNode.lines}L</span>
            </div>
            <div className="bg-[#06090F] p-1.5 rounded border border-white/[0.05]">
              <span className="text-slate-500 block text-[9px]">Symbols</span>
              <span className="text-cyan-400 font-bold">{hoveredNode.exports?.length || 0} exp</span>
            </div>
          </div>

          <div className="text-[9px] text-indigo-400 font-mono flex items-center justify-between pt-0.5">
            <span>Click node to inspect</span>
            <span>→</span>
          </div>
        </div>
      )}

      {/* 4. CANVAS ZOOM CONTROLS (Top Right Minimal Glass Pill) */}
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#0B101B]/85 border border-white/[0.08] p-1 rounded-xl shadow-2xl backdrop-blur-xl z-30">
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset Zoom to 100%"
          className="px-2 py-1 text-[11px] font-mono font-medium rounded-lg hover:bg-white/[0.08] text-slate-300 hover:text-white transition"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3.5 bg-white/[0.1] mx-0.5" />
        <button
          onClick={fitToScreen}
          title="Fit Graph to Screen"
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-indigo-300 transition"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5. MINIMAL FLOATING CONTROL & LEGEND DOCK (Bottom Center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3.5 py-1.5 bg-[#0B101B]/90 border border-white/[0.08] rounded-full shadow-2xl backdrop-blur-xl z-30 text-[11px] font-mono text-slate-300">
        {/* Direction Selector */}
        {onChangeDirection && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">Trace:</span>
            <button
              onClick={() => onChangeDirection("both")}
              className={`px-2 py-0.5 rounded-md transition ${direction === "both" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
            >
              Both
            </button>
            <button
              onClick={() => onChangeDirection("upstream")}
              className={`px-2 py-0.5 rounded-md transition ${direction === "upstream" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
            >
              Deps
            </button>
            <button
              onClick={() => onChangeDirection("downstream")}
              className={`px-2 py-0.5 rounded-md transition ${direction === "downstream" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
            >
              Used By
            </button>
          </div>
        )}

        {/* Separator */}
        {(onChangeDirection && onChangeDepth) && <div className="w-[1px] h-3.5 bg-white/[0.1]" />}

        {/* Depth Selector */}
        {onChangeDepth && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">Depth:</span>
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                onClick={() => onChangeDepth(d)}
                className={`w-5 h-5 flex items-center justify-center rounded-md transition ${depth === d ? "bg-indigo-600/40 text-indigo-300 font-bold border border-indigo-500/40" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Separator */}
        <div className="w-[1px] h-3.5 bg-white/[0.1] hidden sm:block" />

        {/* Semantic Layer Legend Dots */}
        <div className="hidden sm:flex items-center gap-2.5 text-[10px]">
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" /> API
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)]" /> Svc
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" /> Model
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" /> UI
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> Test
          </span>
        </div>
      </div>
    </div>
  );
};
