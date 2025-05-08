// ─── src/ui/Canvas/MindCanvas.tsx ──────────────────────────────────
import React from "react";
import ReactFlow, {
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { MindNode } from "../../parser/types";
import { toReactFlow } from "./toReactFlow";

type Props = { tree: MindNode[] };

export default function MindCanvas({ tree }: Props) {
  return (
    <ReactFlowProvider>
      <FlowContent tree={tree} />
    </ReactFlowProvider>
  );
}

function FlowContent({ tree }: { tree: MindNode[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  React.useEffect(() => {
    const { nodes: nextNodes, edges: nextEdges } = toReactFlow(tree);

    /* Merge: keep previous node object if nothing but position changed */
    setNodes((prev) =>
      nextNodes.map((n) => {
        const old = prev.find((p) => p.id === n.id);
        // if label and type unchanged, just copy new position into old object
        if (old && old.data.label === n.data.label && old.type === n.type) {
          old.position = n.position; // mutate in place
          return old;
        }
        return n; // new or changed node
      }),
    );

    /* Edges: they only change when structure changes */
    setEdges((prev) => {
      if (
        prev.length === nextEdges.length &&
        prev.every((e, i) => e.id === nextEdges[i].id)
      )
        return prev; // re-use old array
      return nextEdges;
    });
  }, [tree, setNodes, setEdges]);

  return (
    <div className="mindmap-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(p) => setEdges((eds) => addEdge(p, eds))}
        fitView
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
