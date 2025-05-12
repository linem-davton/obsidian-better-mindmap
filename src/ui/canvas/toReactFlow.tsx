// src/ui/Canvas/toReactFlow.tsx
import React from "react";
import dagre from "dagre";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import { MindNode } from "../../parser/parseOutline.ts";
import { Node, Edge } from "reactflow";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import "katex/dist/katex.min.css";

export type LayoutDirection = "TB" | "LR";

export function toReactFlow(
  children: MindNode[],
  onLinkClick: (target: string) => void,
  layoutDirection: LayoutDirection = "TB",
) {
  const { width: WIDTH, height: HEIGHT } = getReactFlowNodeSizeFromCSS();
  const style = getComputedStyle(document.documentElement);

  const ranksepMultiplier =
    parseFloat(style.getPropertyValue("--mindmap-ranksep-multiplier")) || 2.5;
  const nodesepMultiplier =
    parseFloat(style.getPropertyValue("--mindmap-nodesep-multiplier")) || 0.6;

  const RANKSEP = HEIGHT * ranksepMultiplier;
  const NODESEP = WIDTH * nodesepMultiplier;

  /* 1 ─ build a dagre graph */
  const g = new dagre.graphlib.Graph().setGraph({
    rankdir: layoutDirection, // Layout direction
    ranksep: RANKSEP, // vertical gap
    nodesep: NODESEP, // horizontal gap
  });

  g.setDefaultNodeLabel(() => ({}));
  g.setDefaultEdgeLabel(() => ({}));

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  /* helper to walk the MindNode tree */
  const walk = (n: MindNode, parent?: MindNode) => {
    g.setNode(n.id, { width: WIDTH, height: HEIGHT, label: n.text });

    if (parent) g.setEdge(parent.id, n.id);

    n.children.forEach((c) => walk(c, n));
  };

  /* root wrapper so top-level array works */
  const fakeRoot: MindNode = { id: "_root", text: "", level: 0, children };
  fakeRoot.children.forEach((c) => walk(c, fakeRoot));

  /* 2 ─ compute layout */
  dagre.layout(g);

  /* 3 ─ convert dagre graph → ReactFlow data */
  g.nodes().forEach((id) => {
    if (id === "_root") return; // skip fake root
    const { x, y, label } = g.node(id);
    const md = wikiToMd(label);
    nodes.push({
      id,
      position: { x, y },
      data: {
        label: (
          <ReactMarkdown
            remarkPlugins={[gfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              a: ({ href, children }) => (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onLinkClick(href!);
                  }}
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                >
                  {children}
                </a>
              ),
            }}
          >
            {md}
          </ReactMarkdown>
        ),
      },
    });
  });

  g.edges().forEach(({ v, w }) => {
    if (v === "_root") return; // edges from fake root ignored
    edges.push({ id: `${v}-${w}`, source: v, target: w });
  });

  return { nodes, edges };
}

/**
 * Convert Obsidian-style [[Link|Alias]] into Markdown [Alias](Link),
 * URI-encoding the target so spaces/specials don’t break link syntax.
 */
function wikiToMd(raw: string): string {
  return raw.replace(
    /\[\[([^\|\]]+?)(?:\|([^\]]+?))?\]\]/g,
    (_match, target, alias) => {
      const label = alias || target;
      // encode spaces/special chars so Markdown sees a valid link
      const href = encodeURI(target.trim());
      return `[${label}](${href})`;
    },
  );
}

export function getReactFlowNodeSizeFromCSS(): {
  width: number;
  height: number;
} {
  const style = getComputedStyle(document.documentElement);
  const widthStr = style.getPropertyValue("--mindmap-node-width").trim();
  const heightStr = style.getPropertyValue("--mindmap-node-height").trim();

  const width = parseFloat(widthStr);
  const height = parseFloat(heightStr);

  return {
    width: isNaN(width) ? 240 : width,
    height: isNaN(height) ? 48 : height,
  };
}
