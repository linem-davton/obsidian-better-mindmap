/* src/ui/Canvas/MindCanvas.tsx */
import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  OnNodeClick,
  OnNodeDoubleClick,
  Panel,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import { MindNode } from "../../parser/parseOutline.ts";
import { toReactFlow, LayoutDirection } from "./toReactFlow";

const DEFAULT_RANKSEP_MULTIPLIER = 2.5;
const DEFAULT_NODESEP_MULTIPLIER = 0.6;

type Props = {
  tree: MindNode[];
  onLinkClick: (target: string) => void;
  resetViewTrigger?: number;
};

/* Top-level export: provides the zustand context */
export function MindCanvas({ tree, onLinkClick, resetViewTrigger }: Props) {
  return (
    <ReactFlowProvider>
      <FlowContent
        tree={tree}
        onLinkClick={onLinkClick}
        resetViewTrigger={resetViewTrigger}
      />
    </ReactFlowProvider>
  );
}

/* actual graph logic ------------------------------------------------*/
// Handles Node collapse, highlight on select, and Mouse Hover logic
function FlowContent({ tree, onLinkClick, resetViewTrigger }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MindNode>[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>("TB");

  // --- State for UI controls and triggering layout updates ---
  const [ranksepMultiplier, setRanksepMultiplier] = useState<number>(() =>
    getCssVariableOrDefault(
      "--mindmap-ranksep-multiplier",
      DEFAULT_RANKSEP_MULTIPLIER,
    ),
  );
  const [nodesepMultiplier, setNodesepMultiplier] = useState<number>(() =>
    getCssVariableOrDefault(
      "--mindmap-nodesep-multiplier",
      DEFAULT_NODESEP_MULTIPLIER,
    ),
  );
  const [layoutConfigTrigger, setLayoutConfigTrigger] = useState<number>(0); // Trigger state
  const reactFlowInstance = useReactFlow(); // Get instance for fitView

  // Toggle collapse on double-click
  const handleNodeDoubleClick: OnNodeDoubleClick = useCallback((_, node) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }, []);

  // Set selection on click
  const handleNodeClick: OnNodeClick = useCallback((_, node) => {
    setSelectedId(node.id);
  }, []);

  // --- Reset View Logic ---
  useEffect(() => {
    // Only run if the trigger prop is a number and > 0 (avoid initial mount)
    if (typeof resetViewTrigger === "number" && resetViewTrigger > 0) {
      setCollapsed(new Set());
      setSelectedId(null);
    }
  }, [resetViewTrigger, setCollapsed, setSelectedId]);

  useEffect(() => {
    // 1. prune outline based on collapsed
    const prune = (list: MindNode[]): MindNode[] =>
      list.map((n) =>
        collapsed.has(n.id)
          ? { ...n, children: [] }
          : { ...n, children: prune(n.children) },
      );
    const pruned = prune(tree);

    // 2. compute new layout
    const { nodes: nextNodes, edges: nextEdges } = toReactFlow(
      pruned,
      onLinkClick,
      layoutDirection,
    );

    // 3. build local child map from nextEdges for descendants
    const childMap: Record<string, string[]> = {};
    nextEdges.forEach((e) => {
      childMap[e.source] = childMap[e.source]
        ? [...childMap[e.source], e.target]
        : [e.target];
    });
    // Highlight all Childnoes and edges
    const descendants = new Set<string>();
    const edgeIdsToHighlight = new Set<string>();
    if (selectedId) {
      const stack = [selectedId];
      while (stack.length) {
        const curr = stack.pop()!;
        for (const child of childMap[curr] || []) {
          if (!descendants.has(child)) {
            descendants.add(child);
            stack.push(child);
            edgeIdsToHighlight.add(`${curr}-${child}`);
          }
        }
      }
    }

    // 4. merge nodes, tag classes
    setNodes((prev) => {
      const map = new Map(nextNodes.map((n) => [n.id, n]));
      const out: typeof nextNodes = [];
      prev.forEach((old) => {
        const fresh = map.get(old.id);
        if (!fresh) return;
        map.delete(old.id);
        if (old.data.label !== fresh.data.label) {
          old.data = { ...old.data, label: fresh.data.label };
        }
        old.position = fresh.position;
        out.push(old);
      });
      out.push(...map.values());
      return out.map((n) => {
        const classes: string[] = [];
        if (collapsed.has(n.id)) classes.push("collapsed-node");
        if (n.id === selectedId) classes.push("selected-node");
        else if (descendants.has(n.id)) classes.push("selected-child");
        return { ...n, className: classes.join(" ") || undefined };
      });
    });

    setEdges(
      nextEdges.map((e) => ({
        ...e,
        className: edgeIdsToHighlight.has(e.id) ? "selected-edge" : undefined,
      })),
    );
    setTimeout(() => {
      reactFlowInstance.fitView({ duration: 400, padding: 0.1 }); // Adjust duration/padding
    }, 100); // Adjust timeout if needed (50-100ms is usually good)
  }, [
    tree,
    collapsed,
    selectedId,
    onLinkClick,
    layoutDirection,
    layoutConfigTrigger,
    setNodes,
    setEdges,
  ]);

  const handleNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setEdges((es) =>
        es.map((e) =>
          e.source === node.id || e.target === node.id
            ? {
                ...e,
                style: {
                  ...e.style,
                  stroke: "var(--interactive-accent)",
                  strokeWidth: 2,
                },
              }
            : e,
        ),
      );
    },
    [setEdges],
  );

  const handleNodeMouseLeave = useCallback(() => {
    setEdges((es) =>
      es.map((e) => ({
        ...e,
        style: {}, // clear the override
      })),
    );
  }, [setEdges]);

  // --- Toggle Layout Handler ---
  const handleLayoutToggle = useCallback(() => {
    setLayoutDirection((currentDirection) =>
      currentDirection === "TB" ? "LR" : "TB",
    );
  }, []);

  const toggleButtonText =
    layoutDirection === "TB" ? "Horizontal Layout" : "Vertical Layout";

  // --- Handlers for UI controls ---
  const handleRanksepChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    if (!isNaN(newValue)) {
      setRanksepMultiplier(newValue); // Update local state for slider display
      document.documentElement.style.setProperty(
        "--mindmap-ranksep-multiplier",
        String(newValue),
      ); // Update CSS var
      setLayoutConfigTrigger((prev) => prev + 1); // Trigger recalculation
    }
  };

  const handleNodesepChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    if (!isNaN(newValue)) {
      setNodesepMultiplier(newValue); // Update local state for slider display
      document.documentElement.style.setProperty(
        "--mindmap-nodesep-multiplier",
        String(newValue),
      ); // Update CSS var
      setLayoutConfigTrigger((prev) => prev + 1); // Trigger recalculation
    }
  };

  return (
    <div className="mindmap-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onConnect={(p) => setEdges((eds) => addEdge(p, eds))}
        fitView
      >
        <Background />
        <Panel position="top-left" className="mindmap-controls-panel">
          <div className="control-group">
            <button
              onClick={handleLayoutToggle}
              title={toggleButtonText} // Add tooltip
            >
              {toggleButtonText}
            </button>
          </div>

          <div className="control-group">
            <label htmlFor="ranksep-slider">
              Rank Sep (
              {(typeof ranksepMultiplier === "number"
                ? ranksepMultiplier
                : DEFAULT_RANKSEP_MULTIPLIER
              ).toFixed(1)}
              )
            </label>
            <input
              id="ranksep-slider"
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={
                typeof ranksepMultiplier === "number"
                  ? ranksepMultiplier
                  : DEFAULT_RANKSEP_MULTIPLIER
              }
              onChange={handleRanksepChange}
              title={`Rank Separation Multiplier (Default: ${DEFAULT_RANKSEP_MULTIPLIER})`}
            />
          </div>
          <div className="control-group">
            <label htmlFor="nodesep-slider">
              {/* --- Add Check Here --- */}
              Node Sep (
              {(typeof nodesepMultiplier === "number"
                ? nodesepMultiplier
                : DEFAULT_NODESEP_MULTIPLIER
              ).toFixed(1)}
              )
            </label>
            <input
              id="nodesep-slider"
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              // Ensure value passed is stringifiable
              value={
                typeof nodesepMultiplier === "number"
                  ? nodesepMultiplier
                  : DEFAULT_NODESEP_MULTIPLIER
              }
              onChange={handleNodesepChange}
              title={`Node Separation Multiplier (Default: ${DEFAULT_NODESEP_MULTIPLIER})`}
            />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function getCssVariableOrDefault(
  cssVar: string,
  def: number,
): {
  value: number;
} {
  const style = getComputedStyle(document.documentElement);
  const value = style.getPropertyValue(cssVar).trim();

  const width = parseFloat(value);

  return {
    width: isNaN(width) ? def : width,
  };
}
