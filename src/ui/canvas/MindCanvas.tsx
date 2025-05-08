// ─── src/ui/Canvas/MindCanvas.tsx ──────────────────────────────────
import React from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { MindNode } from "../../parser/types";
import { toReactFlow } from "./toReactFlow";

type Props = { tree: MindNode[]; onLinkClick: (target: string) => void };

/* top-level export: provides the zustand context */
export default function MindCanvas({ tree, onLinkClick }: Props) {
  return (
    <ReactFlowProvider>
      <FlowContent tree={tree} onLinkClick={onLinkClick} />
    </ReactFlowProvider>
  );
}

/* actual graph logic ------------------------------------------------*/
function FlowContent({ tree, onLinkClick }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  React.useEffect(() => {
    const { nodes: nextNodes, edges: nextEdges } = toReactFlow(
      tree,
      onLinkClick,
    );

    setNodes((prev) => {
      const map = new Map(nextNodes.map((n) => [n.id, n]));
      const out: typeof nextNodes = [];

      prev.forEach((old) => {
        const fresh = map.get(old.id);
        if (!fresh) return; // node removed
        map.delete(old.id);

        if (old.data.label !== fresh.data.label) {
          old.data = { ...old.data, label: fresh.data.label }; // update label
        }
        old.position = fresh.position; // update position
        out.push(old);
      });

      out.push(...map.values()); // add truly new nodes
      return out; // new array ref => ReactFlow re-renders
    });

    setEdges(nextEdges); // replace edges array
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
