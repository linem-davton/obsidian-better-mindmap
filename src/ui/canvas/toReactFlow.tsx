// src/ui/Canvas/toReactFlow.tsx
import dagre from "dagre";
import { MindNode } from "../../parser/types";
import { Node, Edge } from "reactflow";
import { App, MarkdownRenderer, Component, Menu } from "obsidian";
import { useEffect, useRef } from "react";

import "katex/dist/katex.min.css";

export type LayoutDirection = "TB" | "LR";

// This is the new wrapper component for Obsidian's MarkdownRenderer.
const ObsidianMarkdownRenderer = ({
  app,
  markdown,
  sourcePath = "",
}: {
  app: App;
  markdown: string;
  sourcePath?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.empty(); // Clear previous content
      // Create a new Obsidian Component to manage the lifecycle of the rendered markdown.
      // This is crucial for preventing memory leaks.
      const component = new Component();
      // Use Obsidian's native renderer. It will automatically handle
      MarkdownRenderer.render(app, markdown, container, sourcePath, component);
      // --- ADDED LINK HANDLING LOGIC ---
      const links = container.querySelectorAll("a.internal-link");
      links.forEach((link) => {
        const anchor = link as HTMLAnchorElement;
        // Obsidian stores the link target in the 'data-href' attribute
        const href = anchor.dataset.href;
        if (href) {
          anchor.addEventListener("click", (e) => {
            e.preventDefault(); // Prevent default navigation
            // Use the workspace API to open the link in a new tab/leaf
            app.workspace.openLinkText(href, sourcePath);
          });
        }
        component.registerDomEvent(anchor, "contextmenu", (e: MouseEvent) => {
          if (href) {
            const menu = new Menu();

            menu.addItem((item) =>
              item
                .setTitle("Open in new tab")
                .setIcon("file-plus")
                .onClick(() => {
                  app.workspace.openLinkText(href, sourcePath, true);
                }),
            );

            menu.addItem((item) =>
              item
                .setTitle("Open to the right")
                .setIcon("separator-vertical")
                .onClick(() => {
                  app.workspace.openLinkText(href, sourcePath, "split");
                }),
            );

            menu.showAtMouseEvent(e);
          }
        });
      });
      // Cleam up everything created by MarkdownRenderer
      return () => {
        component.unload();
      };
    }
  }, [app, markdown, sourcePath]); // Re-run effect if props change

  return <div ref={containerRef} />;
};

export function toReactFlow(
  app: App,
  sourcePath: string,
  children: MindNode[],
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
    nodes.push({
      id,
      position: { x, y },
      data: {
        label: (
          <ObsidianMarkdownRenderer
            app={app}
            markdown={label}
            sourcePath={sourcePath}
          />
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
