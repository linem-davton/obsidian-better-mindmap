import { hierarchy, tree as d3tree } from "d3-hierarchy";
import { Node, Edge } from "reactflow";
import { MindNode } from "../../parser/types";

/* GAP_X = horizontal column distance (depth); GAP_Y = row distance */
const GAP_X = 220;
const GAP_Y = 80;

/** Markmap‑style layout: constant sibling gap, sub‑trees spaced automatically */
export function toReactFlow(arr: MindNode[]) {
  const fake: MindNode = { id: "_root", text: "", level: 0, children: arr };

  const root = hierarchy<MindNode>(fake, (d) => d.children);

  /* Default d3 separation: siblings = 1, cousins = 2 units */
  const layout = d3tree<MindNode>()
    .nodeSize([GAP_Y, GAP_X]) // d3.tree uses [y,x] ordering
    .separation(() => 1); // tidy constant gap

  layout(root);

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  root.descendants().forEach((d) => {
    if (d.data.id === "_root") return; // skip virtual root

    nodes.push({
      id: d.data.id,
      type: "default",
      data: { label: d.data.text },
      position: { x: d.y, y: d.x }, // flip back to x,y
    });

    if (d.parent && d.parent.data.id !== "_root") {
      edges.push({
        id: `${d.parent.data.id}-${d.data.id}`,
        source: d.parent.data.id,
        target: d.data.id,
        type: "default",
      });
    }
  });

  return { nodes, edges };
}
