import React from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import { MindNode } from "../../parser/types";
import { toReactFlow } from "./toReactFlow";

type Props = { tree: MindNode[] };

export default function MindCanvas({ tree }: Props) {
  const { nodes: startNodes, edges: startEdges } = React.useMemo(
    () => toReactFlow(tree),
    [tree],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(startNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(startEdges);

  const onConnect = React.useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes} // ← mark every node as wiki
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        defaultEdgeOptions={{
          type: ConnectionLineType.Bezier,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          style: { strokeWidth: 1.4 },
        }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
